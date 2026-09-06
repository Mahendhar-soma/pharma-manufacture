import { ListPageSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <ListPageSkeleton columns={5} filterFields={2} />
    </div>
  );
}
