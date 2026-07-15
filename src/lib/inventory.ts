export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export function availableStock(inventory: number, reserved = 0) {
  return Math.max(0, inventory - reserved);
}

export function stockStatus(
  inventory: number,
  reserved = 0,
  lowThreshold = 5,
): StockStatus {
  const available = availableStock(inventory, reserved);
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= lowThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}

export function stockLabel(status: StockStatus, lang: "en" | "ar" = "en") {
  if (lang === "ar") {
    if (status === "OUT_OF_STOCK") return "نفد من المخزن";
    if (status === "LOW_STOCK") return "مخزون منخفض";
    return "متوفر";
  }
  if (status === "OUT_OF_STOCK") return "Out of stock";
  if (status === "LOW_STOCK") return "Low stock";
  return "In stock";
}

export function stockBadgeClass(status: StockStatus) {
  if (status === "OUT_OF_STOCK") return "text-red-300";
  if (status === "LOW_STOCK") return "text-amber-300";
  return "text-[#8fdfb0]";
}
