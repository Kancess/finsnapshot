import Papa from "papaparse";
import type { Transaction } from "./db";
import { getRules } from "./db";

interface RawRow {
  [key: string]: string;
}

function detectFormat(headers: string[]): "commbank" | "nab" | "westpac" | "anz" | "ing" | "unknown" {
  const h = headers.map((x) => x.toLowerCase().trim());
  if (h.includes("bsb number") || h.some((x) => x.includes("credit amount"))) return "commbank";
  if (h.includes("debit amount") && h.includes("credit amount")) return "nab";
  if (h.includes("transaction type") && h.some((x) => x.includes("debit"))) return "westpac";
  if (h.includes("type") && h.includes("details") && h.includes("particulars")) return "anz";
  if (h.includes("transaction") && h.some((x) => x.includes("credit"))) return "ing";
  return "unknown";
}

function parseAmount(credit: string, debit: string): number {
  const c = parseFloat(credit?.replace(/[^0-9.\-]/g, "") || "0") || 0;
  const d = parseFloat(debit?.replace(/[^0-9.\-]/g, "") || "0") || 0;
  if (c !== 0) return c;
  if (d !== 0) return -Math.abs(d);
  return 0;
}

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];
  const cleaned = raw.trim();
  // DD/MM/YYYY
  const dmY = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, "0")}-${dmY[1].padStart(2, "0")}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  // DD Mon YYYY
  const dMonY = cleaned.match(/^(\d{1,2}) (\w{3}) (\d{4})$/);
  if (dMonY) {
    const months: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
    return `${dMonY[3]}-${months[dMonY[2]] || "01"}-${dMonY[1].padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
}

function rowsToTransactions(rows: RawRow[], format: string, accountId: string, existingIds: Set<string>): Transaction[] {
  const results: Transaction[] = [];
  const now = new Date().toISOString();

  for (const row of rows) {
    let date = "", description = "", amount = 0;

    if (format === "commbank") {
      date = parseDate(row["Date"] ?? row["date"] ?? "");
      description = (row["Description"] ?? row["description"] ?? "").trim();
      const credit = row["Credit"] ?? row["credit"] ?? "";
      const debit = row["Debit"] ?? row["debit"] ?? "";
      amount = parseAmount(credit, debit);
      if (amount === 0) {
        const net = parseFloat((row["Amount"] ?? row["amount"] ?? "0").replace(/[^0-9.\-]/g, ""));
        if (!isNaN(net)) amount = net;
      }
    } else if (format === "nab") {
      date = parseDate(row["Date"] ?? "");
      description = `${row["Payee"] ?? ""} ${row["Description"] ?? ""}`.trim();
      amount = parseAmount(row["Credit Amount"] ?? "", row["Debit Amount"] ?? "");
    } else if (format === "westpac") {
      date = parseDate(row["Date"] ?? "");
      description = (row["Description"] ?? "").trim();
      amount = parseAmount(row["Credit"] ?? "", row["Debit"] ?? "");
    } else if (format === "anz") {
      date = parseDate(row["Date"] ?? "");
      description = `${row["Details"] ?? ""} ${row["Particulars"] ?? ""}`.trim();
      amount = parseFloat((row["Amount"] ?? "0").replace(/[^0-9.\-]/g, "")) || 0;
    } else {
      // Generic: look for common column names
      date = parseDate(row["Date"] ?? row["date"] ?? row["Transaction Date"] ?? "");
      description = (row["Description"] ?? row["Memo"] ?? row["Narrative"] ?? row["Transaction"] ?? "").trim();
      const net = parseFloat((row["Amount"] ?? row["amount"] ?? "0").replace(/[^0-9.\-]/g, ""));
      amount = isNaN(net) ? parseAmount(row["Credit"] ?? "", row["Debit"] ?? "") : net;
    }

    if (!date || amount === 0 || !description) continue;

    const id = `csv-${accountId}-${date}-${Math.abs(amount).toFixed(2)}-${description.substring(0, 10)}`.replace(/\s+/g, "-");
    if (existingIds.has(id)) continue;

    results.push({ id, account_id: accountId, date, description, amount, category_id: null, source: "csv", created_at: now });
    existingIds.add(id);
  }
  return results;
}

export async function applyRules(transactions: Transaction[]): Promise<Transaction[]> {
  const rules = await getRules();
  return transactions.map((tx) => {
    if (tx.category_id) return tx;
    for (const rule of rules) {
      try {
        const flags = rule.pattern.startsWith("(?i)") ? "i" : "";
        const pattern = rule.pattern.replace(/^\(\?i\)/, "");
        const re = new RegExp(pattern, flags);
        if (re.test(tx.description)) {
          return { ...tx, category_id: rule.category_id };
        }
      } catch {
        // invalid regex — skip
      }
    }
    return tx;
  });
}

export function parseCSV(content: string, accountId: string, existingIds: Set<string>): Transaction[] {
  const result = Papa.parse<RawRow>(content, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
  if (!result.data.length) return [];
  const headers = Object.keys(result.data[0]);
  const format = detectFormat(headers);
  return rowsToTransactions(result.data, format, accountId, existingIds);
}
