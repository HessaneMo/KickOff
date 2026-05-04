"use client";

import dynamic from "next/dynamic";
import PillNav from "@/components/PillNav";
import { useAuth } from "@/context/AuthContext";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const { user } = useAuth();

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0f172a" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        bottom: "calc(58px + env(safe-area-inset-bottom))",
      }}>
        <MapView userId={user?.id ?? null} />
      </div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 2000 }}>
        <PillNav active="map" />
      </div>
    </div>
  );
}
