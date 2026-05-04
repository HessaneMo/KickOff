"use client";

import dynamic from "next/dynamic";
import PillNav from "@/components/PillNav";
import { useAuth } from "@/context/AuthContext";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const { user } = useAuth();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#0f172a" }}>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <MapView userId={user?.id ?? null} />
      </div>
      <PillNav active="map" />
    </div>
  );
}
