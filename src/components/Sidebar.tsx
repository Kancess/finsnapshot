"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const nav = [
  { href: "/dashboard",    label: "Dashboard",    icon: "▦" },
  { href: "/transactions", label: "Transactions",  icon: "↕" },
  { href: "/accounts",     label: "Accounts",      icon: "◫" },
  { href: "/goals",        label: "Goals",         icon: "◎" },
  { href: "/budget",       label: "Budget",        icon: "⊙" },
  { href: "/cashflow",     label: "Cashflow",      icon: "∿" },
  { href: "/portfolio",    label: "Portfolio",      icon: "◈" },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function handlePromptSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    router.push(`/ai-tools?q=${encodeURIComponent(prompt.trim())}`);
    setPrompt("");
  }

  return (
    <aside
      style={{
        width: 220,
        background: "var(--mid)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        borderRight: "1px solid rgba(255,255,255,.08)",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 20, letterSpacing: "-.03em", color: "#fff", lineHeight: 1.1 }}>
          Fin<span style={{ color: "var(--cr)" }}>Snap</span>
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 3, fontWeight: 500, letterSpacing: ".04em" }}>
          PERSONAL FINANCE
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {nav.map(({ href, label, icon }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? "#fff" : "rgba(255,255,255,.55)",
                background: active ? "rgba(166,52,70,.85)" : "transparent",
                textDecoration: "none",
                transition: "background .12s, color .12s",
              }}
            >
              <span style={{ fontSize: 15, opacity: active ? 1 : 0.7 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Ask AI prompt */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 7, paddingLeft: 4 }}>Ask AI</div>
        <form onSubmit={handlePromptSubmit} style={{ position: "relative" }}>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask anything about your money…"
            style={{
              width: "100%",
              padding: "8px 32px 8px 10px",
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,255,255,.07)",
              color: "#fff",
              fontSize: 12,
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              caretColor: "#fff",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(166,52,70,.7)"; e.target.style.background = "rgba(255,255,255,.1)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,.14)"; e.target.style.background = "rgba(255,255,255,.07)"; }}
          />
          <button
            type="submit"
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: prompt.trim() ? "var(--cr)" : "rgba(255,255,255,.25)",
              fontSize: 14,
              cursor: prompt.trim() ? "pointer" : "default",
              padding: "2px 4px",
              lineHeight: 1,
              transition: "color .15s",
            }}
          >↵</button>
        </form>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.22)", marginTop: 6, paddingLeft: 2, lineHeight: 1.5 }}>
          Open in ChatGPT or Claude with this site loaded
        </div>
      </div>

      {/* AI Tools link */}
      <div style={{ padding: "10px 10px 16px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <Link
          href="/ai-tools"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 12px",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: path === "/ai-tools" ? 700 : 500,
            color: path === "/ai-tools" ? "#fff" : "rgba(255,255,255,.55)",
            background: path === "/ai-tools" ? "rgba(166,52,70,.85)" : "transparent",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 15 }}>⚡</span>
          AI Tools
          <span style={{ marginLeft: "auto", fontSize: 9, background: "rgba(30,138,86,.3)", color: "#4ade9a", borderRadius: 100, padding: "1px 6px", fontWeight: 700 }}>
            19
          </span>
        </Link>
      </div>
    </aside>
  );
}
