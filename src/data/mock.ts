export const accounts = [
  { id: "cba-everyday",    name: "CommBank Everyday",      type: "checking",  balance: 12450.00,    currency: "AUD", institution: "Commonwealth Bank" },
  { id: "ing-savings",     name: "ING Savings Maximiser",  type: "savings",   balance: 28900.00,    currency: "AUD", institution: "ING" },
  { id: "cba-credit",      name: "CommBank Credit Card",   type: "credit",    balance: -2340.00,    currency: "AUD", institution: "Commonwealth Bank" },
  { id: "nab-homeloan",    name: "NAB Home Loan",          type: "loan",      balance: -385000.00,  currency: "AUD", institution: "NAB" },
  { id: "commsec",         name: "CommSec Brokerage",      type: "investment",balance: 34750.00,    currency: "AUD", institution: "CommSec" },
  { id: "aus-super",       name: "AustralianSuper",        type: "super",     balance: 89400.00,    currency: "AUD", institution: "AustralianSuper" },
  { id: "property",        name: "Sydney Property",        type: "property",  balance: 920000.00,   currency: "AUD", institution: "Estimated value" },
];

export const portfolio = [
  { ticker: "VAS",   name: "Vanguard Aus Shares ETF",   units: 120,  price: 104.20, value: 12504.00, gain: 1850.00,  gainPct: 17.4 },
  { ticker: "VGS",   name: "Vanguard Intl Shares ETF",  units: 85,   price: 135.80, value: 11543.00, gain: 2210.00,  gainPct: 23.7 },
  { ticker: "BHP",   name: "BHP Group",                 units: 200,  price: 43.15,  value: 8630.00,  gain: -320.00,  gainPct: -3.6 },
  { ticker: "CSL",   name: "CSL Limited",               units: 15,   price: 298.40, value: 4476.00,  gain: 780.00,   gainPct: 21.1 },
  { ticker: "CBA",   name: "CommBank",                  units: 12,   price: 131.25, value: 1575.00,  gain: 245.00,   gainPct: 18.4 },
  { ticker: "MSFT",  name: "Microsoft Corp",            units: 8,    price: 515.00, value: 5760.00,  gain: 1240.00,  gainPct: 27.5 },
  { ticker: "AAPL",  name: "Apple Inc",                 units: 10,   price: 245.80, value: 2752.00,  gain: 390.00,   gainPct: 16.5 },
];

const today = new Date("2026-09-03");
function daysAgo(n: number) {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export const transactions = [
  { id: "t1",  date: daysAgo(0),  description: "Coles Supermarket",          category: "Groceries",    amount: -127.40, account: "cba-everyday" },
  { id: "t2",  date: daysAgo(0),  description: "Salary — Versent",           category: "Income",       amount: 4833.33, account: "cba-everyday" },
  { id: "t3",  date: daysAgo(1),  description: "Uber Eats — Thai House",     category: "Dining",       amount: -42.50,  account: "cba-credit"  },
  { id: "t4",  date: daysAgo(2),  description: "Sydney Water",               category: "Utilities",    amount: -88.00,  account: "cba-everyday" },
  { id: "t5",  date: daysAgo(2),  description: "Opal Card top-up",           category: "Transport",    amount: -50.00,  account: "cba-everyday" },
  { id: "t6",  date: daysAgo(3),  description: "Netflix",                    category: "Subscriptions",amount: -22.99,  account: "cba-credit"  },
  { id: "t7",  date: daysAgo(3),  description: "Woolworths",                 category: "Groceries",    amount: -94.30,  account: "cba-everyday" },
  { id: "t8",  date: daysAgo(4),  description: "Nando's — Surry Hills",      category: "Dining",       amount: -38.00,  account: "cba-credit"  },
  { id: "t9",  date: daysAgo(5),  description: "AGL Energy",                 category: "Utilities",    amount: -145.00, account: "cba-everyday" },
  { id: "t10", date: daysAgo(5),  description: "Spotify",                    category: "Subscriptions",amount: -11.99,  account: "cba-credit"  },
  { id: "t11", date: daysAgo(6),  description: "Freelance — Design work",    category: "Income",       amount: 1200.00, account: "cba-everyday" },
  { id: "t12", date: daysAgo(7),  description: "JB Hi-Fi — Headphones",      category: "Shopping",     amount: -349.00, account: "cba-credit"  },
  { id: "t13", date: daysAgo(8),  description: "Uber",                       category: "Transport",    amount: -24.50,  account: "cba-credit"  },
  { id: "t14", date: daysAgo(9),  description: "Dan Murphy's",               category: "Dining",       amount: -65.00,  account: "cba-credit"  },
  { id: "t15", date: daysAgo(10), description: "Coles Supermarket",          category: "Groceries",    amount: -112.80, account: "cba-everyday" },
  { id: "t16", date: daysAgo(11), description: "Airbnb — Melbourne trip",    category: "Travel",       amount: -420.00, account: "cba-credit"  },
  { id: "t17", date: daysAgo(12), description: "Interest — ING Savings",     category: "Income",       amount: 98.42,   account: "ing-savings" },
  { id: "t18", date: daysAgo(13), description: "Kmart",                      category: "Shopping",     amount: -67.00,  account: "cba-credit"  },
  { id: "t19", date: daysAgo(14), description: "Fitness First membership",   category: "Health",       amount: -79.00,  account: "cba-everyday" },
  { id: "t20", date: daysAgo(15), description: "Medicare refund",            category: "Health",       amount: 45.20,   account: "cba-everyday" },
  { id: "t21", date: daysAgo(16), description: "NAB Home Loan repayment",    category: "Mortgage",     amount: -2150.00,account: "cba-everyday" },
  { id: "t22", date: daysAgo(17), description: "Salary — Versent",           category: "Income",       amount: 4833.33, account: "cba-everyday" },
  { id: "t23", date: daysAgo(18), description: "Council rates",              category: "Utilities",    amount: -387.00, account: "cba-everyday" },
  { id: "t24", date: daysAgo(19), description: "Dining — Porteño",           category: "Dining",       amount: -145.00, account: "cba-credit"  },
  { id: "t25", date: daysAgo(20), description: "Amazon AU",                  category: "Shopping",     amount: -89.00,  account: "cba-credit"  },
  { id: "t26", date: daysAgo(21), description: "Petrol — BP",                category: "Transport",    amount: -92.00,  account: "cba-everyday" },
  { id: "t27", date: daysAgo(22), description: "Woolworths",                 category: "Groceries",    amount: -101.50, account: "cba-everyday" },
  { id: "t28", date: daysAgo(25), description: "Qantas — Flight SYD-MEL",   category: "Travel",       amount: -320.00, account: "cba-credit"  },
  { id: "t29", date: daysAgo(28), description: "Salary — Versent",           category: "Income",       amount: 4833.33, account: "cba-everyday" },
  { id: "t30", date: daysAgo(30), description: "AustralianSuper contribution",category: "Super",       amount: -520.83, account: "cba-everyday" },
];

export const cashflow = [
  { month: "Apr 2026", income: 6131.75, expenses: 4820.40 },
  { month: "May 2026", income: 5931.75, expenses: 5210.80 },
  { month: "Jun 2026", income: 7131.75, expenses: 4680.20 },
  { month: "Jul 2026", income: 5931.75, expenses: 6120.50 },
  { month: "Aug 2026", income: 6131.75, expenses: 4990.30 },
  { month: "Sep 2026", income: 5931.75, expenses: 3240.80 },
];

export function getNetWorth() {
  const assets = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const liabilities = accounts.filter(a => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
  return { assets, liabilities, netWorth: assets - liabilities };
}

export function getSpendingByCategory(days = 30) {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  const filtered = transactions.filter(t => t.amount < 0 && new Date(t.date) >= cutoff);
  const map: Record<string, number> = {};
  for (const t of filtered) {
    map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
  }
  return Object.entries(map)
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}
