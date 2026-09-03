"use client";

import { useEffect, useState } from "react";
import { getGoals, getAccounts, putGoal, deleteGoal } from "@/lib/db";
import type { Goal, Account } from "@/lib/db";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date("2026-09-03");
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function timeLabel(days: number): string {
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days < 30) return `${days}d away`;
  if (days < 365) return `${Math.round(days / 30)}mo away`;
  return `${(days / 365).toFixed(1)}yr away`;
}

function expectedProgress(createdAt: string, targetDate: string): number {
  const start = new Date(createdAt).getTime();
  const end = new Date(targetDate).getTime();
  const now = new Date("2026-09-03").getTime();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

function statusColour(pct: number, expected: number, days: number): string {
  if (days < 0) return "#a63446";
  if (pct === 0) return "#103766";
  if (pct >= expected) return "#1e8a56";
  if (pct < expected - 15) return "#b8872a";
  return "#4b607d";
}

function statusLabel(pct: number, expected: number, days: number): { text: string; bg: string; colour: string } {
  if (days < 0) return { text: "Overdue", bg: "rgba(166,52,70,.12)", colour: "#a63446" };
  if (pct >= 100) return { text: "Complete", bg: "rgba(30,138,86,.12)", colour: "#1e8a56" };
  if (pct === 0 && expected === 0) return { text: "Just started", bg: "rgba(16,55,102,.1)", colour: "#103766" };
  if (pct >= expected) return { text: "On track", bg: "rgba(30,138,86,.12)", colour: "#1e8a56" };
  if (pct < expected - 15) return { text: "Behind", bg: "rgba(184,135,42,.12)", colour: "#b8872a" };
  return { text: "On track", bg: "rgba(30,138,86,.12)", colour: "#1e8a56" };
}

interface GoalWithProgress extends Goal {
  current: number;
  pct: number;
  expected: number;
  days: number;
  accountName: string | null;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", target_amount: "", target_date: "", account_id: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [gs, accs] = await Promise.all([getGoals(), getAccounts()]);
    const accMap = Object.fromEntries(accs.map((a) => [a.id, a]));
    const enriched: GoalWithProgress[] = gs.map((g) => {
      const linked = g.account_id ? accMap[g.account_id] : null;
      const current = linked ? Math.max(0, linked.manual_balance) : 0;
      const pct = g.target_amount > 0 ? Math.min(100, Math.round((current / g.target_amount) * 100)) : 0;
      const expected = Math.round(expectedProgress(g.created_at, g.target_date));
      const days = daysUntil(g.target_date);
      return { ...g, current, pct, expected, days, accountName: linked?.name ?? null };
    });
    setGoals(enriched);
    setAccounts(accs);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(g: GoalWithProgress) {
    setEditingId(g.id);
    setForm({ name: g.name, target_amount: String(g.target_amount), target_date: g.target_date, account_id: g.account_id ?? "" });
    setShowForm(false);
    setConfirmDelete(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "", target_amount: "", target_date: "", account_id: "" });
  }

  async function handleAdd() {
    if (!form.name || !form.target_amount || !form.target_date) return;
    setSaving(true);
    const existing = editingId ? goals.find((g) => g.id === editingId) : null;
    const goal: Goal = {
      id: editingId ?? `g-${Date.now()}`,
      name: form.name,
      target_amount: parseFloat(form.target_amount),
      target_date: form.target_date,
      account_id: form.account_id || null,
      created_at: existing?.created_at ?? new Date().toISOString(),
    };
    await putGoal(goal);
    setForm({ name: "", target_amount: "", target_date: "", account_id: "" });
    setShowForm(false);
    setEditingId(null);
    setSaving(false);
    await load();
  }

  async function handleDelete(id: string) {
    await deleteGoal(id);
    setConfirmDelete(null);
    await load();
  }

  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current, 0);
  const onTrack = goals.filter((g) => g.pct >= g.expected || g.pct >= 100).length;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 7,
    border: "1px solid var(--bd)",
    background: "var(--bg)",
    color: "var(--mid)",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--steel)",
    textTransform: "uppercase" as const,
    letterSpacing: ".06em",
    marginBottom: 5,
    display: "block",
  };

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--mid)", letterSpacing: "-.03em" }}>Goals</h1>
          <p style={{ fontSize: 13, color: "var(--steel)", marginTop: 2 }}>Track your financial milestones — let AI help you plan the path</p>
        </div>
        <button
          onClick={() => { cancelEdit(); setShowForm((v) => !v); }}
          style={{
            padding: "9px 18px",
            background: showForm ? "var(--s1)" : "var(--mid)",
            color: showForm ? "var(--mid)" : "#fff",
            border: "1px solid var(--bd)",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {showForm ? "Cancel" : "+ Add Goal"}
        </button>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Total Goals", value: String(goals.length), sub: `${onTrack} on track`, accent: "var(--navy)" },
          { label: "Total Saved", value: fmt(totalSaved), sub: "across linked accounts", accent: "var(--gr)" },
          { label: "Total Target", value: fmt(totalTarget), sub: "across all goals", accent: "var(--navy)" },
          { label: "Gap to Fill", value: fmt(Math.max(0, totalTarget - totalSaved)), sub: totalSaved >= totalTarget ? "All goals funded!" : "remaining to reach all goals", accent: totalSaved >= totalTarget ? "var(--gr)" : "var(--cr)" },
        ].map((tile) => (
          <div key={tile.label} style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "16px 18px", boxShadow: "var(--sh)" }}>
            <div style={{ fontSize: 10, color: "var(--steel)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{tile.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--mid)", letterSpacing: "-.03em", lineHeight: 1 }}>{tile.value}</div>
            <div style={{ fontSize: 11, color: tile.accent, marginTop: 7, fontWeight: 600 }}>{tile.sub}</div>
          </div>
        ))}
      </div>

      {/* Add goal form */}
      {showForm && (
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "22px 24px", boxShadow: "var(--sh)", marginBottom: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--mid)", marginBottom: 18 }}>New Goal</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Goal Name</label>
              <input style={inputStyle} placeholder="e.g. Japan Holiday" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Target Amount</label>
              <input style={inputStyle} type="number" placeholder="10000" value={form.target_amount} onChange={(e) => setForm((f) => ({ ...f, target_amount: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Target Date</label>
              <input style={inputStyle} type="date" value={form.target_date} onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Linked Account (optional)</label>
              <select style={inputStyle} value={form.account_id} onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}>
                <option value="">No account</option>
                {accounts.filter((a) => a.manual_balance > 0).map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({fmt(a.manual_balance)})</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !form.name || !form.target_amount || !form.target_date}
            style={{
              padding: "9px 22px",
              background: "var(--mid)",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving || !form.name || !form.target_amount || !form.target_date ? 0.5 : 1,
              fontFamily: "inherit",
            }}
          >
            {saving ? "Saving…" : "Save Goal"}
          </button>
        </div>
      )}

      {/* Goals list */}
      {loading ? (
        <div style={{ color: "var(--steel)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>Loading goals…</div>
      ) : goals.length === 0 ? (
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "48px 24px", textAlign: "center", boxShadow: "var(--sh)" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>◎</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--mid)", marginBottom: 6 }}>No goals yet</div>
          <div style={{ fontSize: 13, color: "var(--steel)" }}>Add your first goal or ask the AI assistant to set one for you.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {goals.map((g) => {
            const colour = statusColour(g.pct, g.expected, g.days);
            const badge = statusLabel(g.pct, g.expected, g.days);
            const isDeleting = confirmDelete === g.id;
            return (
              <div
                key={g.id}
                style={{
                  background: "var(--s1)",
                  border: "1px solid var(--bd)",
                  borderLeft: `4px solid ${colour}`,
                  borderRadius: 12,
                  padding: "20px 22px",
                  boxShadow: "var(--sh)",
                  position: "relative",
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "var(--mid)" }}>{g.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: badge.bg, color: badge.colour }}>
                        {badge.text}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--steel)" }}>
                      {g.accountName ? `Tracking via ${g.accountName}` : "No account linked — AI can update manually"}
                      {" · "}
                      <span style={{ color: g.days < 0 ? "#a63446" : "var(--steel)" }}>{timeLabel(g.days)}</span>
                      {" · "}
                      Target: {new Date(g.target_date).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: colour, letterSpacing: "-.02em" }}>{g.pct}%</div>
                      <div style={{ fontSize: 11, color: "var(--steel)" }}>{fmt(g.current)} of {fmt(g.target_amount)}</div>
                    </div>
                    {isDeleting ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleDelete(g.id)}
                          style={{ padding: "5px 10px", background: "#a63446", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                        >Delete</button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          style={{ padding: "5px 10px", background: "var(--s2)", color: "var(--mid)", border: "1px solid var(--bd)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                        >Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => editingId === g.id ? cancelEdit() : startEdit(g)}
                          style={{ padding: "5px 9px", background: editingId === g.id ? "var(--s2)" : "transparent", color: "var(--steel)", border: "1px solid var(--bd)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                        >{editingId === g.id ? "Cancel" : "Edit"}</button>
                        <button
                          onClick={() => setConfirmDelete(g.id)}
                          style={{ padding: "5px 9px", background: "transparent", color: "var(--steel)", border: "1px solid var(--bd)", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", lineHeight: 1 }}
                          title="Delete goal"
                        >✕</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ position: "relative", height: 8, background: "var(--s2, rgba(0,0,0,.06))", borderRadius: 100, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${g.pct}%`, background: colour, borderRadius: 100, transition: "width .4s ease" }} />
                  {/* Expected marker */}
                  {g.expected > 0 && g.expected < 100 && (
                    <div style={{ position: "absolute", top: 0, left: `${g.expected}%`, width: 2, height: "100%", background: "rgba(0,0,0,.2)", borderRadius: 1 }} />
                  )}
                </div>

                {/* Bottom labels */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
                  <span style={{ fontSize: 10, color: "var(--steel)" }}>{fmt(0)} start</span>
                  {g.expected > 0 && g.expected < 100 && (
                    <span style={{ fontSize: 10, color: "var(--steel)", marginLeft: `${Math.min(g.expected, 85)}%` }}>
                      expected {g.expected}%
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: "var(--steel)", marginLeft: "auto" }}>{fmt(g.target_amount)} target</span>
                </div>

                {/* Remaining amount highlight */}
                {g.pct < 100 && editingId !== g.id && (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: `${colour}10`, borderRadius: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--steel)" }}>Still needed</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: colour }}>{fmt(Math.max(0, g.target_amount - g.current))}</span>
                  </div>
                )}

                {/* Inline edit form */}
                {editingId === g.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--bd)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
                      <div>
                        <label style={labelStyle}>Goal name</label>
                        <input style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Goal name" />
                      </div>
                      <div>
                        <label style={labelStyle}>Target amount</label>
                        <input style={inputStyle} type="number" value={form.target_amount} onChange={(e) => setForm((f) => ({ ...f, target_amount: e.target.value }))} placeholder="10000" />
                      </div>
                      <div>
                        <label style={labelStyle}>Target date</label>
                        <input style={inputStyle} type="date" value={form.target_date} onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))} />
                      </div>
                      <div>
                        <label style={labelStyle}>Linked account</label>
                        <select style={inputStyle} value={form.account_id} onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}>
                          <option value="">No account</option>
                          {accounts.filter((a) => a.manual_balance > 0).map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleAdd}
                        disabled={saving || !form.name || !form.target_amount || !form.target_date}
                        style={{ padding: "9px 16px", background: "var(--mid)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1, fontFamily: "inherit", whiteSpace: "nowrap" }}
                      >{saving ? "Saving…" : "Save"}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AI prompt hint */}
      <div style={{ marginTop: 28, padding: "16px 20px", background: "rgba(16,55,102,.05)", border: "1px solid rgba(16,55,102,.12)", borderRadius: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 4 }}>Ask your AI assistant</div>
        <div style={{ fontSize: 12, color: "var(--steel)", lineHeight: 1.6 }}>
          "What goals am I behind on?" · "Create a goal to save $25K for a car by June 2027" · "How long until I hit my Emergency Fund goal if I save $500/month?"
        </div>
      </div>
    </div>
  );
}
