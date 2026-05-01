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
    <div className="flex justify-center" style={{ padding: "14px 0 18px" }}>
      <div className="flex gap-0.5 rounded-full p-1" style={{ background: "#1f2937", border: "1px solid #374151" }}>
        {items.map(item => (
          <Link key={item.id} href={item.href}
            className="rounded-full font-semibold transition-all"
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
