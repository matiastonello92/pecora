"use client";
import { useSearchParams } from "next/navigation";

export function NotFoundExtras() {
  const sp = useSearchParams();
  const reason = sp.get("reason");
  if (!reason) return null;
  return <p className="mt-3 text-sm text-muted-foreground">Dettagli: {reason}</p>;
}
