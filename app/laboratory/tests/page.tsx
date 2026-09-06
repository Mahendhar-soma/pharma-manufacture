"use client";

import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Card, PageHeader, SearchInput, Select, FilterActions, FilterBar, FormField, Button } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";
import { formatDate } from "@/lib/utils";

type SampleTest = {
  id: number;
  sample_code: string;
  test_name: string;
  test_method?: string;
  assigned_name?: string;
  test_date?: string;
  status: string;
};

export default function LabTestsPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<SampleTest>("/api/sample-tests");

  return (
    <AppLayout title="Tests">
      <PageHeader title="Sample Tests" subtitle="Assigned laboratory test methods" />
      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search tests..." />
          <FormField label="Filter by status" hint="Show records in one status only">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </Select>
          </FormField>
          <FilterActions>
            <Button variant="secondary" onClick={reload} className="w-full sm:w-auto">
              Refresh
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>
      <ResponsiveTable
        columns={[
          { key: "sample_code", header: "Sample" },
          { key: "test_name", header: "Test" },
          { key: "test_method", header: "Method", render: (r) => r.test_method || "-" },
          { key: "assigned_name", header: "Assigned", render: (r) => r.assigned_name || "-" },
          { key: "test_date", header: "Date", render: (r) => formatDate(r.test_date) },
          { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
        ]}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        page={page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    </AppLayout>
  );
}
