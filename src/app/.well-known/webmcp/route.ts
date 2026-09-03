import { NextResponse } from "next/server";

const TOOLS = [
  {
    name: "get_net_worth",
    description: "Get total net worth — assets, liabilities, and breakdown by account type.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_accounts",
    description: "Get all financial accounts with current balances, filterable by type.",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string", enum: ["checking", "savings", "credit", "loan", "investment", "super", "property"] } },
    },
  },
  {
    name: "get_transactions",
    description: "Get recent transactions, filterable by category, account, or date range.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number" },
        category_id: { type: "string" },
        account_id: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_spending_by_category",
    description: "Get spending breakdown by category over any period, with optional period comparison.",
    inputSchema: {
      type: "object",
      properties: { days: { type: "number" }, compare_previous_period: { type: "boolean" } },
    },
  },
  {
    name: "get_cashflow",
    description: "Get monthly income vs expenses and savings rate trend.",
    inputSchema: { type: "object", properties: { months: { type: "number" } } },
  },
  {
    name: "get_portfolio",
    description: "Get investment portfolio holdings, allocation, and gain/loss.",
    inputSchema: {
      type: "object",
      properties: { sort_by: { type: "string", enum: ["value", "gain_pct", "ticker"] } },
    },
  },
  {
    name: "get_recurring_charges",
    description: "Detect recurring transactions — subscriptions and regular bills over 90 days.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_financial_health_score",
    description: "Get a 0–100 financial health score with factor breakdown.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_goals",
    description: "Get financial goals with current progress percentage toward each target.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_budget_status",
    description: "Compare actual spending to monthly budgets by category for the last N days.",
    inputSchema: { type: "object", properties: { days: { type: "number" } } },
  },
  {
    name: "set_goal",
    description: "Create or update a financial goal. Provide an id to update an existing goal.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        target_amount: { type: "number" },
        target_date: { type: "string" },
        account_id: { type: "string" },
      },
      required: ["name", "target_amount", "target_date"],
    },
  },
  {
    name: "categorize_transaction",
    description: "Update the category of a transaction by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, category_id: { type: "string" } },
      required: ["id", "category_id"],
    },
  },
  {
    name: "add_transactions",
    description: "Bulk-import transactions (e.g. from a bank statement). Auto-categorises using stored rules if category_id is omitted.",
    inputSchema: {
      type: "object",
      properties: {
        transactions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              description: { type: "string" },
              amount: { type: "number" },
              account_id: { type: "string" },
              category_id: { type: "string" },
            },
            required: ["date", "description", "amount", "account_id"],
          },
        },
      },
      required: ["transactions"],
    },
  },
  {
    name: "set_account_balance",
    description: "Update the balance of an account (use after importing a bank statement to reconcile).",
    inputSchema: {
      type: "object",
      properties: { account_id: { type: "string" }, balance: { type: "number" } },
      required: ["account_id", "balance"],
    },
  },
];

export async function GET() {
  return NextResponse.json(
    {
      version: "1.0",
      name: "FinSnapshot",
      description: "Personal finance dashboard — query your complete financial picture via WebMCP. Tools execute against IndexedDB data stored in your browser.",
      tools: TOOLS,
    },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
