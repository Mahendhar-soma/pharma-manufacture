"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export default function PrintToolbar({
  title,
  backHref,
  autoPrint = false,
}: {
  title: string;
  backHref?: string;
  autoPrint?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">Print-ready document</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()}>Print / Save PDF</Button>
          <Button
            variant="secondary"
            onClick={() => (backHref ? router.push(backHref) : router.back())}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
