"use client";

import { useCallback, useEffect, useState } from "react";

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function useApiList<T>(endpoint: string, extraQuery = "") {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const qs = extraQuery ? `${params}&${extraQuery}` : params.toString();
      const res = await fetch(`${endpoint}?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load");
      setRows(json.data?.items || []);
      setPagination(json.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, search, status, extraQuery]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    rows,
    loading,
    error,
    search,
    setSearch,
    status,
    setStatus,
    page,
    setPage,
    pagination,
    reload: load,
  };
}
