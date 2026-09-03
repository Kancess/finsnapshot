"use client";

import { useEffect } from "react";
import Script from "next/script";

// Registers all 19 FinSnap tools with Jason McGhee's WebMCP library (webmcp.dev).
// This creates the blue widget and WebSocket bridge that lets Claude Desktop (and other
// MCP clients) call tools directly via: npx @jason.today/webmcp@latest --config claude
export default function WebMCPBridge() {
  function initWebMCP() {
    const W = (window as any).WebMCP;
    if (!W || (window as any).__finsnap_webmcp_init) return;
    (window as any).__finsnap_webmcp_init = true;

    const mcp = new W({ color: "#103766", position: "bottom-right", size: "32px", padding: "20px" });

    function tool(result: unknown) {
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }

    async function callTool(name: string, args: unknown) {
      const tools = (window as any).__finsnap_tools;
      if (!tools?.[name]) throw new Error(`FinSnap not ready — reload the page`);
      return tool(await tools[name](args ?? {}));
    }

    const defs: [string, string, object][] = [
      ["get_net_worth", "Get total net worth — assets, liabilities, and breakdown by account type.", {}],
      ["get_accounts", "Get all financial accounts with current balances, filterable by type.", {
        type: { type: "string", enum: ["checking", "savings", "credit", "loan", "investment", "super", "property"] },
      }],
      ["get_transactions", "Get recent transactions, filterable by category, account, or date range.", {
        days: { type: "number" }, category_id: { type: "string" }, account_id: { type: "string" }, limit: { type: "number" },
      }],
      ["get_spending_by_category", "Get spending breakdown by category over any period, with optional period comparison.", {
        days: { type: "number" }, compare_previous_period: { type: "boolean" },
      }],
      ["get_cashflow", "Get monthly income vs expenses and savings rate trend.", {
        months: { type: "number" },
      }],
      ["get_portfolio", "Get investment portfolio holdings, allocation, and gain/loss.", {
        sort_by: { type: "string", enum: ["value", "gain_pct", "ticker"] },
      }],
      ["get_recurring_charges", "Detect recurring transactions — subscriptions and regular bills over 90 days.", {}],
      ["get_financial_health_score", "Get a 0–100 financial health score with factor breakdown.", {}],
      ["get_goals", "Get financial goals with current progress percentage toward each target.", {}],
      ["get_budget_status", "Compare actual spending to monthly budgets by category for the last N days.", {
        days: { type: "number" },
      }],
      ["set_goal", "Create or update a financial goal. Provide an id to update an existing goal.", {
        id: { type: "string" }, name: { type: "string" }, target_amount: { type: "number" },
        target_date: { type: "string" }, account_id: { type: "string" },
      }],
      ["categorize_transaction", "Update the category of a transaction by id.", {
        id: { type: "string" }, category_id: { type: "string" },
      }],
      ["add_transactions", "Bulk-import transactions from a bank statement. Auto-categorises when category_id is omitted.", {
        transactions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" }, description: { type: "string" },
              amount: { type: "number" }, account_id: { type: "string" }, category_id: { type: "string" },
            },
            required: ["date", "description", "amount", "account_id"],
          },
        },
      }],
      ["set_account_balance", "Update an account balance after importing a bank statement.", {
        account_id: { type: "string" }, balance: { type: "number" },
      }],
      ["delete_goal", "Delete a financial goal by id.", { id: { type: "string" } }],
      ["set_budget", "Set or update the monthly budget for a spending category.", {
        category_id: { type: "string" }, budget_monthly: { type: "number" },
      }],
      ["get_financial_briefing", "Get a complete financial briefing in one call — net worth, cashflow, health, goals, alerts.", {}],
      ["forecast_cashflow", "Project future monthly cashflow based on historical averages and trend.", {
        months: { type: "number" },
      }],
      ["calculate_safe_to_spend", "Calculate how much is safely available to spend this month based on remaining budget.", {}],
    ];

    for (const [name, desc, schema] of defs) {
      mcp.registerTool(name, desc, schema, (args: unknown) => callTool(name, args));
    }
  }

  useEffect(() => {
    // webmcp.js may already be loaded (Script component fires onLoad), but call anyway in case
    // the Script loaded before this effect ran.
    initWebMCP();
  }, []);

  return (
    <Script
      src="/webmcp.js"
      strategy="afterInteractive"
      onLoad={initWebMCP}
    />
  );
}
