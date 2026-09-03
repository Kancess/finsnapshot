import { putAccount, putTransaction, putCategory, putRule, putHolding, putGoal, markSeeded } from "./db";
import type { Account, Transaction, Category, CategoryRule, PortfolioHolding, Goal } from "./db";

const now = new Date("2026-09-03");
function daysAgo(n: number) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

const defaultCategories: Category[] = [
  { id: "income",        name: "Income",        type: "income",   colour: "#1e8a56", budget_monthly: null },
  { id: "groceries",     name: "Groceries",     type: "expense",  colour: "#b8872a", budget_monthly: 600 },
  { id: "dining",        name: "Dining",        type: "expense",  colour: "#a63446", budget_monthly: 250 },
  { id: "transport",     name: "Transport",     type: "expense",  colour: "#4b607d", budget_monthly: 300 },
  { id: "utilities",     name: "Utilities",     type: "expense",  colour: "#8fa1b8", budget_monthly: 1000 },
  { id: "shopping",      name: "Shopping",      type: "expense",  colour: "#c47a2a", budget_monthly: 500 },
  { id: "health",        name: "Health",        type: "expense",  colour: "#2a7ac4", budget_monthly: 300 },
  { id: "travel",        name: "Travel",        type: "expense",  colour: "#7a2ac4", budget_monthly: null },
  { id: "subscriptions", name: "Subscriptions", type: "expense",  colour: "#c42a7a", budget_monthly: 100 },
  { id: "mortgage",      name: "Mortgage",      type: "expense",  colour: "#2ac47a", budget_monthly: null },
  { id: "super",         name: "Super",         type: "transfer", colour: "#7ac42a", budget_monthly: null },
  { id: "transfer",      name: "Transfer",      type: "transfer", colour: "#9daec2", budget_monthly: null },
];

const defaultRules: CategoryRule[] = [
  { id: "r1",  pattern: "(?i)salary|payroll|versent",                  category_id: "income",        priority: 1,  created_at: now.toISOString() },
  { id: "r2",  pattern: "(?i)interest.*saving|saving.*interest",       category_id: "income",        priority: 2,  created_at: now.toISOString() },
  { id: "r3",  pattern: "(?i)coles|woolworths|aldi|iga|harris farm",   category_id: "groceries",     priority: 3,  created_at: now.toISOString() },
  { id: "r4",  pattern: "(?i)uber eats|doordash|menulog|deliveroo",    category_id: "dining",        priority: 4,  created_at: now.toISOString() },
  { id: "r5",  pattern: "(?i)restaurant|cafe|nando|mcdonald|kfc",      category_id: "dining",        priority: 5,  created_at: now.toISOString() },
  { id: "r6",  pattern: "(?i)opal|uber(?! eats)|taxi|parking|petrol|bp|shell|caltex", category_id: "transport", priority: 6, created_at: now.toISOString() },
  { id: "r7",  pattern: "(?i)agl|origin|sydeny water|council|telstra|optus|tpg",      category_id: "utilities", priority: 7, created_at: now.toISOString() },
  { id: "r8",  pattern: "(?i)netflix|spotify|apple|amazon prime|disney",              category_id: "subscriptions", priority: 8, created_at: now.toISOString() },
  { id: "r9",  pattern: "(?i)home loan|mortgage|repayment",            category_id: "mortgage",      priority: 9,  created_at: now.toISOString() },
  { id: "r10", pattern: "(?i)jb hi-fi|kmart|target|myer|david jones|amazon(?! prime)|ebay", category_id: "shopping", priority: 10, created_at: now.toISOString() },
  { id: "r11", pattern: "(?i)medicare|chemist|pharmacy|doctor|hospital|fitness|gym",  category_id: "health",   priority: 11, created_at: now.toISOString() },
  { id: "r12", pattern: "(?i)qantas|jetstar|virgin|airbnb|hotel|booking",             category_id: "travel",   priority: 12, created_at: now.toISOString() },
  { id: "r13", pattern: "(?i)australiansuper|superannuation",          category_id: "super",         priority: 13, created_at: now.toISOString() },
  { id: "r14", pattern: "(?i)dan murphy|bws|bottle",                   category_id: "dining",        priority: 14, created_at: now.toISOString() },
];

const accounts: Account[] = [
  { id: "cba-everyday", name: "CommBank Everyday",     type: "checking",   institution: "Commonwealth Bank", manual_balance: 12450,   currency: "AUD", created_at: now.toISOString() },
  { id: "ing-savings",  name: "ING Savings Maximiser", type: "savings",    institution: "ING",               manual_balance: 28900,   currency: "AUD", created_at: now.toISOString() },
  { id: "cba-credit",   name: "CommBank Credit Card",  type: "credit",     institution: "Commonwealth Bank", manual_balance: -2340,   currency: "AUD", created_at: now.toISOString() },
  { id: "nab-homeloan", name: "NAB Home Loan",         type: "loan",       institution: "NAB",               manual_balance: -385000, currency: "AUD", created_at: now.toISOString() },
  { id: "commsec",      name: "CommSec Brokerage",     type: "investment", institution: "CommSec",           manual_balance: 47240,   currency: "AUD", created_at: now.toISOString() },
  { id: "aus-super",    name: "AustralianSuper",        type: "super",      institution: "AustralianSuper",   manual_balance: 89400,   currency: "AUD", created_at: now.toISOString() },
  { id: "property",     name: "Sydney Property",        type: "property",   institution: "Estimated value",   manual_balance: 920000,  currency: "AUD", created_at: now.toISOString() },
];

const transactions: Transaction[] = [
  { id: "t1",  date: daysAgo(0),  description: "Salary — Versent",           amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t2",  date: daysAgo(0),  description: "Coles Supermarket",          amount: -127.40, category_id: "groceries",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t3",  date: daysAgo(1),  description: "Uber Eats — Thai House",     amount: -42.50,  category_id: "dining",        account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t4",  date: daysAgo(2),  description: "Sydney Water",               amount: -88.00,  category_id: "utilities",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t5",  date: daysAgo(2),  description: "Opal Card top-up",           amount: -50.00,  category_id: "transport",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t6",  date: daysAgo(3),  description: "Netflix",                    amount: -22.99,  category_id: "subscriptions", account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t7",  date: daysAgo(3),  description: "Woolworths",                 amount: -94.30,  category_id: "groceries",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t8",  date: daysAgo(4),  description: "Nando's — Surry Hills",      amount: -38.00,  category_id: "dining",        account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t9",  date: daysAgo(5),  description: "AGL Energy",                 amount: -145.00, category_id: "utilities",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t10", date: daysAgo(5),  description: "Spotify",                    amount: -11.99,  category_id: "subscriptions", account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t11", date: daysAgo(6),  description: "Freelance — Design work",    amount: 1200.00, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t12", date: daysAgo(7),  description: "JB Hi-Fi — Headphones",      amount: -349.00, category_id: "shopping",      account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t13", date: daysAgo(8),  description: "Uber",                       amount: -24.50,  category_id: "transport",     account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t14", date: daysAgo(9),  description: "Dan Murphy's",               amount: -65.00,  category_id: "dining",        account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t15", date: daysAgo(10), description: "Coles Supermarket",          amount: -112.80, category_id: "groceries",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t16", date: daysAgo(11), description: "Airbnb — Melbourne trip",    amount: -420.00, category_id: "travel",        account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t17", date: daysAgo(12), description: "Interest — ING Savings",     amount: 98.42,   category_id: "income",        account_id: "ing-savings",  source: "csv", created_at: now.toISOString() },
  { id: "t18", date: daysAgo(13), description: "Kmart",                      amount: -67.00,  category_id: "shopping",      account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t19", date: daysAgo(14), description: "Fitness First membership",   amount: -79.00,  category_id: "health",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t20", date: daysAgo(15), description: "Medicare refund",            amount: 45.20,   category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t21", date: daysAgo(16), description: "NAB Home Loan repayment",    amount: -2150.00,category_id: "mortgage",      account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t22", date: daysAgo(17), description: "Salary — Versent",           amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t23", date: daysAgo(18), description: "Council rates",              amount: -387.00, category_id: "utilities",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t24", date: daysAgo(19), description: "Dining — Porteño",           amount: -145.00, category_id: "dining",        account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t25", date: daysAgo(20), description: "Amazon AU",                  amount: -89.00,  category_id: "shopping",      account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t26", date: daysAgo(21), description: "Petrol — BP",                amount: -92.00,  category_id: "transport",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t27", date: daysAgo(22), description: "Woolworths",                 amount: -101.50, category_id: "groceries",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t28", date: daysAgo(25), description: "Qantas — Flight SYD-MEL",   amount: -320.00, category_id: "travel",        account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t29", date: daysAgo(28), description: "Salary — Versent",           amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t30", date: daysAgo(30), description: "AustralianSuper contribution",amount: -520.83,category_id: "super",         account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  // Older months
  { id: "t31", date: daysAgo(35), description: "Salary — Versent",           amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t32", date: daysAgo(38), description: "Coles Supermarket",          amount: -118.50, category_id: "groceries",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t33", date: daysAgo(40), description: "Netflix",                    amount: -22.99,  category_id: "subscriptions", account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t34", date: daysAgo(42), description: "NAB Home Loan repayment",    amount: -2150.00,category_id: "mortgage",      account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t35", date: daysAgo(45), description: "Salary — Versent",           amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t36", date: daysAgo(50), description: "Woolworths",                 amount: -97.40,  category_id: "groceries",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t37", date: daysAgo(55), description: "Interest — ING Savings",     amount: 98.42,   category_id: "income",        account_id: "ing-savings",  source: "csv", created_at: now.toISOString() },
  { id: "t38", date: daysAgo(60), description: "Salary — Versent",           amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t39", date: daysAgo(62), description: "AGL Energy",                 amount: -138.50, category_id: "utilities",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t40", date: daysAgo(65), description: "Uber Eats",                  amount: -36.00,  category_id: "dining",        account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t41", date: daysAgo(70), description: "Salary — Versent",           amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t42", date: daysAgo(72), description: "NAB Home Loan repayment",    amount: -2150.00,category_id: "mortgage",      account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t43", date: daysAgo(75), description: "Coles Supermarket",          amount: -109.80, category_id: "groceries",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t44", date: daysAgo(80), description: "Freelance — Design work",    amount: 800.00,  category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t45", date: daysAgo(85), description: "Salary — Versent",           amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t46", date: daysAgo(88), description: "Interest — ING Savings",     amount: 98.42,   category_id: "income",        account_id: "ing-savings",  source: "csv", created_at: now.toISOString() },
  { id: "t47", date: daysAgo(90), description: "Netflix",                    amount: -22.99,  category_id: "subscriptions", account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t48", date: daysAgo(90), description: "Spotify",                    amount: -11.99,  category_id: "subscriptions", account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t49", date: daysAgo(92), description: "NAB Home Loan repayment",    amount: -2150.00,category_id: "mortgage",      account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t50", date: daysAgo(95), description: "Salary — Versent",           amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  // April 2026 — 6th month for cashflow
  { id: "t51", date: daysAgo(128), description: "Salary — Versent",          amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t52", date: daysAgo(130), description: "NAB Home Loan repayment",   amount: -2150.00,category_id: "mortgage",      account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t53", date: daysAgo(133), description: "Woolworths",                amount: -103.60, category_id: "groceries",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t54", date: daysAgo(140), description: "Salary — Versent",          amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t55", date: daysAgo(142), description: "AGL Energy",                amount: -141.00, category_id: "utilities",     account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t56", date: daysAgo(150), description: "Salary — Versent",          amount: 4833.33, category_id: "income",        account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t57", date: daysAgo(152), description: "NAB Home Loan repayment",   amount: -2150.00,category_id: "mortgage",      account_id: "cba-everyday", source: "csv", created_at: now.toISOString() },
  { id: "t58", date: daysAgo(154), description: "Uber Eats",                 amount: -39.50,  category_id: "dining",        account_id: "cba-credit",   source: "csv", created_at: now.toISOString() },
  { id: "t59", date: daysAgo(155), description: "Interest — ING Savings",    amount: 98.42,   category_id: "income",        account_id: "ing-savings",  source: "csv", created_at: now.toISOString() },
];

const portfolio: PortfolioHolding[] = [
  { id: "vas",  ticker: "VAS",  name: "Vanguard Aus Shares ETF",  units: 120, price: 104.20, value: 12504, gain: 1850,  gain_pct: 17.4, asset_class: "au-etf" },
  { id: "vgs",  ticker: "VGS",  name: "Vanguard Intl Shares ETF", units: 85,  price: 135.80, value: 11543, gain: 2210,  gain_pct: 23.7, asset_class: "intl-etf" },
  { id: "bhp",  ticker: "BHP",  name: "BHP Group",                units: 200, price: 43.15,  value: 8630,  gain: -320,  gain_pct: -3.6, asset_class: "au-shares" },
  { id: "csl",  ticker: "CSL",  name: "CSL Limited",              units: 15,  price: 298.40, value: 4476,  gain: 780,   gain_pct: 21.1, asset_class: "au-shares" },
  { id: "cba2", ticker: "CBA",  name: "CommBank",                 units: 12,  price: 131.25, value: 1575,  gain: 245,   gain_pct: 18.4, asset_class: "au-shares" },
  { id: "msft", ticker: "MSFT", name: "Microsoft Corp",           units: 8,   price: 515.00, value: 5760,  gain: 1240,  gain_pct: 27.5, asset_class: "us-shares" },
  { id: "aapl", ticker: "AAPL", name: "Apple Inc",                units: 10,  price: 245.80, value: 2752,  gain: 390,   gain_pct: 16.5, asset_class: "us-shares" },
];

const goals: Goal[] = [
  { id: "g1", name: "Emergency Fund",              target_amount: 20000,  target_date: "2026-12-31", account_id: "ing-savings", created_at: now.toISOString() },
  { id: "g2", name: "Japan Holiday",               target_amount: 8000,   target_date: "2027-03-31", account_id: null,          created_at: "2026-01-01T00:00:00.000Z" },
  { id: "g3", name: "Investment Property Deposit", target_amount: 120000, target_date: "2028-06-30", account_id: null,          created_at: "2024-07-01T00:00:00.000Z" },
];

export async function seedDatabase() {
  await Promise.all(defaultCategories.map(putCategory));
  await Promise.all(defaultRules.map(putRule));
  await Promise.all(accounts.map(putAccount));
  await Promise.all(transactions.map(putTransaction));
  await Promise.all(portfolio.map(putHolding));
  await Promise.all(goals.map(putGoal));
  await markSeeded();
}
