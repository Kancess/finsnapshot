import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "loan" | "investment" | "super" | "property";
  institution: string;
  manual_balance: number;
  currency: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
  source: "csv" | "manual";
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense" | "transfer";
  colour: string;
  budget_monthly: number | null;
}

export interface CategoryRule {
  id: string;
  pattern: string;
  category_id: string;
  priority: number;
  created_at: string;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  target_date: string;
  account_id: string | null;
  created_at: string;
}

export interface PortfolioHolding {
  id: string;
  ticker: string;
  name: string;
  units: number;
  price: number;
  value: number;
  gain: number;
  gain_pct: number;
  asset_class: "au-etf" | "intl-etf" | "au-shares" | "us-shares" | "other";
}

interface FinSnapDB extends DBSchema {
  accounts: { key: string; value: Account };
  transactions: {
    key: string;
    value: Transaction;
    indexes: { "by-account": string; "by-date": string; "by-category": string };
  };
  categories: { key: string; value: Category };
  rules: {
    key: string;
    value: CategoryRule;
    indexes: { "by-priority": number };
  };
  goals: { key: string; value: Goal };
  portfolio: { key: string; value: PortfolioHolding };
  meta: { key: string; value: { key: string; value: string } };
}

let dbPromise: Promise<IDBPDatabase<FinSnapDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FinSnapDB>("finsnap", 1, {
      upgrade(db) {
        db.createObjectStore("accounts", { keyPath: "id" });
        const txStore = db.createObjectStore("transactions", { keyPath: "id" });
        txStore.createIndex("by-account", "account_id");
        txStore.createIndex("by-date", "date");
        txStore.createIndex("by-category", "category_id");
        db.createObjectStore("categories", { keyPath: "id" });
        const rulesStore = db.createObjectStore("rules", { keyPath: "id" });
        rulesStore.createIndex("by-priority", "priority");
        db.createObjectStore("goals", { keyPath: "id" });
        db.createObjectStore("portfolio", { keyPath: "id" });
        db.createObjectStore("meta", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

const SEED_VERSION = "v3";

export async function isSeeded(): Promise<boolean> {
  const db = await getDB();
  const seeded = await db.get("meta", "seeded");
  return seeded?.value === SEED_VERSION;
}

export async function markSeeded() {
  const db = await getDB();
  await db.put("meta", { key: "seeded", value: SEED_VERSION });
}

// ---- ACCOUNTS ----
export async function getAccounts(): Promise<Account[]> {
  const db = await getDB();
  return db.getAll("accounts");
}
export async function putAccount(account: Account) {
  const db = await getDB();
  return db.put("accounts", account);
}
export async function deleteAccount(id: string) {
  const db = await getDB();
  return db.delete("accounts", id);
}

// ---- TRANSACTIONS ----
export async function getTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  const all = await db.getAll("transactions");
  return all.sort((a, b) => b.date.localeCompare(a.date));
}
export async function getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("transactions", "by-account", accountId);
  return all.sort((a, b) => b.date.localeCompare(a.date));
}
export async function putTransaction(tx: Transaction) {
  const db = await getDB();
  return db.put("transactions", tx);
}
export async function putTransactionsBulk(txs: Transaction[]) {
  const db = await getDB();
  const tx = db.transaction("transactions", "readwrite");
  await Promise.all([...txs.map((t) => tx.store.put(t)), tx.done]);
}
export async function deleteTransaction(id: string) {
  const db = await getDB();
  return db.delete("transactions", id);
}

// ---- CATEGORIES ----
export async function getCategories(): Promise<Category[]> {
  const db = await getDB();
  return db.getAll("categories");
}
export async function putCategory(cat: Category) {
  const db = await getDB();
  return db.put("categories", cat);
}
export async function deleteCategory(id: string) {
  const db = await getDB();
  return db.delete("categories", id);
}

// ---- RULES ----
export async function getRules(): Promise<CategoryRule[]> {
  const db = await getDB();
  const all = await db.getAll("rules");
  return all.sort((a, b) => a.priority - b.priority);
}
export async function putRule(rule: CategoryRule) {
  const db = await getDB();
  return db.put("rules", rule);
}
export async function deleteRule(id: string) {
  const db = await getDB();
  return db.delete("rules", id);
}

// ---- PORTFOLIO ----
export async function getPortfolio(): Promise<PortfolioHolding[]> {
  const db = await getDB();
  return db.getAll("portfolio");
}
export async function putHolding(h: PortfolioHolding) {
  const db = await getDB();
  return db.put("portfolio", h);
}

// ---- GOALS ----
export async function getGoals(): Promise<Goal[]> {
  const db = await getDB();
  return db.getAll("goals");
}
export async function putGoal(goal: Goal) {
  const db = await getDB();
  return db.put("goals", goal);
}
export async function deleteGoal(id: string) {
  const db = await getDB();
  return db.delete("goals", id);
}
