"use client";

import { useEffect, useState } from "react";
import { isSeeded, getPortfolio } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import type { PortfolioHolding } from "@/lib/db";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const CLASS_LABELS: Record<string, string> = {
  "au-etf": "AU ETF",
  "intl-etf": "Intl ETF",
  "au-shares": "AU Shares",
  "us-shares": "US Shares",
  "other": "Other",
};

const CLASS_COLORS: Record<string, string> = {
  "au-etf": "#103766",
  "intl-etf": "#1e8a56",
  "au-shares": "#b8872a",
  "us-shares": "#a63446",
  "other": "#8fa1b8",
};

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);

  useEffect(() => {
    (async () => {
      const seeded = await isSeeded();
      if (!seeded) await seedDatabase();
      const h = await getPortfolio();
      setHoldings(h.sort((a, b) => b.value - a.value));
    })();
  }, []);

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const totalGain = holdings.reduce((s, h) => s + h.gain, 0);
  const avgGainPct = holdings.length > 0 ? holdings.reduce((s, h) => s + h.gain_pct, 0) / holdings.length : 0;

  // Allocation by asset class
  const allocationMap: Record<string, number> = {};
  for (const h of holdings) {
    allocationMap[h.asset_class] = (allocationMap[h.asset_class] ?? 0) + h.value;
  }
  const allocation = Object.entries(allocationMap).map(([cls, value]) => ({
    cls, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
  })).sort((a, b) => b.value - a.value);

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--mid)", letterSpacing: "-.03em" }}>Portfolio</h1>
        <p style={{ fontSize: 13, color: "var(--steel)", marginTop: 2 }}>{holdings.length} holdings · prices updated manually</p>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 10, padding: "16px 18px", boxShadow: "var(--sh)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Total value</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--navy)", letterSpacing: "-.02em" }}>{fmtFull(totalValue)}</div>
        </div>
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 10, padding: "16px 18px", boxShadow: "var(--sh)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Total gain</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: totalGain >= 0 ? "var(--gr)" : "var(--cr)", letterSpacing: "-.02em" }}>{totalGain >= 0 ? "+" : ""}{fmtFull(totalGain)}</div>
        </div>
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 10, padding: "16px 18px", boxShadow: "var(--sh)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>Avg return</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: avgGainPct >= 0 ? "var(--gr)" : "var(--cr)", letterSpacing: "-.02em" }}>{fmtPct(avgGainPct)}</div>
        </div>
      </div>

      {/* Allocation + donut */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, marginBottom: 20 }}>
        {/* Allocation bars */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "20px 22px", boxShadow: "var(--sh)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)", marginBottom: 16 }}>Asset allocation</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {allocation.map((a) => (
              <div key={a.cls}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: CLASS_COLORS[a.cls], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--mid)" }}>{CLASS_LABELS[a.cls]}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mid)" }}>{fmtFull(a.value)}</span>
                    <span style={{ fontSize: 11, color: "var(--steel)", minWidth: 36, textAlign: "right" }}>{Math.round(a.pct)}%</span>
                  </div>
                </div>
                <div style={{ background: "var(--bd)", borderRadius: 100, height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${a.pct}%`, height: "100%", background: CLASS_COLORS[a.cls], borderRadius: 100, transition: "width .4s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donut */}
        <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, padding: "20px", boxShadow: "var(--sh)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)", marginBottom: 8, alignSelf: "flex-start" }}>Allocation</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={allocation} dataKey="value" cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={3}>
                {allocation.map((a) => (
                  <Cell key={a.cls} fill={CLASS_COLORS[a.cls]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 8, fontSize: 11, fontFamily: "inherit" }}
                formatter={(val) => [fmtFull(Number(val)), undefined]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", justifyContent: "center", marginTop: 4 }}>
            {allocation.map((a) => (
              <div key={a.cls} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--slate)" }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: CLASS_COLORS[a.cls] }} />
                {CLASS_LABELS[a.cls]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12, boxShadow: "var(--sh)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 90px 90px 90px 90px 80px", padding: "10px 20px", borderBottom: "2px solid var(--bd)", background: "var(--bg)" }}>
          {["Ticker", "Name", "Units", "Price", "Value", "Gain/Loss", "Return"].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: ".07em" }}>{h}</div>
          ))}
        </div>
        {holdings.map((h, i) => (
          <div key={h.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 90px 90px 90px 90px 80px", padding: "13px 20px", borderBottom: i < holdings.length - 1 ? "1px solid var(--bd)" : "none", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", letterSpacing: ".02em" }}>{h.ticker}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mid)" }}>{h.name}</div>
              <div style={{ fontSize: 10, color: "var(--steel)", marginTop: 1 }}>{CLASS_LABELS[h.asset_class]}</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--slate)" }}>{h.units.toLocaleString("en-AU", { maximumFractionDigits: 3 })}</div>
            <div style={{ fontSize: 13, color: "var(--slate)" }}>{fmtFull(h.price)}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mid)" }}>{fmtFull(h.value)}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: h.gain >= 0 ? "var(--gr)" : "var(--cr)" }}>
              {h.gain >= 0 ? "+" : ""}{fmtFull(h.gain)}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 100, display: "inline-flex",
              background: h.gain_pct >= 0 ? "var(--gr-l)" : "var(--cr-l)",
              color: h.gain_pct >= 0 ? "var(--gr)" : "var(--cr)",
            }}>
              {fmtPct(h.gain_pct)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
