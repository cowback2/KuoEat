import { InventoryItem, Category, Batch } from '../types';
import { generateId, getTodayString } from '../utils';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, remove, update, get, child } from 'firebase/database';

// ============================================================================
// 🔧 設定模式開關
// true  = 使用 Firebase 線上資料庫
// false = 使用 LocalStorage 本地模擬 (測試用)
// ============================================================================
const USE_FIREBASE = true; 

// ============================================================================
// 🔥 Firebase 設定 (已保留，切換上方開關即可啟用)
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDvBJmHwVZ8ASe0SbmUYBYRPhCSb26LQzk",
  authDomain: "kuoeat-ca3e3.firebaseapp.com",
  databaseURL: "https://kuoeat-ca3e3-default-rtdb.firebaseio.com",
  projectId: "kuoeat-ca3e3",
  storageBucket: "kuoeat-ca3e3.firebasestorage.app",
  messagingSenderId: "182151061440",
  appId: "1:182151061440:web:921dc01ea4cb46e02e7225",
  measurementId: "G-LRTTC4CNHE"
};

let db: any = null;
let itemsRef: any = null;

if (USE_FIREBASE) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    itemsRef = ref(db, 'inventory');
    console.log("🔥 Firebase 連線成功 (線上模式)");
  } catch (e) {
    console.error("Firebase 初始化失敗:", e);
  }
} else {
  console.log("🛠️ 目前為本地測試模式 (使用 LocalStorage)");
}

// ============================================================================
// 📦 Local Mock Data & Storage Helpers
// ============================================================================
const STORAGE_KEY = 'tasting_inventory_local_v2';
const INITIAL_MOCK_DATA: InventoryItem[] = [
  {
    id: '1',
    name: '範例: 原味鳳梨酥',
    category: Category.PINEAPPLE_CAKE,
    batches: [
      { id: 'b1', expiryDate: getTodayString(), quantity: 2 }, 
      { id: 'b2', expiryDate: '2025-12-31', quantity: 10 }
    ]
  },
  {
    id: '2',
    name: '範例: 蛋黃酥',
    category: Category.PUFF_PASTRY,
    batches: [
      { id: 'b3', expiryDate: '2024-05-20', quantity: 1 } 
    ]
  }
];

// 用於本地模式的簡單訂閱系統
const listeners: ((items: InventoryItem[]) => void)[] = [];

const notifyListeners = (items: InventoryItem[]) => {
  listeners.forEach(cb => cb(items));
};

const getLocalData = (): InventoryItem[] => {
  const str = localStorage.getItem(STORAGE_KEY);
  if (!str) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_DATA));
    return INITIAL_MOCK_DATA;
  }
  return JSON.parse(str);
};

const saveLocalData = (items: InventoryItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notifyListeners(items);
};

// ============================================================================
// 🛠️ Service Implementation
// ============================================================================

export const inventoryService = {
  /**
   * 訂閱庫存變更 (Real-time Listener)
   */
  subscribe: (callback: (items: InventoryItem[]) => void) => {
    if (USE_FIREBASE && itemsRef) {
      // --- Firebase Mode ---
      const unsubscribe = onValue(itemsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const itemsList: InventoryItem[] = Object.values(data);
          itemsList.forEach(item => {
            if (!item.batches) item.batches = [];
          });
          callback(itemsList);
        } else {
          callback([]);
        }
      });
      return unsubscribe;
    } else {
      // --- Local Mode ---
      // 1. 立即回傳當前資料
      const current = getLocalData();
      callback(current);
      
      // 2. 加入訂閱清單
      listeners.push(callback);
      
      // 回傳取消訂閱功能
      return () => {
        const idx = listeners.indexOf(callback);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    }
  },

  getAllItemsOnce: async (): Promise<InventoryItem[]> => {
    if (USE_FIREBASE && itemsRef) {
      const snapshot = await get(itemsRef);
      const data = snapshot.val();
      if (!data) return [];
      const list: InventoryItem[] = Object.values(data);
      list.forEach(i => { if (!i.batches) i.batches = []; });
      return list;
    }
    return getLocalData();
  },

  addItem: async (name: string, category: Category) => {
    const newItem: InventoryItem = {
      id: generateId(),
      name,
      category,
      batches: []
    };

    if (USE_FIREBASE && itemsRef) {
      await set(child(itemsRef, newItem.id), newItem);
    } else {
      const items = getLocalData();
      items.push(newItem);
      saveLocalData(items);
    }
    return newItem;
  },

  updateItemName: async (id: string, newName: string) => {
    if (USE_FIREBASE && itemsRef) {
      await update(child(itemsRef, id), { name: newName });
    } else {
      const items = getLocalData();
      const item = items.find(i => i.id === id);
      if (item) {
        item.name = newName;
        saveLocalData(items);
      }
    }
  },

  deleteItem: async (id: string) => {
    if (USE_FIREBASE && itemsRef) {
      await remove(child(itemsRef, id));
    } else {
      const items = getLocalData();
      const newItems = items.filter(i => i.id !== id);
      saveLocalData(newItems);
    }
  },

  addStock: async (itemId: string, expiryDate: string, quantity: number) => {
    if (quantity <= 0) return;

    if (USE_FIREBASE && itemsRef) {
      const itemRef = child(itemsRef, itemId);
      const snapshot = await get(itemRef);
      const item = snapshot.val() as InventoryItem;

      if (item) {
        if (!item.batches) item.batches = [];
        
        const existingBatchIndex = item.batches.findIndex(b => b.expiryDate === expiryDate);
        if (existingBatchIndex !== -1) {
          item.batches[existingBatchIndex].quantity += quantity;
        } else {
          item.batches.push({
            id: generateId(),
            expiryDate,
            quantity
          });
        }
        await set(itemRef, item);
      }
    } else {
      const items = getLocalData();
      const item = items.find(i => i.id === itemId);
      if (item) {
        const existing = item.batches.find(b => b.expiryDate === expiryDate);
        if (existing) existing.quantity += quantity;
        else item.batches.push({ id: generateId(), expiryDate, quantity });
        saveLocalData(items);
      }
    }
  },

  deductStock: async (deductions: { itemId: string; batchId: string; quantityToTake: number }[]) => {
    if (USE_FIREBASE && itemsRef) {
      // Firebase Logic
      const processedItems = new Set<string>();
      for (const d of deductions) {
        if (processedItems.has(d.itemId)) continue;
        const itemDeductions = deductions.filter(x => x.itemId === d.itemId);
        const itemRef = child(itemsRef, d.itemId);
        const snapshot = await get(itemRef);
        const item = snapshot.val() as InventoryItem;

        if (item && item.batches) {
          itemDeductions.forEach(subD => {
            const batchIndex = item.batches.findIndex(b => b.id === subD.batchId);
            if (batchIndex !== -1) {
              item.batches[batchIndex].quantity -= subD.quantityToTake;
              if (item.batches[batchIndex].quantity <= 0) {
                item.batches.splice(batchIndex, 1);
              }
            }
          });
          await set(itemRef, item);
        }
        processedItems.add(d.itemId);
      }
    } else {
      // Local Logic
      const items = getLocalData();
      deductions.forEach(d => {
        const item = items.find(i => i.id === d.itemId);
        if (item) {
          const idx = item.batches.findIndex(b => b.id === d.batchId);
          if (idx !== -1) {
            item.batches[idx].quantity -= d.quantityToTake;
            if (item.batches[idx].quantity <= 0) item.batches.splice(idx, 1);
          }
        }
      });
      saveLocalData(items);
    }
  },

  updateBatch: async (itemId: string, batchId: string, quantity: number, newExpiryDate?: string) => {
    if (USE_FIREBASE && itemsRef) {
      const itemRef = child(itemsRef, itemId);
      const snapshot = await get(itemRef);
      const item = snapshot.val() as InventoryItem;
      
      if (item && item.batches) {
        if (quantity <= 0) {
          item.batches = item.batches.filter(b => b.id !== batchId);
        } else {
          const batch = item.batches.find(b => b.id === batchId);
          if (batch) {
             batch.quantity = quantity;
             if (newExpiryDate) batch.expiryDate = newExpiryDate;
          }
        }
        await set(itemRef, item);
      }
    } else {
      const items = getLocalData();
      const item = items.find(i => i.id === itemId);
      if (item) {
        if (quantity <= 0) item.batches = item.batches.filter(b => b.id !== batchId);
        else {
          const batch = item.batches.find(b => b.id === batchId);
          if (batch) {
            batch.quantity = quantity;
            if (newExpiryDate) batch.expiryDate = newExpiryDate;
          }
        }
        saveLocalData(items);
      }
    }
  }
};