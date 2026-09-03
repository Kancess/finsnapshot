"use client";

import { useEffect, useState } from "react";
import { isSeeded, getCategories, getTransactions, putCategory } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import type { Category, Transaction } from "@/lib/db";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Math.abs(n));

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const end = now.toISOString().split("T")[0];
  return { start, end };
}

interface BudgetRow {
  category: Category;
  spent: number;
  budget: number | null;
  pct: number;
  txCount: number;
}

export default function BudgetPage() {
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    const seeded = await isSeeded();
    if (!seeded) await seedDatabase();
    const [cats, txs] = await Promise.all([getCategories(), getTransactions()]);
    const { start, end } = getCurrentMonthRange();

    const monthTxs = txs.filter((t: Transaction) => t.date >= start && t.date <= end);
    const spendMap: Record<string, { sum: number; count: number }> = {};
    for (const tx of monthTxs) {
      if (tx.amount < 0 && tx.category_id) {
        if (!spendMap[tx.category_id]) spendMap[tx.category_id] = { sum: 0, count: 0 };
        spendMap[tx.category_id].sum += Math.abs(tx.amount);
        spendMap[tx.category_id].count++;
      }
    }

    const expenseCats = cats.filter((c: Category) => c.type === "expense");
    const budgetRows: BudgetRow[] = expenseCats.map((c: Category) => {
      const spent = spendMap[c.id]?.sum ?? 0;
      const budget = c.budget_monthly;
      const pct = budget ? Math.min((spent / budget) * 100, 120) : 0;
      return { category: c, spent, budget, pct, txCount: spendMap[c.id]?.count ?? 0 };
    }).sort((a: BudgetRow, b: BudgetRow) => b.spent - a.spent);

    setRows(budgetRows);
    setTotalSpent(budgetRows.reduce((s, r) => s + r.spent, 0));
    setTotalBudget(budgetRows.reduce((s, r) => s + (r.budget ?? 0), 0));
  };

  useEffect(() => { load(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function saveBudget(cat: Category) {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) { setEditingId(null); return; }
    await putCategory({ ...cat, budget_monthly: val || null });
    setEditingId(null);
    showToast(`Budget for ${cat.name} updated`);
    await load();
  }

  const totalPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 120) : 0;
  const budgetBarColor = (pct: number) => pct >= 100 ? "var(--cr)" : pct >= 80 ? "var(--gold)" : "var(--gr)";

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 880 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--mid)", letterSpacing: "-.03em" }}>Budget</h1>
          <p style={{ fontSize: 13, color: "var(--steel)", marginTop: 2 }}>
            {new Date().toLocaleString("en-AU", { month: "long", year: "numeric" })} · click any budget to edit it
          </p>
        </div>
      </div>

      {/* Month summary card */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "20px 24px", marginBottom: 20, boxShadow: "var(--sh)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: ".06em" }}>Total spent this month</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: totalPct >= 100 ? "var(--cr)" : "var(--mid)", letterSpacing: "-.03em", marginTop: 2 }}>{fmt(totalSpent)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: ".06em" }}>Monthly budget</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--slate)", letterSpacing: "-.03em", marginTop: 2 }}>{fmt(totalBudget)}</div>
          </div>
        </div>
        {/* Master progress bar */}
        <div style={{ background: "var(--bd)", borderRadius: 100, height: 8, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(totalPct, 100)}%`, height: "100%", background: budgetBarColor(totalPct), borderRadius: 100, transition: "width .4s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--steel)" }}>
          <span>{fmt(totalBudget - totalSpent)} remaining</span>
          <span>{Math.round(totalPct)}% of budget used</span>
        </div>
      </div>

      {/* Category rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row) => {
          const isEditing = editingId === row.category.id;
          const color = budgetBarColor(row.pct);
          const isOver = row.budget !== null && row.spent > row.budget;

          return (
            <div
              key={row.category.id}
              style={{ background: "var(--s1)", border: `1px solid ${isOver ? "rgba(166,52,70,.25)" : "var(--bd)"}`, borderRadius: 10, padding: "14px 18px", boxShadow: "var(--sh)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                {/* Colour dot */}
                <div style={{ width: 10, height: 10, borderRadius: 2, background: row.category.colour, flexShrink: 0 }} />

                {/* Name + tx count */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)" }}>{row.category.name}</div>
                  <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 1 }}>{row.txCount} transaction{row.txCount !== 1 ? "s" : ""} this month</div>
                </div>

                {/* Spent / Budget */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: isOver ? "var(--cr)" : "var(--mid)" }}>{fmt(row.spent)}</span>
                  <span style={{ fontSize: 11, color: "var(--steel)" }}>of</span>
                  {isEditing ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); saveBudget(row.category); }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ fontSize: 11, color: "var(--steel)" }}>$</span>
                      <input
                        autoFocus
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveBudget(row.category)}
                        style={{ width: 72, fontSize: 13, fontWeight: 700, border: "1px solid var(--navy)", borderRadius: 6, padding: "2px 6px", color: "var(--mid)", background: "var(--bg)", fontFamily: "inherit", outline: "none" }}
                      />
                    </form>
                  ) : (
                    <button
                      onClick={() => { setEditingId(row.category.id); setEditValue(row.budget?.toFixed(0) ?? ""); }}
                      style={{
                        fontSize: 13, fontWeight: 700, color: row.budget ? "var(--slate)" : "var(--t3)",
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                        borderBottom: "1px dashed var(--bd)", fontFamily: "inherit",
                      }}
                    >
                      {row.budget ? fmt(row.budget) : "Set budget"}
                    </button>
                  )}
                </div>

                {/* Over/under badge */}
                {row.budget !== null && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
                    background: isOver ? "var(--cr-l)" : "var(--gr-l)",
                    color: isOver ? "var(--cr)" : "var(--gr)",
                  }}>
                    {isOver ? `+${fmt(row.spent - row.budget)} over` : `${fmt(row.budget - row.spent)} left`}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ background: "var(--bd)", borderRadius: 100, height: 5, overflow: "hidden" }}>
                <div style={{
                  width: `${row.budget ? Math.min(row.pct, 100) : 0}%`,
                  height: "100%", background: color, borderRadius: 100,
                  transition: "width .4s ease",
                }} />
              </div>
              {row.budget !== null && (
                <div style={{ fontSize: 10, color: "var(--steel)", marginTop: 4, textAlign: "right" }}>
                  {Math.round(row.pct)}%
                </div>
              )}
            </div>
          );
        })}
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
    </div>
  );
}
