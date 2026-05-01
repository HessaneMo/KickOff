import { Suspense } from "react";
import TournamentPage from "@/components/TournamentPage";

export default function Tournament() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#111827" }} />}>
      <TournamentPage />
    </Suspense>
  );
}
