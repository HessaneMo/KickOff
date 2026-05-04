import { Suspense } from "react";
import AuthScreen from "@/components/AuthScreen";

export default function Home() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#111827" }} />}>
      <AuthScreen />
    </Suspense>
  );
}
