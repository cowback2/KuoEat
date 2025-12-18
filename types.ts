export enum Category {
  PINEAPPLE_CAKE = '鳳梨酥類',
  PUFF_PASTRY = '酥皮類',
  CAKE = '糕類',
  CHINESE_PIE = '大餅類',
  OTHER = '其他類'
}

// Special string for the "Problematic Items" view
export const CATEGORY_ALERTS = '⚠️ 需注意';

export type ViewCategory = Category | typeof CATEGORY_ALERTS;

export interface Batch {
  id: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  batches: Batch[];
}

export interface DeductionPlan {
  itemId: string;
  itemName: string;
  totalRequested: number;
  deductions: {
    batchId: string;
    expiryDate: string;
    quantityToTake: number;
  }[];
  isComplete: boolean; // True if we have enough stock
}