"use client";

import { useEffect, useState, useRef } from "react";
import { isSeeded, getAccounts, putAccount, deleteAccount, getTransactions, putTransactionsBulk } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import type { Account } from "@/lib/db";
import { parseCSV, applyRules } from "@/lib/csv";
import { queryNetWorth } from "@/lib/queries";

const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

const TYPE_LABELS: Record<string, string> = {
  checking: "Checking", savings: "Savings", credit: "Credit Card",
  loan: "Loan", investment: "Investment", super: "Super", property: "Property",
};

const TYPE_COLOURS: Record<string, string> = {
  checking: "#103766", savings: "#1e8a56", credit: "#a63446",
  loan: "#8fa1b8", investment: "#b8872a", super: "#4b607d", property: "#c47a2a",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorth, setNetWorth] = useState({ assets: 0, liabilities: 0, net_worth: 0 });
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: "", type: "checking" as Account["type"], institution: "", manual_balance: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const seeded = await isSeeded();
    if (!seeded) await seedDatabase();
    const [accs, nw] = await Promise.all([getAccounts(), queryNetWorth()]);
    setAccounts(accs.sort((a, b) => b.manual_balance - a.manual_balance));
    setNetWorth(nw);
  };

  useEffect(() => { load(); }, []);

  async function handleUpload(accountId: string, file: File) {
    setUploading(accountId);
    setUploadMsg(null);
    const content = await file.text();
    const existingTxs = await getTransactions();
    const existingIds = new Set(existingTxs.map((t) => t.id));
    const parsed = parseCSV(content, accountId, existingIds);
    const categorised = await applyRules(parsed);
    await putTransactionsBulk(categorised);
    setUploading(null);
    setUploadMsg({ id: accountId, msg: `${categorised.length} transactions imported (${categorised.filter(t => t.category_id).length} auto-categorised)`, ok: true });
    setTimeout(() => setUploadMsg(null), 4000);
  }

  async function addAccount() {
    if (!newAcc.name || !newAcc.institution) return;
    const acc: Account = {
      id: `acc-${Date.now()}`,
      name: newAcc.name,
      type: newAcc.type,
      institution: newAcc.institution,
      manual_balance: parseFloat(newAcc.manual_balance) || 0,
      currency: "AUD",
      created_at: new Date().toISOString(),
    };
    await putAccount(acc);
    setShowAdd(false);
    setNewAcc({ name: "", type: "checking", institution: "", manual_balance: "" });
    load();
  }

  const inputStyle = { background: "var(--bg)", border: "1px solid var(--bd)", borderRadius: 7, padding: "8px 12px", fontSize: 13, color: "var(--mid)", width: "100%" };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--mid)", letterSpacing: "-.03em" }}>Accounts</h1>
          <p style={{ fontSize: 13, color: "var(--steel)", marginTop: 2 }}>{accounts.length} accounts · Net worth {fmtFull(netWorth.net_worth)}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ background: "var(--cr)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          + Add account
        </button>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Assets", value: fmtFull(netWorth.assets), color: "var(--gr)" },
          { label: "Total Liabilities", value: fmtFull(netWorth.liabilities), color: "var(--cr)" },
          { label: "Net Worth", value: fmtFull(netWorth.net_worth), color: "var(--navy)" },
        ].map((t) => (
          <div key={t.label} style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 10, padding: "16px 18px", boxShadow: "var(--sh)" }}>
            <div style={{ fontSize: 11, color: "var(--steel)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{t.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.color, letterSpacing: "-.02em" }}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* Accounts list */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 10, boxShadow: "var(--sh)", overflow: "hidden" }}>
        {accounts.map((acc, i) => (
          <div key={acc.id} style={{ padding: "16px 20px", borderBottom: i < accounts.length - 1 ? "1px solid var(--bd)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Icon */}
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${TYPE_COLOURS[acc.type]}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: TYPE_COLOURS[acc.type], fontWeight: 700, flexShrink: 0 }}>
                {acc.type === "checking" ? "✦" : acc.type === "savings" ? "◈" : acc.type === "credit" ? "◎" : acc.type === "loan" ? "⊖" : acc.type === "investment" ? "◐" : acc.type === "super" ? "◑" : "⌂"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--mid)" }}>{acc.name}</div>
                <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 1 }}>
                  <span style={{ background: `${TYPE_COLOURS[acc.type]}15`, color: TYPE_COLOURS[acc.type], padding: "1px 7px", borderRadius: 100, fontSize: 10, fontWeight: 700, marginRight: 6 }}>{TYPE_LABELS[acc.type]}</span>
                  {acc.institution}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: acc.manual_balance >= 0 ? "var(--mid)" : "var(--cr)" }}>{fmtFull(acc.manual_balance)}</div>
                {/* CSV upload for transaction accounts */}
                {["checking", "savings", "credit"].includes(acc.type) && (
                  <div style={{ marginTop: 4 }}>
                    <button
                      onClick={() => { (fileRef.current as HTMLInputElement & { dataset: { accid: string } }).dataset.accid = acc.id; fileRef.current?.click(); }}
                      disabled={uploading === acc.id}
                      style={{ fontSize: 10, color: "var(--navy)", background: "#e8f0f8", border: "none", borderRadius: 100, padding: "3px 10px", fontWeight: 700, cursor: "pointer" }}
                    >
                      {uploading === acc.id ? "Importing…" : "↑ Upload CSV"}
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={async () => { await deleteAccount(acc.id); load(); }}
                style={{ fontSize: 14, color: "var(--steel)", background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                ×
              </button>
            </div>
            {uploadMsg?.id === acc.id && (
              <div style={{ marginTop: 8, fontSize: 11, padding: "6px 10px", borderRadius: 6, background: uploadMsg.ok ? "var(--gr-l)" : "var(--cr-l)", color: uploadMsg.ok ? "var(--gr)" : "var(--cr)", fontWeight: 600 }}>
                {uploadMsg.msg}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.ofx"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const accId = (e.target as HTMLInputElement & { dataset: { accid: string } }).dataset.accid;
          if (file && accId) await handleUpload(accId, file);
          e.target.value = "";
        }}
      />

      {/* Add account modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(8,30,56,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "var(--s1)", borderRadius: 12, padding: 28, width: 420, boxShadow: "var(--sh-md)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--mid)", marginBottom: 20 }}>Add account</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--slate)", display: "block", marginBottom: 4 }}>Account name</label>
                <input style={inputStyle} value={newAcc.name} onChange={(e) => setNewAcc((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. CommBank Everyday" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--slate)", display: "block", marginBottom: 4 }}>Type</label>
                <select style={inputStyle} value={newAcc.type} onChange={(e) => setNewAcc((p) => ({ ...p, type: e.target.value as Account["type"] }))}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--slate)", display: "block", marginBottom: 4 }}>Institution</label>
                <input style={inputStyle} value={newAcc.institution} onChange={(e) => setNewAcc((p) => ({ ...p, institution: e.target.value }))} placeholder="e.g. Commonwealth Bank" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--slate)", display: "block", marginBottom: 4 }}>Current balance (AUD)</label>
                <input style={inputStyle} type="number" value={newAcc.manual_balance} onChange={(e) => setNewAcc((p) => ({ ...p, manual_balance: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={addAccount} style={{ flex: 1, background: "var(--cr)", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add account</button>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "var(--bg)", color: "var(--slate)", border: "1px solid var(--bd)", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
