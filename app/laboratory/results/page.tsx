"use client";

import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Card, PageHeader, SearchInput, Select, FilterActions, FilterBar, FormField, Button } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";

type TestResult = {
  id: number;
  sample_code: string;
  test_name: string;
  parameter: string;
  result_value?: string;
  unit?: string;
  specification?: string;
  pass_fail: string;
};

export default function LabResultsPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<TestResult>("/api/test-results");

  return (
    <AppLayout title="Results">
      <PageHeader title="Test Results" subtitle="Parameter results and pass/fail outcomes" />
      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search results..." />
          <FormField label="Filter by status" hint="Show records in one status only">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All outcomes</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
            <option value="NA">NA</option>
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
          { key: "parameter", header: "Parameter" },
          { key: "result_value", header: "Result", render: (r) => r.result_value || "-" },
          { key: "unit", header: "Unit", render: (r) => r.unit || "-" },
          { key: "specification", header: "Spec", render: (r) => r.specification || "-" },
          { key: "pass_fail", header: "Outcome", render: (r) => <StatusCell value={r.pass_fail} /> },
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
