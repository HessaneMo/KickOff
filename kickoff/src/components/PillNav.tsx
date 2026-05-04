"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

type NavItem = "home" | "create" | "join" | "map" | "profile";

let _prevActive: NavItem | null = null;

export default function PillNav({ active }: { active: NavItem }) {
  const items: { id: NavItem; label: string; href: string }[] = [
    { id: "home", label: "Tournois", href: "/dashboard" },
    { id: "create", label: "Créer", href: "/create" },
    { id: "join", label: "Rejoindre", href: "/join" },
    { id: "map", label: "Map", href: "/map" },
    { id: "profile", label: "Profil", href: "/profile" },
  ];

  const activeIndex = items.findIndex(i => i.id === active);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const prevIndex = _prevActive ? items.findIndex(i => i.id === _prevActive) : activeIndex;
    const fromEl = itemRefs.current[prevIndex >= 0 ? prevIndex : activeIndex];
    const toEl = itemRefs.current[activeIndex];
    const ind = indicatorRef.current;
    if (!ind || !fromEl || !toEl) return;

    _prevActive = active;

    // 1. Snap sans transition sur la position de départ
    ind.style.transition = "none";
    ind.style.left = fromEl.offsetLeft + "px";
    ind.style.width = fromEl.offsetWidth + "px";

    // 2. Forcer le reflow pour que le browser enregistre la position de départ
    void ind.offsetWidth;

    // 3. Activer la transition et aller vers la destination
    ind.style.transition = "left 0.28s cubic-bezier(0.4,0,0.2,1), width 0.28s cubic-bezier(0.4,0,0.2,1)";
    ind.style.left = toEl.offsetLeft + "px";
    ind.style.width = toEl.offsetWidth + "px";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div style={{
        position: "relative",
        display: "flex",
        background: "#1f2937",
        border: "1px solid #374151",
        borderRadius: 99,
        padding: 4,
        pointerEvents: "all",
      }}>
        <div ref={indicatorRef} style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 0,
          width: 0,
          background: "#f9fafb",
          borderRadius: 99,
          pointerEvents: "none",
        }} />

        {items.map((item, i) => (
          <Link
            key={item.id}
            href={item.href}
            ref={el => { itemRefs.current[i] = el; }}
            style={{
              position: "relative",
              zIndex: 1,
              padding: "7px 14px",
              fontSize: "10px",
              fontWeight: active === item.id ? 700 : 600,
              color: active === item.id ? "#0f172a" : "#6b7280",
              textDecoration: "none",
              borderRadius: 99,
              transition: "color 0.2s ease",
            }}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
