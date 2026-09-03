"use client";

import { useEffect, useState, useRef } from "react";
import { isSeeded, getTransactions, getCategories, getAccounts, putTransaction, putRule, deleteTransaction, putTransactionsBulk } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import type { Transaction, Category, Account } from "@/lib/db";
import { fmtFull } from "@/lib/queries";
import { parseCSV, applyRules } from "@/lib/csv";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternFromDescription(desc: string): string {
  // Strip trailing numbers/amounts, keep meaningful words
  const words = desc.trim().split(/\s+/).slice(0, 3);
  return `(?i)${words.map(escapeRegex).join(".*")}`;
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterAcc, setFilterAcc] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense" | "uncategorised">("all");
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [saveAsRule, setSaveAsRule] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadAccId, setUploadAccId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const seeded = await isSeeded();
    if (!seeded) await seedDatabase();
    const [t, c, a] = await Promise.all([getTransactions(), getCategories(), getAccounts()]);
    setTxs(t);
    setCats(c);
    setAccounts(a);
  };

  useEffect(() => { load(); }, []);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setActivePicker(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function assignCategory(tx: Transaction, catId: string) {
    const updated = { ...tx, category_id: catId };
    await putTransaction(updated);
    if (saveAsRule && catId) {
      const rules = await import("@/lib/db").then((m) => m.getRules());
      await putRule({
        id: `rule-${Date.now()}`,
        pattern: patternFromDescription(tx.description),
        category_id: catId,
        priority: rules.length + 10,
        created_at: new Date().toISOString(),
      });
      showToast(`Category saved and rule created for "${tx.description.split(" ").slice(0, 2).join(" ")}"`);
    } else {
      showToast("Category saved");
    }
    setSaveAsRule(false);
    setActivePicker(null);
    await load();
  }

  async function handleUpload(file: File) {
    if (!uploadAccId) return;
    setUploading(true);
    const content = await file.text();
    const existingIds = new Set(txs.map((t) => t.id));
    const parsed = parseCSV(content, uploadAccId, existingIds);
    const categorised = await applyRules(parsed);
    await putTransactionsBulk(categorised);
    setUploading(false);
    setShowUpload(false);
    showToast(`${categorised.length} transactions imported (${categorised.filter((t) => t.category_id).length} auto-categorised)`);
    await load();
  }

  const uploadAccounts = accounts.filter((a) => ["checking", "savings", "credit"].includes(a.type));

  const catMap = Object.fromEntries(cats.map((c) => [c.id, c]));
  const accMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const uncategorisedCount = txs.filter((t) => !t.category_id).length;

  const filtered = txs.filter((tx) => {
    if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAcc !== "all" && tx.account_id !== filterAcc) return false;
    if (filterCat !== "all" && tx.category_id !== filterCat) return false;
    if (filterType === "income" && tx.amount <= 0) return false;
    if (filterType === "expense" && tx.amount >= 0) return false;
    if (filterType === "uncategorised" && tx.category_id) return false;
    return true;
  });

  const inputStyle: React.CSSProperties = {
    background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 8,
    padding: "8px 12px", fontSize: 13, color: "var(--mid)", outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--mid)", letterSpacing: "-.03em" }}>Transactions</h1>
          <p style={{ fontSize: 13, color: "var(--steel)", marginTop: 2 }}>{txs.length} transactions · {uncategorisedCount} uncategorised</p>
        </div>
        <button
          onClick={() => { setShowUpload(true); setUploadAccId(uploadAccounts[0]?.id ?? ""); }}
          style={{ background: "var(--navy)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
        >
          ↑ Upload CSV
        </button>
      </div>

      {/* Uncategorised banner */}
      {uncategorisedCount > 0 && (
        <div
          onClick={() => setFilterType("uncategorised")}
          style={{ background: "var(--gold-l)", border: "1px solid rgba(184,135,42,.3)", borderRadius: 10, padding: "12px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(184,135,42,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⚠</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{uncategorisedCount} transaction{uncategorisedCount !== 1 ? "s" : ""} need a category</div>
            <div style={{ fontSize: 11, color: "var(--slate)", marginTop: 1 }}>Click to review — assign categories and optionally save as rules for future imports</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>Review →</div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, minWidth: 220, flex: 1 }}
          placeholder="Search transactions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={inputStyle} value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)}>
          <option value="all">All types</option>
          <option value="income">Income only</option>
          <option value="expense">Expenses only</option>
          <option value="uncategorised">Uncategorised</option>
        </select>
        <select style={inputStyle} value={filterAcc} onChange={(e) => setFilterAcc(e.target.value)}>
          <option value="all">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select style={inputStyle} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="all">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(search || filterType !== "all" || filterAcc !== "all" || filterCat !== "all") && (
          <button
            onClick={() => { setSearch(""); setFilterType("all"); setFilterAcc("all"); setFilterCat("all"); }}
            style={{ ...inputStyle, color: "var(--cr)", fontWeight: 700, cursor: "pointer", background: "var(--cr-l)", border: "1px solid rgba(166,52,70,.2)" }}
          >
            Clear
          </button>
        )}
        <div style={{ fontSize: 12, color: "var(--steel)", marginLeft: "auto" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, boxShadow: "var(--sh)", overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 130px 120px 110px 36px", gap: 0, padding: "10px 20px", borderBottom: "2px solid var(--bd)", background: "var(--bg)" }}>
          {["Date", "Description", "Account", "Category", "Amount", ""].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--steel)", fontSize: 13 }}>No transactions match your filters</div>
        ) : (
          filtered.map((tx, i) => {
            const cat = tx.category_id ? catMap[tx.category_id] : null;
            const acc = accMap[tx.account_id];
            const isUncategorised = !tx.category_id;
            const isPickerOpen = activePicker === tx.id;

            return (
              <div
                key={tx.id}
                style={{
                  display: "grid", gridTemplateColumns: "90px 1fr 130px 120px 110px 36px", gap: 0,
                  padding: "12px 20px", borderBottom: i < filtered.length - 1 ? "1px solid var(--bd)" : "none",
                  background: isUncategorised ? "rgba(184,135,42,.04)" : "transparent",
                  alignItems: "center", position: "relative",
                }}
              >
                {/* Date */}
                <div style={{ fontSize: 11, color: "var(--steel)", fontWeight: 500 }}>{tx.date}</div>

                {/* Description */}
                <div style={{ paddingRight: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mid)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 280 }}>{tx.description}</div>
                  <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>{tx.source === "csv" ? "Imported" : "Manual"}</div>
                </div>

                {/* Account */}
                <div style={{ fontSize: 11, color: "var(--slate)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{acc?.name ?? tx.account_id}</div>

                {/* Category chip — clickable */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => { setActivePicker(isPickerOpen ? null : tx.id); setSaveAsRule(false); }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none",
                      background: isUncategorised ? "rgba(184,135,42,.15)" : `${cat?.colour || "#8fa1b8"}18`,
                      color: isUncategorised ? "var(--gold)" : (cat?.colour || "var(--slate)"),
                    }}
                  >
                    {isUncategorised ? "? Uncategorised" : cat?.name}
                    <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
                  </button>

                  {/* Category picker dropdown */}
                  {isPickerOpen && (
                    <div
                      ref={pickerRef}
                      style={{
                        position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
                        background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 10,
                        boxShadow: "var(--sh-md)", width: 230, overflow: "hidden",
                      }}
                    >
                      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--bd)", fontSize: 10, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: ".07em" }}>
                        Assign category
                      </div>
                      <div style={{ maxHeight: 200, overflowY: "auto" }}>
                        {cats.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => assignCategory(tx, c.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 8, width: "100%",
                              padding: "8px 12px", border: "none", background: tx.category_id === c.id ? `${c.colour}12` : "transparent",
                              cursor: "pointer", fontSize: 12, color: "var(--mid)", fontWeight: tx.category_id === c.id ? 700 : 500,
                              textAlign: "left", fontFamily: "inherit",
                            }}
                          >
                            <span style={{ width: 9, height: 9, borderRadius: 2, background: c.colour, flexShrink: 0, display: "inline-block" }} />
                            {c.name}
                            <span style={{ fontSize: 10, color: "var(--steel)", marginLeft: "auto" }}>{c.type}</span>
                          </button>
                        ))}
                      </div>
                      <div style={{ padding: "8px 12px", borderTop: "1px solid var(--bd)", display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          id={`rule-${tx.id}`}
                          checked={saveAsRule}
                          onChange={(e) => setSaveAsRule(e.target.checked)}
                          style={{ accentColor: "var(--navy)", cursor: "pointer" }}
                        />
                        <label htmlFor={`rule-${tx.id}`} style={{ fontSize: 11, color: "var(--slate)", cursor: "pointer", userSelect: "none" }}>
                          Save as rule for future imports
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div style={{ fontSize: 13, fontWeight: 800, color: tx.amount >= 0 ? "var(--gr)" : "var(--mid)", textAlign: "right" }}>
                  {tx.amount >= 0 ? "+" : ""}{fmtFull(tx.amount)}
                </div>

                {/* Delete */}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                  {pendingDelete === tx.id ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={async () => { setPendingDelete(null); await deleteTransaction(tx.id); await load(); showToast("Transaction deleted"); }}
                        style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--cr)", border: "none", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setPendingDelete(null)}
                        style={{ fontSize: 10, fontWeight: 700, color: "var(--slate)", background: "var(--bd)", border: "none", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPendingDelete(tx.id)}
                      style={{ fontSize: 14, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--mid)", color: "#fff", borderRadius: 8, padding: "10px 20px",
          fontSize: 13, fontWeight: 600, boxShadow: "var(--sh-md)", zIndex: 200,
          animation: "fadeIn .2s ease",
        }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>

      {/* Upload CSV modal */}
      {showUpload && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(8,30,56,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "var(--s1)", borderRadius: 14, padding: 28, width: 440, boxShadow: "var(--sh-md)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--mid)", marginBottom: 6 }}>Import CSV</div>
            <div style={{ fontSize: 12, color: "var(--steel)", marginBottom: 20 }}>Supported banks: CommBank, NAB, Westpac, ANZ, ING</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--slate)", display: "block", marginBottom: 6 }}>Account</label>
              <select
                value={uploadAccId}
                onChange={(e) => setUploadAccId(e.target.value)}
                style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--bd)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--mid)", fontFamily: "inherit", outline: "none" }}
              >
                {uploadAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} — {a.institution}</option>
                ))}
              </select>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: "2px dashed var(--bd)", borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", marginBottom: 20, background: "var(--bg)" }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)" }}>Click to choose a CSV file</div>
              <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 4 }}>or drag and drop</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await handleUpload(file);
                e.target.value = "";
              }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !uploadAccId}
                style={{ flex: 1, background: uploading ? "var(--bd)" : "var(--cr)", color: "#fff", border: "none", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {uploading ? "Importing…" : "Choose file"}
              </button>
              <button
                onClick={() => setShowUpload(false)}
                style={{ flex: 1, background: "var(--bg)", color: "var(--slate)", border: "1px solid var(--bd)", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
