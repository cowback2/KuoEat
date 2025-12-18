import { Batch, InventoryItem } from './types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '無日期';
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const getDaysRemaining = (dateString: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getTotalStock = (item: InventoryItem): number => {
  return item.batches.reduce((sum, batch) => sum + batch.quantity, 0);
};

export const getNearestExpiryBatch = (item: InventoryItem): Batch | null => {
  if (item.batches.length === 0) return null;
  return [...item.batches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];
};

// Sort batches: Earliest expiry first
export const sortBatches = (batches: Batch[]): Batch[] => {
  return [...batches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
};

export const isExpiringSoon = (item: InventoryItem, thresholdDays = 7): boolean => {
  if (getTotalStock(item) === 0) return false;
  return item.batches.some(b => getDaysRemaining(b.expiryDate) <= thresholdDays);
};

export const isLowStock = (item: InventoryItem, threshold = 3): boolean => {
  const total = getTotalStock(item);
  return total > 0 && total <= threshold;
};
