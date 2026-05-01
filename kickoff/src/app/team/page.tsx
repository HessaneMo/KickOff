import { Suspense } from "react";
import TeamPage from "@/components/TeamPage";

export default function Team() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#111827" }} />}>
      <TeamPage />
    </Suspense>
  );
}
