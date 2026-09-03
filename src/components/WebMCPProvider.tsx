"use client";

import { useEffect } from "react";
import { isSeeded, getAccounts, getTransactions, getPortfolio, getCategories, putGoal, putCategory, deleteGoal, putTransaction, putAccount } from "@/lib/db";
import type { Goal } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { queryNetWorth, queryCashflow, querySpendingByCategory, queryRecurring, queryHealthScore, queryGoals, queryBudgetStatus, queryFinancialBriefing, queryForecastCashflow, querySafeToSpend, applyCategoryRules } from "@/lib/queries";

export default function WebMCPProvider() {
  useEffect(() => {
    (async () => {
      const seeded = await isSeeded();
      if (!seeded) await seedDatabase();

      // Populate __finsnap_tools. The beforeInteractive shim pre-registers 14 tool stubs that
      // poll this object, so execution flows: extension → shim stub → __finsnap_tools → IndexedDB.
      // We never call modelContext.registerTool() here because the extension intercepts those calls
      // and tries to postMessage the full tool object (including execute functions) → DataCloneError.
      (window as unknown as { __finsnap_tools: Record<string, (args: unknown) => Promise<unknown>> }).__finsnap_tools = {
        get_net_worth: () => queryNetWorth(),
        get_accounts: (args) => {
          const { type } = (args as { type?: string }) ?? {};
          return getAccounts().then((accounts) => ({ accounts: type ? accounts.filter((a) => a.type === type) : accounts }));
        },
        get_transactions: async (args) => {
          const { days = 30, category_id, account_id, limit = 50 } = (args as { days?: number; category_id?: string; account_id?: string; limit?: number }) ?? {};
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          const cutoffStr = cutoff.toISOString().split("T")[0];
          let txs = await getTransactions();
          txs = txs.filter((t) => t.date >= cutoffStr);
          if (category_id) txs = txs.filter((t) => t.category_id === category_id);
          if (account_id) txs = txs.filter((t) => t.account_id === account_id);
          return { transactions: txs.slice(0, limit), total: txs.length };
        },
        get_spending_by_category: async (args) => {
          const { days = 30, compare_previous_period = false } = (args as { days?: number; compare_previous_period?: boolean }) ?? {};
          const current = await querySpendingByCategory(days);
          if (!compare_previous_period) return { categories: current, total_days: days };
          const previous = await querySpendingByCategory(days * 2);
          const prevMap = Object.fromEntries(previous.map((c) => [c.category_id, c.total]));
          return {
            categories: current.map((c) => {
              const prev = prevMap[c.category_id] ?? 0;
              const delta_pct = prev > 0 ? ((c.total - prev) / prev) * 100 : null;
              return { ...c, prev_total: prev, delta_pct: delta_pct ? Math.round(delta_pct * 10) / 10 : null };
            }),
            total_days: days,
          };
        },
        get_cashflow: (args) => {
          const { months = 6 } = (args as { months?: number }) ?? {};
          return queryCashflow(months);
        },
        get_portfolio: async (args) => {
          const { sort_by = "value" } = (args as { sort_by?: string }) ?? {};
          const holdings = await getPortfolio();
          const sorted = [...holdings].sort((a, b) => {
            if (sort_by === "gain_pct") return b.gain_pct - a.gain_pct;
            if (sort_by === "ticker") return a.ticker.localeCompare(b.ticker);
            return b.value - a.value;
          });
          const totalValue = sorted.reduce((s, h) => s + h.value, 0);
          const allocation = ["au-etf", "intl-etf", "au-shares", "us-shares", "other"].map((cls) => ({
            class: cls,
            value: sorted.filter((h) => h.asset_class === cls).reduce((s, h) => s + h.value, 0),
            pct: totalValue > 0 ? (sorted.filter((h) => h.asset_class === cls).reduce((s, h) => s + h.value, 0) / totalValue) * 100 : 0,
          }));
          const totalGainPct = sorted.length > 0 ? sorted.reduce((s, h) => s + h.gain_pct, 0) / sorted.length : 0;
          return { holdings: sorted, allocation, total_value: totalValue, total_gain_pct: Math.round(totalGainPct * 10) / 10 };
        },
        get_recurring_charges: () => queryRecurring(),
        get_financial_health_score: () => queryHealthScore(),
        get_goals: () => queryGoals(),
        get_budget_status: (args) => {
          const { days = 30 } = (args as { days?: number }) ?? {};
          return queryBudgetStatus(days);
        },
        set_goal: async (args) => {
          const { id, name, target_amount, target_date, account_id = null } = (args as { id?: string; name: string; target_amount: number; target_date: string; account_id?: string }) ?? {};
          const goal: Goal = { id: id ?? `g-${Date.now()}`, name, target_amount, target_date, account_id: account_id ?? null, created_at: new Date().toISOString() };
          await putGoal(goal);
          return { success: true, goal };
        },
        categorize_transaction: async (args) => {
          const { id, category_id } = (args as { id: string; category_id: string }) ?? {};
          const txs = await getTransactions();
          const tx = txs.find((t) => t.id === id);
          if (!tx) return { success: false, error: `Transaction ${id} not found` };
          await putTransaction({ ...tx, category_id });
          return { success: true, id, category_id };
        },
        add_transactions: async (args) => {
          const { transactions: incoming } = (args as { transactions: { date: string; description: string; amount: number; account_id: string; category_id?: string }[] }) ?? {};
          const results = await Promise.all(
            incoming.map(async (t, i) => {
              const category_id = t.category_id ?? (await applyCategoryRules(t.description));
              const tx = { id: `import-${Date.now()}-${i}`, date: t.date, description: t.description, amount: t.amount, account_id: t.account_id, category_id: category_id ?? null, source: "manual" as const, created_at: new Date().toISOString() };
              await putTransaction(tx);
              return { id: tx.id, category_id: tx.category_id, auto_categorized: !t.category_id && !!category_id };
            })
          );
          return { imported: results.length, auto_categorized: results.filter((r) => r.auto_categorized).length, uncategorized: results.filter((r) => !r.category_id).length, transactions: results };
        },
        set_account_balance: async (args) => {
          const { account_id, balance } = (args as { account_id: string; balance: number }) ?? {};
          const accounts = await getAccounts();
          const account = accounts.find((a) => a.id === account_id);
          if (!account) return { success: false, error: `Account ${account_id} not found` };
          await putAccount({ ...account, manual_balance: balance });
          return { success: true, account_id, balance };
        },
        delete_goal: async (args) => {
          const { id } = (args as { id: string }) ?? {};
          if (!id) return { success: false, error: "id is required" };
          await deleteGoal(id);
          return { success: true, id };
        },
        set_budget: async (args) => {
          const { category_id, budget_monthly } = (args as { category_id: string; budget_monthly: number | null }) ?? {};
          const cats = await getCategories();
          const cat = cats.find((c) => c.id === category_id);
          if (!cat) return { success: false, error: `Category ${category_id} not found` };
          await putCategory({ ...cat, budget_monthly: budget_monthly ?? null });
          return { success: true, category_id, budget_monthly: budget_monthly ?? null };
        },
        get_financial_briefing: () => queryFinancialBriefing(),
        forecast_cashflow: (args) => {
          const { months = 3 } = (args as { months?: number }) ?? {};
          return queryForecastCashflow(months);
        },
        calculate_safe_to_spend: () => querySafeToSpend(),
      };
    })();
  }, []);

  return null;
}
