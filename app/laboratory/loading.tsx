import { HubOverviewSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <HubOverviewSkeleton stats={6} links={4} />
    </div>
  );
}
