"use client";

import { accounts, portfolio, transactions, cashflow, getNetWorth, getSpendingByCategory } from "@/data/mock";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

function NetWorthCard() {
  const { assets, liabilities, netWorth } = getNetWorth();
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500 mb-1">Net Worth</p>
      <p className="text-4xl font-bold text-gray-900 mb-4">{fmt(netWorth)}</p>
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-gray-400">Assets</p>
          <p className="text-lg font-semibold text-emerald-600">{fmt(assets)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Liabilities</p>
          <p className="text-lg font-semibold text-red-500">{fmt(liabilities)}</p>
        </div>
      </div>
    </div>
  );
}

function AccountsCard() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-700 mb-4">Accounts</p>
      <div className="space-y-3">
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">{a.name}</p>
              <p className="text-xs text-gray-400 capitalize">{a.type} · {a.institution}</p>
            </div>
            <p className={`text-sm font-semibold ${a.balance >= 0 ? "text-gray-900" : "text-red-500"}`}>
              {fmtFull(a.balance)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpendingCard() {
  const spending = getSpendingByCategory(30);
  const total = spending.reduce((s, c) => s + c.total, 0);
  const colours = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-pink-500"];
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-700 mb-1">Spending — last 30 days</p>
      <p className="text-2xl font-bold text-gray-900 mb-4">{fmtFull(total)}</p>
      <div className="space-y-2">
        {spending.map((c, i) => (
          <div key={c.category}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-600">{c.category}</span>
              <span className="text-gray-800 font-medium">{fmtFull(c.total)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${colours[i % colours.length]}`}
                style={{ width: `${(c.total / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CashflowCard() {
  const max = Math.max(...cashflow.map((m) => m.income));
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-700 mb-4">Cashflow — 6 months</p>
      <div className="flex items-end gap-2 h-28">
        {cashflow.map((m) => (
          <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex gap-0.5 items-end" style={{ height: "80px" }}>
              <div
                className="flex-1 bg-emerald-200 rounded-t"
                style={{ height: `${(m.income / max) * 80}px` }}
                title={`Income: ${fmtFull(m.income)}`}
              />
              <div
                className="flex-1 bg-rose-200 rounded-t"
                style={{ height: `${(m.expenses / max) * 80}px` }}
                title={`Expenses: ${fmtFull(m.expenses)}`}
              />
            </div>
            <p className="text-[9px] text-gray-400 text-center leading-tight">{m.month.split(" ")[0]}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-200" />
          <span className="text-xs text-gray-500">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-rose-200" />
          <span className="text-xs text-gray-500">Expenses</span>
        </div>
      </div>
    </div>
  );
}

function PortfolioCard() {
  const totalValue = portfolio.reduce((s, h) => s + h.value, 0);
  const totalGain = portfolio.reduce((s, h) => s + h.gain, 0);
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-medium text-gray-700">Portfolio</p>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{fmtFull(totalValue)}</p>
          <p className={`text-xs font-medium ${totalGain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {totalGain >= 0 ? "+" : ""}{fmtFull(totalGain)} total gain
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {portfolio.map((h) => (
          <div key={h.ticker} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{h.ticker}</span>
              <span className="text-xs text-gray-500 truncate max-w-[130px]">{h.name}</span>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-800">{fmtFull(h.value)}</p>
              <p className={`text-[10px] ${h.gain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {h.gain >= 0 ? "+" : ""}{h.gainPct}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionsCard() {
  const recent = transactions.slice(0, 10);
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <p className="text-sm font-medium text-gray-700 mb-4">Recent Transactions</p>
      <div className="space-y-2.5">
        {recent.map((t) => (
          <div key={t.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-800">{t.description}</p>
              <p className="text-xs text-gray-400">{t.date} · {t.category}</p>
            </div>
            <p className={`text-sm font-medium ${t.amount >= 0 ? "text-emerald-600" : "text-gray-700"}`}>
              {t.amount >= 0 ? "+" : ""}{fmtFull(t.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">FinSnapshot</h1>
            <p className="text-xs text-gray-400">Your finances, agent-ready</p>
          </div>
          <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-xs font-medium text-violet-700">WebMCP active</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <div className="md:col-span-2 xl:col-span-1">
            <NetWorthCard />
          </div>
          <CashflowCard />
          <SpendingCard />
          <AccountsCard />
          <PortfolioCard />
          <TransactionsCard />
        </div>

        <div className="mt-8 bg-violet-50 border border-violet-100 rounded-2xl p-6">
          <p className="text-sm font-semibold text-violet-900 mb-2">Ask your agent about these finances</p>
          <div className="flex flex-wrap gap-2">
            {[
              "What's my net worth?",
              "Am I spending too much on dining?",
              "How's my cashflow trending?",
              "Which investments are performing best?",
              "How much did I spend on groceries this month?",
              "What's my savings rate?",
            ].map((q) => (
              <span key={q} className="text-xs bg-white border border-violet-200 text-violet-700 rounded-full px-3 py-1.5">
                {q}
              </span>
            ))}
          </div>
          <p className="text-xs text-violet-400 mt-3">
            This page exposes 6 structured tools via WebMCP — open it in ChatGPT or Chrome with WebMCP enabled to try them.
          </p>
        </div>
      </main>
    </div>
  );
}
