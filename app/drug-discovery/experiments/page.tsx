"use client";

import { Suspense } from "react";
import ExperimentsPage from "./ExperimentsInner";
import { ListPageSkeleton } from "@/components/skeletons";

export default function ExperimentsRoute() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <ListPageSkeleton columns={5} filterFields={2} />
        </div>
      }
    >
      <ExperimentsPage />
    </Suspense>
  );
}
