/** Client-safe transaction / PO status helpers (no server-only). */

export const TXN_TYPES = [
  "PURCHASE_RECEIVED",
  "PURCHASE_RETURN",
  "MATERIAL_ISSUE",
  "MATERIAL_RETURN",
  "STOCK_ADJUSTMENT",
  "MANUFACTURING_CONSUMPTION",
  "MANUFACTURING_OUTPUT",
  "STOCK_TRANSFER",
  "SALES_ISSUE",
] as const;

export const TXN_TYPE_LABELS: Record<string, string> = {
  PURCHASE_RECEIVED: "Purchase Received",
  PURCHASE_RETURN: "Purchase Return",
  MATERIAL_ISSUE: "Material Issue",
  MATERIAL_RETURN: "Material Return",
  STOCK_ADJUSTMENT: "Stock Adjustment",
  MANUFACTURING_CONSUMPTION: "Manufacturing Consumption",
  MANUFACTURING_OUTPUT: "Manufacturing Output",
  STOCK_TRANSFER: "Stock Transfer",
  SALES_ISSUE: "Sales Issue",
  RECEIPT: "Purchase Received",
  PURCHASE: "Purchase Received",
  TRANSFER: "Stock Transfer",
  ADJUSTMENT: "Stock Adjustment",
  PRODUCTION_CONSUMPTION: "Manufacturing Consumption",
  PRODUCTION_OUTPUT: "Manufacturing Output",
  SALE: "Sales Issue",
  RETURN: "Material Return",
};

export function txnTypeAliases(canonical: string): string[] {
  const map: Record<string, string[]> = {
    PURCHASE_RECEIVED: ["PURCHASE_RECEIVED", "RECEIPT", "PURCHASE"],
    STOCK_TRANSFER: ["STOCK_TRANSFER", "TRANSFER"],
    STOCK_ADJUSTMENT: ["STOCK_ADJUSTMENT", "ADJUSTMENT"],
    MANUFACTURING_CONSUMPTION: ["MANUFACTURING_CONSUMPTION", "PRODUCTION_CONSUMPTION"],
    MANUFACTURING_OUTPUT: ["MANUFACTURING_OUTPUT", "PRODUCTION_OUTPUT"],
    SALES_ISSUE: ["SALES_ISSUE", "SALE"],
    MATERIAL_RETURN: ["MATERIAL_RETURN", "RETURN"],
    PURCHASE_RETURN: ["PURCHASE_RETURN"],
    MATERIAL_ISSUE: ["MATERIAL_ISSUE"],
  };
  return map[canonical] || [canonical];
}

export function formatPoStatus(status?: string | null): string {
  switch (String(status || "").toUpperCase()) {
    case "DRAFT":
    case "ORDERED":
    case "PENDING":
      return "Pending";
    case "PARTIALLY_RECEIVED":
      return "Partially Received";
    case "RECEIVED":
    case "FULLY_RECEIVED":
      return "Fully Received";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status || "-";
  }
}
