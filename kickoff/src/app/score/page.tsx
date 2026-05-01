import { Suspense } from "react";
import ScorePage from "@/components/ScorePage";

export default function Score() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#111827" }} />}>
      <ScorePage />
    </Suspense>
  );
}
