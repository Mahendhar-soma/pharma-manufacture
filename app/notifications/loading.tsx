import { NotificationListSkeleton, StatCardsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <StatCardsSkeleton count={4} className="xl:grid-cols-4" />
      <NotificationListSkeleton count={4} />
    </div>
  );
}
