"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sankey, Tooltip, PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { isSeeded } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import {
  queryNetWorth, queryCashflow, querySpendingByCategory,
  fmtFull,
} from "@/lib/queries";
import { getTransactions, getCategories } from "@/lib/db";
import type { Transaction, Category } from "@/lib/db";

const fmt2 = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD",
    maximumFractionDigits: 0, notation: "compact",
  }).format(n);

// ---------- Sankey node factory (captures totalIncome for %) ----------
function makeSankeyNode(totalIncome: number) {
  return function Node({ x, y, width, height, payload }: {
    x: number; y: number; width: number; height: number;
    payload: { name: string; value: number; colour?: string };
  }) {
    const isSource = payload.name === "Income";
    const colour = isSource ? "#1e8a56" : (payload.colour || "#8fa1b8");
    const labelX = isSource ? x - 10 : x + width + 10;
    const anchor = isSource ? "end" : "start";
    const pct = totalIncome > 0 ? Math.round((payload.value / totalIncome) * 100) : 0;

    return (
      <g>
        <rect x={x} y={y} width={width} height={Math.max(height, 2)} rx={4} fill={colour} fillOpacity={0.9} />
        <text x={labelX} y={y + Math.max(height, 2) / 2 - 9} textAnchor={anchor} fill="#4b607d" fontSize={12} fontWeight={700} fontFamily="'Plus Jakarta Sans',sans-serif">
          {payload.name}
        </text>
        <text x={labelX} y={y + Math.max(height, 2) / 2 + 7} textAnchor={anchor} fill="#8fa1b8" fontSize={10} fontFamily="'Plus Jakarta Sans',sans-serif">
          {fmtFull(payload.value ?? 0)}
          {!isSource && ` · ${pct}%`}
        </text>
      </g>
    );
  };
}

// ---------- Custom Sankey link ----------
function SankeyLink({ sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, payload }: {
  sourceX: number; sourceY: number; sourceControlX: number;
  targetX: number; targetY: number; targetControlX: number;
  linkWidth: number; payload: { colour?: string };
}) {
  const colour = payload?.colour || "#8fa1b8";
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={colour}
      strokeWidth={Math.max(linkWidth, 1)}
      strokeOpacity={0.18}
    />
  );
}

function FlowTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid var(--bd)", borderRadius: 8, padding: "8px 14px", fontSize: 12, boxShadow: "var(--sh-md)", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ fontWeight: 700, color: "var(--mid)" }}>{p.name}</div>
      <div style={{ color: "var(--slate)", marginTop: 2 }}>{fmtFull(p.value ?? 0)}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<{
    netWorth: { assets: number; liabilities: number; net_worth: number } | null;
    cashflow: { months: { month: string; income: number; expenses: number }[]; avg_savings_rate: number; trend: string } | null;
    spending: { category: string; category_id: string; total: number; colour: string; budget: number | null }[];
    recentTxs: Transaction[];
    cats: Category[];
    sankeyData: { nodes: { name: string; colour?: string }[]; links: { source: number; target: number; value: number; colour?: string }[] } | null;
    incomeAmount: number;
    nwHistory: { month: string; nw: number }[];
  }>({ netWorth: null, cashflow: null, spending: [], recentTxs: [], cats: [], sankeyData: null, incomeAmount: 0, nwHistory: [] });

  useEffect(() => {
    (async () => {
      const seeded = await isSeeded();
      if (!seeded) await seedDatabase();

      const [nw, cf, sp, txs, cats] = await Promise.all([
        queryNetWorth(),
        queryCashflow(6),
        querySpendingByCategory(30),
        getTransactions(),
        getCategories(),
      ]);

      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const incomeAmount = txs
        .filter((t) => t.amount > 0 && t.date >= cutoff)
        .reduce((s, t) => s + t.amount, 0);
      const totalExpenses = sp.reduce((s, c) => s + c.total, 0);
      const savings = Math.max(0, incomeAmount - totalExpenses);

      const topCategories = sp.filter((c) => c.total > 0).slice(0, 7);

      const nodes: { name: string; colour?: string }[] = [
        { name: "Income", colour: "#1e8a56" },
        ...(savings > 0 ? [{ name: "Savings", colour: "#1e8a56" }] : []),
        ...topCategories.map((c) => ({ name: c.category, colour: c.colour })),
      ];

      const links: { source: number; target: number; value: number; colour?: string }[] = [];
      let idx = 1;
      if (savings > 0) {
        links.push({ source: 0, target: idx++, value: Math.round(savings * 100) / 100, colour: "#1e8a56" });
      }
      for (const cat of topCategories) {
        links.push({ source: 0, target: idx++, value: Math.round(cat.total * 100) / 100, colour: cat.colour });
      }

      // Net worth history — work backwards from current NW
      const cfMonths = cf.months as { month: string; income: number; expenses: number }[];
      let runningNW = nw.net_worth;
      const nwHistory: { month: string; nw: number }[] = [];
      for (let i = cfMonths.length - 1; i >= 0; i--) {
        nwHistory.unshift({ month: cfMonths[i].month.split(" ")[0], nw: Math.round(runningNW) });
        runningNW -= (cfMonths[i].income - cfMonths[i].expenses);
      }

      setData({
        netWorth: nw,
        cashflow: cf,
        spending: sp.slice(0, 8),
        recentTxs: txs.slice(0, 7),
        cats,
        sankeyData: { nodes, links },
        incomeAmount,
        nwHistory,
      });
    })();
  }, []);

  const catMap = Object.fromEntries(data.cats.map((c) => [c.id, c]));
  const currentMonth = data.cashflow?.months[data.cashflow.months.length - 1];
  const totalSpending = data.spending.reduce((s, c) => s + c.total, 0);

  const SankeyNode = useMemo(() => makeSankeyNode(data.incomeAmount), [data.incomeAmount]);

  // Net worth change vs first data point
  const nwChange = data.nwHistory.length >= 2
    ? data.nwHistory[data.nwHistory.length - 1].nw - data.nwHistory[0].nw
    : 0;
  const nwChangePct = data.nwHistory.length >= 2 && data.nwHistory[0].nw > 0
    ? (nwChange / data.nwHistory[0].nw) * 100
    : 0;

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1140 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--mid)", letterSpacing: "-.03em" }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: "var(--steel)", marginTop: 2 }}>Your financial snapshot — Sep 2026</p>
      </div>

      {/* Metric tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          {
            label: "Net Worth",
            value: data.netWorth ? fmt2(data.netWorth.net_worth) : "—",
            sub: data.netWorth ? `${fmt2(data.netWorth.assets)} assets · ${fmt2(data.netWorth.liabilities)} debt` : "",
            accent: "var(--navy)",
          },
          {
            label: "Monthly Income",
            value: currentMonth ? fmt2(currentMonth.income) : "—",
            sub: data.cashflow ? `6-mo avg ${fmt2(data.cashflow.months.reduce((s, m) => s + m.income, 0) / Math.max(1, data.cashflow.months.length))}` : "",
            accent: "var(--gr)",
          },
          {
            label: "Savings Rate",
            value: data.cashflow ? `${data.cashflow.avg_savings_rate.toFixed(1)}%` : "—",
            sub: data.cashflow?.trend === "improving" ? "↑ trending up" : data.cashflow?.trend === "declining" ? "↓ trending down" : "→ stable",
            accent: data.cashflow?.trend === "declining" ? "var(--cr)" : "var(--gr)",
          },
          {
            label: "Monthly Spend",
            value: currentMonth ? fmt2(currentMonth.expenses) : "—",
            sub: data.cashflow ? `6-mo avg ${fmt2(data.cashflow.months.reduce((s, m) => s + m.expenses, 0) / Math.max(1, data.cashflow.months.length))}` : "",
            accent: "var(--cr)",
          },
        ].map((tile) => (
          <div key={tile.label} style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "18px 20px", boxShadow: "var(--sh)" }}>
            <div style={{ fontSize: 11, color: "var(--steel)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>{tile.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--mid)", letterSpacing: "-.04em", lineHeight: 1 }}>{tile.value}</div>
            <div style={{ fontSize: 11, color: tile.accent, marginTop: 8, fontWeight: 600 }}>{tile.sub}</div>
          </div>
        ))}
      </div>

      {/* Net Worth Growth chart — full width */}
      {data.nwHistory.length > 1 && (
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "20px 24px 12px", boxShadow: "var(--sh)", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--mid)" }}>Net Worth Growth</div>
              <div style={{ fontSize: 12, color: "var(--steel)", marginTop: 2 }}>6-month trajectory</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: nwChange >= 0 ? "var(--gr)" : "var(--cr)", letterSpacing: "-.02em" }}>
                {nwChange >= 0 ? "+" : ""}{fmt2(nwChange)}
              </div>
              <div style={{ fontSize: 11, color: "var(--steel)", marginTop: 2 }}>
                {nwChangePct >= 0 ? "+" : ""}{nwChangePct.toFixed(1)}% over 6 months
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.nwHistory} margin={{ top: 4, right: 4, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#103766" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#103766" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--steel)" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--steel)" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                domain={["auto", "auto"]}
              />
              <Tooltip
                formatter={(val) => [fmt2(Number(val)), "Net worth"]}
                contentStyle={{ background: "#fff", border: "1px solid var(--bd)", borderRadius: 8, fontSize: 12, fontFamily: "inherit" }}
              />
              <Area
                type="monotone" dataKey="nw"
                stroke="#103766" strokeWidth={2.5}
                fill="url(#nwGrad)" dot={{ r: 4, fill: "#103766", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#103766" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cash flow sankey */}
      {data.sankeyData && data.sankeyData.links.length > 0 && (
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "22px 24px", boxShadow: "var(--sh)", marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--mid)", marginBottom: 2 }}>Cash Flow</div>
          <div style={{ fontSize: 12, color: "var(--steel)", marginBottom: 4 }}>Where your income goes — last 30 days</div>
          <ResponsiveContainer width="100%" height={360}>
            <Sankey
              data={data.sankeyData}
              nodePadding={22}
              margin={{ top: 20, right: 200, bottom: 20, left: 180 }}
              node={(props) => <SankeyNode {...(props as Parameters<typeof SankeyNode>[0])} />}
              link={(props) => <SankeyLink {...(props as Parameters<typeof SankeyLink>[0])} />}
            >
              <Tooltip content={<FlowTooltip />} />
            </Sankey>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom row: spending donut + area chart + recent txs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1.4fr", gap: 16 }}>

        {/* Spending donut with centre total + percentage legend */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "20px", boxShadow: "var(--sh)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--mid)", marginBottom: 2 }}>Spending</div>
          <div style={{ fontSize: 11, color: "var(--steel)", marginBottom: 10 }}>Last 30 days</div>
          <div style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={data.spending}
                  cx="50%" cy="50%"
                  innerRadius={42} outerRadius={65}
                  dataKey="total" paddingAngle={2}
                >
                  {data.spending.map((entry, i) => (
                    <Cell key={i} fill={entry.colour} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [fmtFull(Number(val)), undefined]}
                  contentStyle={{ background: "#fff", border: "1px solid var(--bd)", borderRadius: 6, fontSize: 11, fontFamily: "inherit" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center", pointerEvents: "none",
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--mid)", lineHeight: 1 }}>{fmt2(totalSpending)}</div>
              <div style={{ fontSize: 9, color: "var(--steel)", marginTop: 2 }}>Total</div>
            </div>
          </div>
          {/* Legend with percentages */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
            {data.spending.map((s) => {
              const pct = totalSpending > 0 ? Math.round((s.total / totalSpending) * 100) : 0;
              return (
                <div key={s.category} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.colour, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "var(--slate)", fontWeight: 500 }}>{s.category}</span>
                  <span style={{ color: "var(--steel)", fontWeight: 500, minWidth: 26, textAlign: "right" }}>{pct}%</span>
                  <span style={{ color: s.budget && s.total > s.budget ? "var(--cr)" : "var(--mid)", fontWeight: 700, minWidth: 38, textAlign: "right" }}>{fmt2(s.total)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6-month income vs expenses */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "20px 16px 12px", boxShadow: "var(--sh)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--mid)", marginBottom: 2 }}>Income vs Expenses</div>
          <div style={{ fontSize: 11, color: "var(--steel)", marginBottom: 12, display: "flex", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--gr)", display: "inline-block" }} />Income</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--cr)", display: "inline-block" }} />Expenses</span>
          </div>
          {data.cashflow && (
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={data.cashflow.months} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="grGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e8a56" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#1e8a56" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="crGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a63446" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#a63446" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--steel)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--steel)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val) => [fmtFull(Number(val)), undefined]}
                  contentStyle={{ background: "#fff", border: "1px solid var(--bd)", borderRadius: 6, fontSize: 11, fontFamily: "inherit" }}
                />
                <Area type="monotone" dataKey="income" stroke="#1e8a56" strokeWidth={2} fill="url(#grGrad)" dot={false} />
                <Area type="monotone" dataKey="expenses" stroke="#a63446" strokeWidth={2} fill="url(#crGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent transactions */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, boxShadow: "var(--sh)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 12px", borderBottom: "1px solid var(--bd)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--mid)" }}>Recent</div>
            <Link href="/transactions" style={{ fontSize: 11, color: "var(--cr)", fontWeight: 700, textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {data.recentTxs.map((tx, i) => {
              const cat = tx.category_id ? catMap[tx.category_id] : null;
              return (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", padding: "10px 18px", borderBottom: i < data.recentTxs.length - 1 ? "1px solid var(--bd)" : "none", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: cat?.colour ? `${cat.colour}20` : "var(--s2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, color: cat?.colour || "var(--steel)" }}>
                    {tx.amount > 0 ? "+" : "−"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mid)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description}</div>
                    <div style={{ fontSize: 10, color: "var(--steel)", marginTop: 1 }}>{cat?.name ?? "Uncategorised"}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: tx.amount >= 0 ? "var(--gr)" : "var(--mid)", flexShrink: 0 }}>
                    {tx.amount >= 0 ? "+" : ""}{fmt2(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
