"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
            14
          </span>
        </Link>
      </div>
    </aside>
  );
}
