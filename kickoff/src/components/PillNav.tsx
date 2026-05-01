"use client";

import Link from "next/link";

type NavItem = "home" | "create" | "join" | "profile";

export default function PillNav({ active }: { active: NavItem }) {
  const items: { id: NavItem; label: string; href: string }[] = [
    { id: "home", label: "Tournois", href: "/dashboard" },
    { id: "create", label: "Créer", href: "/create" },
    { id: "join", label: "Rejoindre", href: "/join" },
    { id: "profile", label: "Profil", href: "/profile" },
  ];

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      padding: "12px 16px",
      paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
      zIndex: 50,
      pointerEvents: "none",
    }}>
      <div className="flex gap-0.5 rounded-full p-1" style={{
        background: "#1f2937",
        border: "1px solid #374151",
        pointerEvents: "all",
      }}>
        {items.map(item => (
          <Link key={item.id} href={item.href}
            className="rounded-full transition-all"
            style={{
              padding: "7px 16px",
              fontSize: "10px",
              fontWeight: active === item.id ? 700 : 600,
              background: active === item.id ? "#f9fafb" : "transparent",
              color: active === item.id ? "#0f172a" : "#6b7280",
              textDecoration: "none",
            }}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
