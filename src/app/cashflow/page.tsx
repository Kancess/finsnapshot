"use client";

import { useEffect, useState } from "react";
import { isSeeded } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { queryCashflow, fmt } from "@/lib/queries";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from "recharts";

interface CashflowMonth {
  month: string; // already formatted e.g. "May 2026"
  key?: string;
  income: number;
  expenses: number;
}

interface CashflowData {
  months: CashflowMonth[];
  avg_income: number;
  avg_expenses: number;
  avg_savings_rate: number;
  trend: string;
}

export default function CashflowPage() {
  const [data, setData] = useState<CashflowData | null>(null);

  useEffect(() => {
    (async () => {
      const seeded = await isSeeded();
      if (!seeded) await seedDatabase();
      const cf = await queryCashflow(6);
      setData(cf as CashflowData);
    })();
  }, []);

  if (!data) return <div style={{ padding: 40, color: "var(--steel)", fontSize: 13 }}>Loading…</div>;

  const chartData = data.months.map((m) => ({
    month: m.month.split(" ")[0], // "May 2026" → "May"
    Income: m.income,
    Expenses: m.expenses,
    Net: m.income - m.expenses,
  }));

  const avgNet = data.avg_income - data.avg_expenses;

  const statCards = [
    { label: "Avg monthly income", value: fmt(data.avg_income), color: "var(--gr)" },
    { label: "Avg monthly spend", value: fmt(data.avg_expenses), color: "var(--cr)" },
    { label: "Avg monthly savings", value: fmt(avgNet), color: "var(--navy)" },
    { label: "Avg savings rate", value: `${Math.round(data.avg_savings_rate)}%`, color: "var(--gold)" },
  ];

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--mid)", letterSpacing: "-.03em" }}>Cashflow</h1>
        <p style={{ fontSize: 13, color: "var(--steel)", marginTop: 2 }}>6-month income and expense trend</p>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 10, padding: "16px 18px", boxShadow: "var(--sh)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: "-.02em" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Area chart */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "20px 20px 12px", marginBottom: 16, boxShadow: "var(--sh)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)", marginBottom: 16 }}>Income vs Expenses</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 20, bottom: 0, left: 10 }}>
            <defs>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e8a56" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1e8a56" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a63446" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#a63446" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--steel)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--steel)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 8, fontSize: 12, fontFamily: "inherit" }}
              formatter={(val) => [`$${Number(val).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`, undefined]}
            />
            <Area type="monotone" dataKey="Income" stroke="#1e8a56" strokeWidth={2} fill="url(#gradIncome)" dot={false} />
            <Area type="monotone" dataKey="Expenses" stroke="#a63446" strokeWidth={2} fill="url(#gradExpenses)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Net savings bar chart */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "20px 20px 12px", marginBottom: 16, boxShadow: "var(--sh)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)", marginBottom: 16 }}>Monthly Net Savings</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 20, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--steel)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--steel)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 8, fontSize: 12, fontFamily: "inherit" }}
              formatter={(val) => [`$${Number(val).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`, "Net savings"]}
            />
            <Bar dataKey="Net" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.Net >= 0 ? "#1e8a56" : "#a63446"} fillOpacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Month table */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, boxShadow: "var(--sh)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 100px", padding: "10px 20px", borderBottom: "2px solid var(--bd)", background: "var(--bg)" }}>
          {["Month", "Income", "Expenses", "Net", "Savings rate"].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</div>
          ))}
        </div>
        {data.months.map((m, i) => {
          const net = m.income - m.expenses;
          const rate = m.income > 0 ? (net / m.income) * 100 : 0;
          return (
            <div key={m.month} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 100px", padding: "12px 20px", borderBottom: i < data.months.length - 1 ? "1px solid var(--bd)" : "none", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)" }}>{m.month}</div>
              <div style={{ fontSize: 13, color: "var(--gr)", fontWeight: 600 }}>+{fmt(m.income)}</div>
              <div style={{ fontSize: 13, color: "var(--mid)" }}>{fmt(m.expenses)}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: net >= 0 ? "var(--gr)" : "var(--cr)" }}>{net >= 0 ? "+" : ""}{fmt(net)}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: rate >= 20 ? "var(--gr)" : rate >= 10 ? "var(--gold)" : "var(--cr)" }}>{Math.round(rate)}%</div>
                <div style={{ background: "var(--bd)", borderRadius: 100, height: 3, marginTop: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(rate, 100)}%`, height: "100%", background: rate >= 20 ? "var(--gr)" : rate >= 10 ? "var(--gold)" : "var(--cr)", borderRadius: 100 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
