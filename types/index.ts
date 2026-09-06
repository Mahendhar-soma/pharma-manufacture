export type Paginated<T> = {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data: T | null;
};
