import { NextResponse } from "next/server";

export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data: T | null;
};

export function ok<T>(data: T, message = "Success", status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, message, data },
    { status },
  );
}

export function fail(message: string, status = 400, data: unknown = null) {
  return NextResponse.json<ApiResponse>(
    { success: false, message, data },
    { status },
  );
}

export function getSearchParams(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 10)));
  const search = (searchParams.get("search") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const sortBy = (searchParams.get("sortBy") || "id").trim();
  const sortDir = (searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const offset = (page - 1) * limit;
  return { page, limit, offset, search, status, sortBy, sortDir, searchParams };
}

export function paginate(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
