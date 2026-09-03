# FinSnap

Personal finance dashboard built as a financial context layer for AI agents. Exposes 19 WebMCP tools via `document.modelContext` so any compatible AI agent gets immediate, structured access to your complete financial picture — net worth, cash flow, goals, portfolio, budgets, and planning tools.

**Live demo:** [webmcp-vert.vercel.app](https://webmcp-vert.vercel.app)

Built for the [WebMCP Challenge](https://webmcp.devpost.com).

---

## Using with an AI agent

### ChatGPT (recommended)

1. Open ChatGPT desktop (Work plan)
2. Start a conversation and click the globe/browser icon to open the in-app browser
3. Navigate to [webmcp-vert.vercel.app](https://webmcp-vert.vercel.app)
4. The "Site tools" badge appears — 19 tools are now available to ChatGPT

Try asking: *"Give me a complete financial briefing"* or *"I want to buy a property in Sydney — based on my finances, what can I realistically afford?"*

### Chrome (native WebMCP flag)

1. Open `chrome://flags/#enable-webmcp-testing` and enable it
2. Restart Chrome and navigate to the live URL
3. Open DevTools to see `document.modelContext` registered with 19 tools

### Claude Desktop (via WebMCP bridge)

1. Run `npx @jason.today/webmcp@latest --config claude` and restart Claude Desktop
2. Navigate to the live URL in your browser
3. Click the blue widget (bottom-right) and paste the token Claude generates
4. Ask Claude anything about your finances

---

## WebMCP tools (19)

### Read
| Tool | Description |
|------|-------------|
| `get_net_worth` | Total assets, liabilities, and breakdown by account type |
| `get_accounts` | All accounts with balances, filterable by type |
| `get_transactions` | Recent transactions, filterable by category, account, date range |
| `get_spending_by_category` | Spending breakdown by category with optional period comparison |
| `get_cashflow` | Monthly income vs expenses and savings rate trend |
| `get_portfolio` | Investment holdings, allocation, and gain/loss |
| `get_recurring_charges` | Detected subscriptions and regular bills over 90 days |
| `get_financial_health_score` | 0-100 health score with factor breakdown |
| `get_goals` | Financial goals with current progress |
| `get_budget_status` | Actual spending vs monthly budget per category |

### Write
| Tool | Description |
|------|-------------|
| `set_goal` | Create or update a financial goal |
| `delete_goal` | Remove a goal by id |
| `set_budget` | Set monthly budget for a spending category |
| `categorize_transaction` | Update the category of a transaction |
| `add_transactions` | Bulk-import transactions with auto-categorisation |
| `set_account_balance` | Reconcile an account balance |

### Planning
| Tool | Description |
|------|-------------|
| `get_financial_briefing` | Full picture in one call: net worth, cash flow, health, goals, alerts |
| `forecast_cashflow` | Project monthly cash flow N months forward from 6-month averages |
| `calculate_safe_to_spend` | Remaining discretionary budget and daily spending rate |

The manifest is available at `/.well-known/webmcp`.

---

## Architecture

- **Next.js 16** App Router
- **WebMCP shim** injected synchronously in `<head>` via `dangerouslySetInnerHTML` — runs before React hydrates so `document.modelContext` is available immediately
- **IndexedDB** via the `idb` library across 6 stores (accounts, transactions, categories, goals, portfolio, settings) — prototype data layer; replace with open banking APIs or CSV import for production
- **Recharts** for visualisations
- **Vercel** deployment via GitHub CI/CD

---

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The database seeds automatically on first load.

---

## Licence

MIT
