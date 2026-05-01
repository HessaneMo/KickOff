import { Suspense } from "react";
import JoinPage from "@/components/JoinPage";

export default function Join() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#111827" }} />}>
      <JoinPage />
    </Suspense>
  );
}
