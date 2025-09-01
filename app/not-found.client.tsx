"use client";

import { useSearchParams } from "next/navigation";

export default function NotFoundQuery() {
  const params = useSearchParams();
  const reason = params.get("reason");

  if (!reason) return null;
  return (
    <p className="mt-3 text-sm">
      Dettagli: <span className="font-medium">{reason}</span>
    </p>
  );
}

