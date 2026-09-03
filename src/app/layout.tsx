import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import WebMCPProvider from "@/components/WebMCPProvider";
import WebMCPBridge from "@/components/WebMCPBridge";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FinSnap — Your finances, agent-ready",
  description: "Personal finance dashboard with 19 WebMCP tools. Any AI agent browsing the page gets immediate access to your net worth, cash flow, goals, portfolio, and planning tools — no setup required.",
};

// Shim: install document.modelContext (WebMCP spec) if browser doesn't have it natively.
// WebMCPProvider replaces stub execute functions with real IndexedDB-backed ones after seeding.
// Works in three environments:
//   1. Chrome with chrome://flags/#enable-webmcp-testing → native document.modelContext, we call registerTool() on it
//   2. WebMCP Inspector extension → extension provides document.modelContext, we call registerTool() on it
//   3. No WebMCP support → we install our own shim, then call registerTool() on it
const webmcpShim = `(function(){
  var mc=document.modelContext;
  if(!mc){
    var _tools=[];
    var _ontoolchange=null;
    mc={
      get ontoolchange(){return _ontoolchange;},
      set ontoolchange(fn){
        _ontoolchange=fn;
        if(typeof fn==='function'){
          _tools.forEach(function(t){
            fn({type:'add',tool:{name:t.name,description:t.description,inputSchema:t.inputSchema}});
          });
        }
      },
      registerTool:function(obj){
        _tools=_tools.filter(function(t){return t.name!==obj.name;});
        _tools.push(obj);
        if(typeof _ontoolchange==='function')_ontoolchange({type:'add',tool:{name:obj.name,description:obj.description,inputSchema:obj.inputSchema}});
        return Promise.resolve(obj);
      },
      getTools:function(){return _tools.map(function(t){return{name:t.name,description:t.description,inputSchema:t.inputSchema};});},
      executeTool:function(toolOrName,inputArgs,opts){
        var name=typeof toolOrName==='string'?toolOrName:toolOrName.name;
        var t=_tools.find(function(t){return t.name===name;});
        if(!t)return Promise.reject(new Error('Unknown tool: '+name));
        return Promise.resolve()
          .then(function(){return t.execute(inputArgs||{},{signal:(opts&&opts.signal)||null});})
          .then(function(r){return typeof r==='string'?r:JSON.stringify(r);});
      }
    };
    try{Object.defineProperty(document,'modelContext',{value:mc,configurable:true,writable:false,enumerable:true});}catch(e){}
    try{Object.defineProperty(navigator,'modelContext',{value:mc,configurable:true,writable:false,enumerable:true});}catch(e){}
  }
  var TOOLS=[
    {name:'get_net_worth',desc:'Get total net worth — assets, liabilities, and breakdown by account type.',schema:{type:'object',properties:{},required:[]}},
    {name:'get_accounts',desc:'Get all financial accounts with current balances, filterable by type.',schema:{type:'object',properties:{type:{type:'string',enum:['checking','savings','credit','loan','investment','super','property']}}}},
    {name:'get_transactions',desc:'Get recent transactions, filterable by category, account, or date range.',schema:{type:'object',properties:{days:{type:'number'},category_id:{type:'string'},account_id:{type:'string'},limit:{type:'number'}}}},
    {name:'get_spending_by_category',desc:'Get spending breakdown by category over any period, with optional period comparison.',schema:{type:'object',properties:{days:{type:'number'},compare_previous_period:{type:'boolean'}}}},
    {name:'get_cashflow',desc:'Get monthly income vs expenses and savings rate trend.',schema:{type:'object',properties:{months:{type:'number'}}}},
    {name:'get_portfolio',desc:'Get investment portfolio holdings, allocation, and gain/loss.',schema:{type:'object',properties:{sort_by:{type:'string',enum:['value','gain_pct','ticker']}}}},
    {name:'get_recurring_charges',desc:'Detect recurring transactions — subscriptions and regular bills over 90 days.',schema:{type:'object',properties:{},required:[]}},
    {name:'get_financial_health_score',desc:'Get a 0–100 financial health score with factor breakdown.',schema:{type:'object',properties:{},required:[]}},
    {name:'get_goals',desc:'Get financial goals with current progress percentage toward each target.',schema:{type:'object',properties:{},required:[]}},
    {name:'get_budget_status',desc:'Compare actual spending to monthly budgets by category for the last N days.',schema:{type:'object',properties:{days:{type:'number'}},required:[]}},
    {name:'set_goal',desc:'Create or update a financial goal. Provide an id to update an existing goal.',schema:{type:'object',properties:{id:{type:'string'},name:{type:'string'},target_amount:{type:'number'},target_date:{type:'string'},account_id:{type:'string'}},required:['name','target_amount','target_date']}},
    {name:'categorize_transaction',desc:'Update the category of a transaction by id.',schema:{type:'object',properties:{id:{type:'string'},category_id:{type:'string'}},required:['id','category_id']}},
    {name:'add_transactions',desc:'Bulk-import transactions (e.g. from a bank statement). Auto-categorises using stored rules if category_id is omitted.',schema:{type:'object',properties:{transactions:{type:'array',items:{type:'object',properties:{date:{type:'string'},description:{type:'string'},amount:{type:'number'},account_id:{type:'string'},category_id:{type:'string'}},required:['date','description','amount','account_id']}}},required:['transactions']}},
    {name:'set_account_balance',desc:'Update the balance of an account (use after importing a bank statement to reconcile).',schema:{type:'object',properties:{account_id:{type:'string'},balance:{type:'number'}},required:['account_id','balance']}},
    {name:'delete_goal',desc:'Delete a financial goal by id.',schema:{type:'object',properties:{id:{type:'string'}},required:['id']}},
    {name:'set_budget',desc:'Set or update the monthly budget for a spending category. Pass null to remove the budget.',schema:{type:'object',properties:{category_id:{type:'string'},budget_monthly:{type:['number','null']}},required:['category_id','budget_monthly']}},
    {name:'get_financial_briefing',desc:'Get a complete financial briefing — net worth, cashflow, health score, goals, recurring commitments, and alerts — in one call.',schema:{type:'object',properties:{},required:[]}},
    {name:'forecast_cashflow',desc:'Project future monthly cashflow based on 6-month income and expense averages, adjusted for current trend.',schema:{type:'object',properties:{months:{type:'number'}}}},
    {name:'calculate_safe_to_spend',desc:'Calculate how much discretionary money is safely available to spend this month, based on remaining budget across all categories.',schema:{type:'object',properties:{},required:[]}}
  ];
  TOOLS.forEach(function(t){
    var toolDef={
      name:t.name,
      description:t.desc,
      inputSchema:t.schema,
      execute:function(args){
        // Returns a raw object — the browser (or our shim's executeTool) serialises to DOMString.
        function run(){
          if(window.__finsnap_tools&&window.__finsnap_tools[t.name])
            return Promise.resolve(window.__finsnap_tools[t.name](args||{}));
          return null;
        }
        var r=run();
        if(r)return r;
        return new Promise(function(res,rej){
          var n=0,iv=setInterval(function(){
            n++;
            var r=run();
            if(r){clearInterval(iv);r.then(res).catch(rej);}
            else if(n>40){clearInterval(iv);res({error:'FinSnap not ready — reload the page'});}
          },100);
        });
      }
    };
    try{mc.registerTool(toolDef);}catch(e){}
  });
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        {/* Raw <script> in <head> ensures synchronous execution during HTML parse,
            before the WebMCP Inspector extension scans for document.modelContext. */}
        <script dangerouslySetInnerHTML={{ __html: webmcpShim }} />
      </head>
      <body className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
        <WebMCPProvider />
        <WebMCPBridge />
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
