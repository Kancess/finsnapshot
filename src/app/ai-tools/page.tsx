"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isSeeded } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { queryHealthScore } from "@/lib/queries";

interface HealthData {
  score: number;
  rating: string;
  factors: { name: string; score: number; max: number; note: string }[];
}

const TOOLS = [
  {
    name: "get_net_worth",
    label: "Net Worth",
    icon: "◈",
    color: "#103766",
    description: "Total assets, liabilities, and a breakdown by account type.",
    example: `{"tool": "get_net_worth"}`,
    returns: "{ assets, liabilities, net_worth, breakdown[] }",
  },
  {
    name: "get_accounts",
    label: "Accounts",
    icon: "✦",
    color: "#1e8a56",
    description: "All financial accounts with current balances. Filterable by type.",
    example: `{"tool": "get_accounts", "type": "investment"}`,
    returns: "{ accounts[] }",
  },
  {
    name: "get_transactions",
    label: "Transactions",
    icon: "↔",
    color: "#4b607d",
    description: "Recent transactions, filterable by category, account, and date range.",
    example: `{"tool": "get_transactions", "days": 30, "limit": 20}`,
    returns: "{ transactions[], total }",
  },
  {
    name: "get_spending_by_category",
    label: "Spending",
    icon: "◑",
    color: "#b8872a",
    description: "Spending breakdown by category over any period, with optional period comparison.",
    example: `{"tool": "get_spending_by_category", "days": 30, "compare_previous_period": true}`,
    returns: "{ categories[], total_days }",
  },
  {
    name: "get_cashflow",
    label: "Cashflow",
    icon: "↕",
    color: "#a63446",
    description: "Monthly income vs expenses and savings rate trend.",
    example: `{"tool": "get_cashflow", "months": 6}`,
    returns: "{ months[], avg_income, avg_expenses, avg_savings_rate, trend }",
  },
  {
    name: "get_portfolio",
    label: "Portfolio",
    icon: "◐",
    color: "#103766",
    description: "Investment portfolio holdings, allocation, and gain/loss.",
    example: `{"tool": "get_portfolio", "sort_by": "value"}`,
    returns: "{ holdings[], allocation[], total_value, total_gain_pct }",
  },
  {
    name: "get_recurring_charges",
    label: "Recurring",
    icon: "⟳",
    color: "#1e8a56",
    description: "Detected recurring transactions — subscriptions and bills — over 90 days.",
    example: `{"tool": "get_recurring_charges"}`,
    returns: "{ subscriptions[], total_monthly }",
  },
  {
    name: "get_financial_health_score",
    label: "Health Score",
    icon: "♡",
    color: "#a63446",
    description: "0–100 financial health score with factor breakdown covering savings, emergency fund, debt, and portfolio.",
    example: `{"tool": "get_financial_health_score"}`,
    returns: "{ score, rating, factors[] }",
  },
  {
    name: "get_goals",
    label: "Goals",
    icon: "◎",
    color: "#1e8a56",
    description: "All financial goals with current balance progress toward each target.",
    example: `{"tool": "get_goals"}`,
    returns: "{ goals[], currency }",
  },
  {
    name: "get_budget_status",
    label: "Budget",
    icon: "▤",
    color: "#b8872a",
    description: "Actual spending vs monthly budget per category for the last N days.",
    example: `{"tool": "get_budget_status", "days": 30}`,
    returns: "{ categories[], over_budget_count, total_budget, total_spent }",
  },
  {
    name: "set_goal",
    label: "Set Goal",
    icon: "⊕",
    color: "#103766",
    description: "Create or update a financial goal. Pass an id to update an existing goal.",
    example: `{"tool": "set_goal", "name": "Emergency Fund", "target_amount": 30000, "target_date": "2026-12-31"}`,
    returns: "{ success, goal }",
  },
  {
    name: "categorize_transaction",
    label: "Categorise",
    icon: "⊞",
    color: "#4b607d",
    description: "Update the category of a transaction by id.",
    example: `{"tool": "categorize_transaction", "id": "tx-123", "category_id": "dining"}`,
    returns: "{ success, id, category_id }",
  },
  {
    name: "add_transactions",
    label: "Import",
    icon: "⊟",
    color: "#4b607d",
    description: "Bulk-import transactions from a bank statement. Auto-categorises when category_id is omitted.",
    example: `{"tool": "add_transactions", "transactions": [{"date": "2026-08-01", "description": "Coles", "amount": -85.40, "account_id": "checking"}]}`,
    returns: "{ imported, auto_categorized, uncategorized, transactions[] }",
  },
  {
    name: "set_account_balance",
    label: "Reconcile",
    icon: "⊜",
    color: "#a63446",
    description: "Update an account balance — use after importing a bank statement to reconcile.",
    example: `{"tool": "set_account_balance", "account_id": "checking", "balance": 12540.00}`,
    returns: "{ success, account_id, balance }",
  },
  {
    name: "delete_goal",
    label: "Delete Goal",
    icon: "⊖",
    color: "#a63446",
    description: "Remove a financial goal by id.",
    example: `{"tool": "delete_goal", "id": "g1"}`,
    returns: "{ success, id }",
  },
  {
    name: "set_budget",
    label: "Set Budget",
    icon: "⊡",
    color: "#b8872a",
    description: "Set or update the monthly budget for a spending category. Pass null to remove it.",
    example: `{"tool": "set_budget", "category_id": "dining", "budget_monthly": 300}`,
    returns: "{ success, category_id, budget_monthly }",
  },
  {
    name: "get_financial_briefing",
    label: "Briefing",
    icon: "◉",
    color: "#103766",
    description: "One-call snapshot: net worth, cashflow, health score, goals, recurring commitments, and alerts. Ideal as a first call.",
    example: `{"tool": "get_financial_briefing"}`,
    returns: "{ summary, net_worth, cashflow, health, goals, budget, recurring, alerts[] }",
  },
  {
    name: "forecast_cashflow",
    label: "Forecast",
    icon: "↗",
    color: "#1e8a56",
    description: "Project monthly cashflow N months forward based on 6-month averages, adjusted for current spending trend.",
    example: `{"tool": "forecast_cashflow", "months": 6}`,
    returns: "{ forecast[], avg_monthly_income, avg_monthly_expenses, trend }",
  },
  {
    name: "calculate_safe_to_spend",
    label: "Safe to Spend",
    icon: "◎",
    color: "#1e8a56",
    description: "How much can I safely spend this month? Returns remaining discretionary budget and daily spending rate.",
    example: `{"tool": "calculate_safe_to_spend"}`,
    returns: "{ safe_to_spend, daily_rate, days_remaining_in_month, remaining_by_category[] }",
  },
];

const PROMPTS = [
  "Give me a full financial briefing — net worth, savings rate, goals, and anything I should be worried about.",
  "How much can I safely spend for the rest of this month without blowing my budget?",
  "Project my cashflow for the next 6 months — will I be saving more or less?",
  "Am I spending too much on dining and subscriptions this month compared to last?",
  "How is my investment portfolio performing and which holding has the best return?",
  "Which recurring subscriptions could I cancel to free up budget?",
  "Set my dining budget to $300 per month.",
  "I have a CSV of last month's bank transactions — import them and categorise anything that looks like groceries or transport.",
  "Set me a new goal to save $20,000 for a Europe trip by June 2027, then delete the Japan Holiday goal.",
];

function ScoreArc({ score }: { score: number }) {
  const r = 52;
  const cx = 70;
  const cy = 70;
  const startAngle = -220;
  const sweep = 260;
  const endAngle = startAngle + (sweep * score) / 100;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arc = (angle: number) => ({
    x: cx + r * Math.cos(toRad(angle)),
    y: cy + r * Math.sin(toRad(angle)),
  });

  const s = arc(startAngle);
  const e = arc(endAngle);
  const full = arc(startAngle + sweep);
  const largeArc = sweep * (score / 100) > 180 ? 1 : 0;
  const fullLarge = sweep > 180 ? 1 : 0;

  const color = score >= 75 ? "#1e8a56" : score >= 50 ? "#b8872a" : "#a63446";

  return (
    <svg width={140} height={100} viewBox="0 0 140 100">
      {/* Track */}
      <path
        d={`M ${s.x} ${s.y} A ${r} ${r} 0 ${fullLarge} 1 ${full.x} ${full.y}`}
        fill="none" stroke="var(--bd)" strokeWidth={10} strokeLinecap="round"
      />
      {/* Fill */}
      {score > 0 && (
        <path
          d={`M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
        />
      )}
      <text x={cx} y={cy + 6} textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: color, fontFamily: "inherit" }}>{score}</text>
      <text x={cx} y={cy + 20} textAnchor="middle" style={{ fontSize: 9, fill: "var(--steel)", fontFamily: "inherit" }}>out of 100</text>
    </svg>
  );
}

export default function AIToolsPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const pendingQuestion = searchParams.get("q");

  useEffect(() => {
    (async () => {
      const seeded = await isSeeded();
      if (!seeded) await seedDatabase();
      const h = await queryHealthScore();
      setHealth(h as HealthData);
    })();
  }, []);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const ratingColor = (r: string) => r === "Excellent" ? "var(--gr)" : r === "Good" ? "var(--navy)" : r === "Fair" ? "var(--gold)" : "var(--cr)";

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--mid)", letterSpacing: "-.03em" }}>AI Tools</h1>
          <p style={{ fontSize: 13, color: "var(--steel)", marginTop: 2 }}>19 WebMCP tools registered via <code style={{ background: "var(--s2)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>document.modelContext</code></p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ background: "var(--gr-l)", color: "var(--gr)", borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 100, background: "var(--gr)", display: "inline-block" }} />
            19 tools active
          </div>
        </div>
      </div>

      {/* Pending question from sidebar prompt */}
      {pendingQuestion && (
        <div style={{ background: "rgba(16,55,102,.07)", border: "1px solid rgba(16,55,102,.18)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 16, flexShrink: 0 }}>💬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#103766", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>Your question</div>
            <div style={{ fontSize: 14, color: "var(--mid)", fontWeight: 500, marginBottom: 10, fontStyle: "italic" }}>"{pendingQuestion}"</div>
            <div style={{ fontSize: 12, color: "var(--steel)", lineHeight: 1.55 }}>
              Open this page in <strong>ChatGPT</strong> (Work plan → in-app browser) or <strong>Chrome</strong> with <code style={{ fontSize: 10, background: "var(--s2)", padding: "1px 4px", borderRadius: 3 }}>chrome://flags/#enable-webmcp-testing</code> enabled, then paste the question above. The AI will call FinSnapshot's tools automatically.
            </div>
          </div>
          <button
            onClick={() => copy(pendingQuestion, "pending-q")}
            style={{ background: copied === "pending-q" ? "rgba(30,138,86,.15)" : "var(--s1)", border: "1px solid var(--bd)", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: copied === "pending-q" ? "var(--gr)" : "var(--mid)", flexShrink: 0, fontFamily: "inherit" }}
          >
            {copied === "pending-q" ? "Copied!" : "Copy question"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        {/* Left: tools + prompts */}
        <div>
          {/* Tool grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {TOOLS.map((tool) => (
              <div key={tool.name} style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 10, padding: "14px 16px", boxShadow: "var(--sh)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${tool.color}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: tool.color, flexShrink: 0 }}>
                    {tool.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)" }}>{tool.label}</span>
                      <code style={{ fontSize: 10, background: "var(--s2)", color: "var(--slate)", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>{tool.name}</code>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--slate)", marginBottom: 8 }}>{tool.description}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, background: "var(--bg)", borderRadius: 6, padding: "6px 10px", fontFamily: "monospace", fontSize: 10, color: "var(--slate)", overflow: "hidden" }}>
                        {tool.example}
                      </div>
                      <button
                        onClick={() => copy(tool.example, tool.name)}
                        style={{ background: copied === tool.name ? "var(--gr-l)" : "var(--bg)", border: "1px solid var(--bd)", borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", color: copied === tool.name ? "var(--gr)" : "var(--slate)", flexShrink: 0, fontFamily: "inherit" }}
                      >
                        {copied === tool.name ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 5 }}>Returns: <code style={{ fontFamily: "monospace", color: "var(--slate)" }}>{tool.returns}</code></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Example prompts */}
          <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "18px 20px", boxShadow: "var(--sh)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)", marginBottom: 12 }}>Example prompts to try with any WebMCP-compatible AI</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {PROMPTS.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg)", borderRadius: 7, border: "1px solid var(--bd)" }}>
                  <div style={{ flex: 1, fontSize: 12, color: "var(--mid)" }}>{p}</div>
                  <button
                    onClick={() => copy(p, `prompt-${i}`)}
                    style={{ background: copied === `prompt-${i}` ? "var(--gr-l)" : "var(--s1)", border: "1px solid var(--bd)", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", color: copied === `prompt-${i}` ? "var(--gr)" : "var(--slate)", flexShrink: 0, fontFamily: "inherit" }}
                  >
                    {copied === `prompt-${i}` ? "✓" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: health score + how it works */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Health score card */}
          {health && (
            <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "20px", boxShadow: "var(--sh)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)", marginBottom: 12 }}>Financial health score</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 12 }}>
                <ScoreArc score={health.score} />
                <div style={{ fontSize: 14, fontWeight: 800, color: ratingColor(health.rating), marginTop: 4 }}>{health.rating}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {health.factors.map((f) => {
                  const pct = f.max > 0 ? Math.round((f.score / f.max) * 100) : 0;
                  const col = pct >= 80 ? "var(--gr)" : pct >= 50 ? "var(--gold)" : "var(--cr)";
                  return (
                    <div key={f.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--mid)", fontWeight: 600 }}>{f.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{f.score}/{f.max} pts</span>
                      </div>
                      <div style={{ background: "var(--bd)", borderRadius: 100, height: 4 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 100 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--steel)", marginTop: 3 }}>{f.note}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Connect with Claude Desktop */}
          <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "18px 20px", boxShadow: "var(--sh)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)", marginBottom: 4 }}>Connect with Claude Desktop</div>
            <div style={{ fontSize: 11, color: "var(--steel)", marginBottom: 12 }}>via WebMCP bridge (webmcp.dev)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { step: "1", text: "Add the WebMCP server to Claude Desktop config and restart:", code: `npx @jason.today/webmcp@latest --config claude` },
                { step: "2", text: "Ask Claude to generate a webmcp token, then click the blue widget in the bottom-right corner of this page and paste it." },
                { step: "3", text: "Now ask Claude anything about your finances — it calls the tools directly." },
              ].map((s) => (
                <div key={s.step} style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 20, height: 20, minWidth: 20, borderRadius: 100, background: "var(--navy)", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{s.step}</div>
                  <div>
                    <p style={{ fontSize: 12, color: "var(--slate)", margin: 0, lineHeight: 1.5 }}>{s.text}</p>
                    {s.code && (
                      <code style={{ display: "block", marginTop: 4, fontSize: 10, background: "var(--bg)", border: "1px solid var(--bd)", borderRadius: 5, padding: "5px 8px", color: "var(--mid)", fontFamily: "monospace", overflowX: "auto" }}>{s.code}</code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "18px 20px", boxShadow: "var(--sh)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)", marginBottom: 4 }}>Connect with ChatGPT / Chrome</div>
            <div style={{ fontSize: 11, color: "var(--steel)", marginBottom: 12 }}>via native WebMCP (document.modelContext)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { step: "1", text: "Enable chrome://flags/#enable-webmcp-testing in Chrome, or use ChatGPT's in-app browser." },
                { step: "2", text: "FinSnapshot's 14 tools are auto-registered on document.modelContext when the page loads." },
                { step: "3", text: "Ask any financial question — the AI calls the right tool, reads your real data, and answers." },
                { step: "4", text: "Your financial data lives in your browser's IndexedDB. Tool calls go directly from the AI to your page's JavaScript — no backend, no server, no third-party." },
              ].map((s) => (
                <div key={s.step} style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 20, height: 20, minWidth: 20, borderRadius: 100, background: "var(--navy)", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{s.step}</div>
                  <p style={{ fontSize: 12, color: "var(--slate)", margin: 0, lineHeight: 1.5 }}>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
