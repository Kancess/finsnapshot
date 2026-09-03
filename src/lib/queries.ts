import { getAccounts, getTransactions, getCategories, getPortfolio, getGoals, getRules } from "./db";
import type { Transaction, Category } from "./db";

export const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

export const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export async function queryNetWorth() {
  const accounts = await getAccounts();
  const assets = accounts.filter((a) => a.manual_balance > 0).reduce((s, a) => s + a.manual_balance, 0);
  const liabilities = accounts.filter((a) => a.manual_balance < 0).reduce((s, a) => s + Math.abs(a.manual_balance), 0);
  const breakdown = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: a.manual_balance,
  }));
  return { assets, liabilities, net_worth: assets - liabilities, breakdown };
}

export async function querySpendingByCategory(days = 30) {
  const [txs, cats] = await Promise.all([getTransactions(), getCategories()]);
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c]));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const totals: Record<string, number> = {};
  for (const tx of txs) {
    if (tx.amount >= 0 || !tx.category_id || tx.date < cutoffStr) continue;
    const cat = catMap[tx.category_id];
    if (!cat || cat.type === "transfer") continue;
    totals[tx.category_id] = (totals[tx.category_id] || 0) + Math.abs(tx.amount);
  }
  return Object.entries(totals)
    .map(([cat_id, total]) => ({
      category_id: cat_id,
      category: catMap[cat_id]?.name ?? cat_id,
      colour: catMap[cat_id]?.colour ?? "#9daec2",
      total: Math.round(total * 100) / 100,
      budget: catMap[cat_id]?.budget_monthly ?? null,
    }))
    .sort((a, b) => b.total - a.total);
}

export async function queryCashflow(months = 6) {
  const txs = await getTransactions();
  const cats = await getCategories();
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c]));

  const monthMap: Record<string, { income: number; expenses: number }> = {};

  for (const tx of txs) {
    const [year, month] = tx.date.split("-");
    const key = `${year}-${month}`;
    if (!monthMap[key]) monthMap[key] = { income: 0, expenses: 0 };
    const cat = tx.category_id ? catMap[tx.category_id] : null;
    if (cat?.type === "transfer") continue;
    if (tx.amount > 0) monthMap[key].income += tx.amount;
    else monthMap[key].expenses += Math.abs(tx.amount);
  }

  const sorted = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-months)
    .map(([key, vals]) => {
      const [year, month] = key.split("-");
      const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-AU", { month: "short", year: "numeric" });
      return { month: label, key, income: Math.round(vals.income * 100) / 100, expenses: Math.round(vals.expenses * 100) / 100 };
    });

  const avgIncome = sorted.reduce((s, m) => s + m.income, 0) / (sorted.length || 1);
  const avgExpenses = sorted.reduce((s, m) => s + m.expenses, 0) / (sorted.length || 1);
  const avgSavingsRate = avgIncome > 0 ? ((avgIncome - avgExpenses) / avgIncome) * 100 : 0;

  const recent = sorted.slice(-3);
  const older = sorted.slice(-6, -3);
  const recentAvg = recent.reduce((s, m) => s + (m.income - m.expenses), 0) / (recent.length || 1);
  const olderAvg = older.reduce((s, m) => s + (m.income - m.expenses), 0) / (older.length || 1);
  const trend = recentAvg > olderAvg * 1.05 ? "improving" : recentAvg < olderAvg * 0.95 ? "declining" : "stable";

  return { months: sorted, avg_income: avgIncome, avg_expenses: avgExpenses, avg_savings_rate: avgSavingsRate, trend };
}

export async function queryRecurring() {
  const txs = await getTransactions();
  const cats = await getCategories();
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c]));

  // Group by description prefix (first 20 chars, lowercased)
  const groups: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    if (tx.amount >= 0) continue;
    const key = tx.description.toLowerCase().replace(/[^a-z0-9 ]/g, "").substring(0, 24).trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }

  const recurring = Object.entries(groups)
    .filter(([, txs]) => txs.length >= 2)
    .map(([, txList]) => {
      const sorted = [...txList].sort((a, b) => a.date.localeCompare(b.date));
      const avgAmount = sorted.reduce((s, t) => s + Math.abs(t.amount), 0) / sorted.length;
      const cat = txList[0].category_id ? catMap[txList[0].category_id] : null;
      return {
        description: txList[0].description,
        amount_monthly: Math.round(avgAmount * 100) / 100,
        category: cat?.name ?? "Unknown",
        occurrences: sorted.length,
        last_date: sorted[sorted.length - 1].date,
      };
    })
    .sort((a, b) => b.amount_monthly - a.amount_monthly)
    .slice(0, 10);

  const total_monthly = recurring.reduce((s, r) => s + r.amount_monthly, 0);
  return { subscriptions: recurring, total_monthly: Math.round(total_monthly * 100) / 100 };
}

export async function queryHealthScore() {
  const [nw, cashflow, recurring] = await Promise.all([
    queryNetWorth(),
    queryCashflow(6),
    queryRecurring(),
  ]);

  const factors: { name: string; score: number; max: number; note: string }[] = [];

  // Savings rate (0–30 points)
  const savingsScore = Math.min(30, Math.round((cashflow.avg_savings_rate / 25) * 30));
  factors.push({ name: "Savings rate", score: savingsScore, max: 30, note: `${cashflow.avg_savings_rate.toFixed(1)}% avg over 6 months` });

  // Emergency fund (0–25 points) — months of expenses covered by liquid assets
  const liquidAccounts = await getAccounts().then((accs) => accs.filter((a) => ["checking", "savings"].includes(a.type)));
  const liquidBalance = liquidAccounts.reduce((s, a) => s + Math.max(0, a.manual_balance), 0);
  const monthsEmergency = cashflow.avg_expenses > 0 ? liquidBalance / cashflow.avg_expenses : 0;
  const emergencyScore = Math.min(25, Math.round((monthsEmergency / 6) * 25));
  factors.push({ name: "Emergency fund", score: emergencyScore, max: 25, note: `${monthsEmergency.toFixed(1)} months of expenses covered` });

  // Debt to income (0–25 points)
  const debtMonthly = nw.liabilities > 0 ? cashflow.avg_expenses * 0.4 : 0;
  const dtiRatio = cashflow.avg_income > 0 ? debtMonthly / cashflow.avg_income : 0;
  const dtiScore = Math.max(0, Math.round(25 - dtiRatio * 50));
  factors.push({ name: "Debt ratio", score: dtiScore, max: 25, note: `${(dtiRatio * 100).toFixed(0)}% debt-to-income ratio` });

  // Investment growth (0–20 points)
  const portfolio = await getPortfolio();
  const totalGainPct = portfolio.length > 0
    ? portfolio.reduce((s, h) => s + h.gain_pct, 0) / portfolio.length
    : 0;
  const investScore = Math.min(20, Math.round((totalGainPct / 20) * 20));
  factors.push({ name: "Portfolio growth", score: investScore, max: 20, note: `${totalGainPct.toFixed(1)}% avg holding gain` });

  const score = Math.min(100, factors.reduce((s, f) => s + f.score, 0));
  const rating = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Needs work";

  return { score, rating, factors };
}

export async function queryGoals() {
  const [goals, accounts] = await Promise.all([getGoals(), getAccounts()]);
  const accMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
  return goals.map((g) => {
    const linked = g.account_id ? accMap[g.account_id] : null;
    const current = linked ? Math.max(0, linked.manual_balance) : 0;
    const progress = g.target_amount > 0 ? Math.min(100, Math.round((current / g.target_amount) * 100)) : 0;
    return { ...g, current_amount: current, progress_pct: progress, account_name: linked?.name ?? null };
  });
}

export async function queryBudgetStatus(days = 30) {
  const [cats, txs] = await Promise.all([getCategories(), getTransactions()]);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const spent: Record<string, number> = {};
  for (const tx of txs) {
    if (tx.amount >= 0 || !tx.category_id || tx.date < cutoffStr) continue;
    spent[tx.category_id] = (spent[tx.category_id] || 0) + Math.abs(tx.amount);
  }
  return cats
    .filter((c) => c.type === "expense" && c.budget_monthly !== null)
    .map((c) => ({
      category_id: c.id,
      category: c.name,
      budget: c.budget_monthly!,
      spent: Math.round((spent[c.id] || 0) * 100) / 100,
      remaining: Math.round((c.budget_monthly! - (spent[c.id] || 0)) * 100) / 100,
      over_budget: (spent[c.id] || 0) > c.budget_monthly!,
      pct_used: c.budget_monthly! > 0 ? Math.round(((spent[c.id] || 0) / c.budget_monthly!) * 100) : 0,
    }));
}

export async function applyCategoryRules(description: string): Promise<string | null> {
  const rules = await getRules();
  for (const rule of rules) {
    try {
      if (new RegExp(rule.pattern, "i").test(description)) return rule.category_id;
    } catch { /* invalid regex */ }
  }
  return null;
}
