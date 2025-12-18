import React, { useState, useMemo } from 'react';
import { InventoryItem, DeductionPlan, Category } from '../types';
import { sortBatches, getTotalStock } from '../utils';
import { inventoryService } from '../services/inventoryService';
import { CheckCircle2, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';

interface QuickTakeViewProps {
  items: InventoryItem[];
  onComplete: () => void;
}

export const QuickTakeView: React.FC<QuickTakeViewProps> = ({ items, onComplete }) => {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  // Use string to better handle input typing (empty string, backspace)
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'select' | 'quantity' | 'confirm'>('select');

  // Helper to toggle selection
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItemIds(newSet);
  };

  const categories = Object.values(Category);

  // 1. Selection Screen
  if (step === 'select') {
    return (
      <div className="pb-32 px-2">
        <h2 className="text-lg font-bold mb-3 text-slate-800 px-2">步驟 1/3: 選擇拿取品項</h2>
        <div className="space-y-4">
          {categories.map(cat => {
            const catItems = items.filter(i => i.category === cat);
            if (catItems.length === 0) return null;

            return (
                <div key={cat}>
                    <h3 className="text-xs font-bold text-slate-400 mb-1 px-2">{cat}</h3>
                    {/* Compact Grid Layout */}
                    <div className="grid grid-cols-3 gap-2">
                        {catItems.map(item => {
                            const stock = getTotalStock(item);
                            const isSelected = selectedItemIds.has(item.id);
                            return (
                                <div 
                                    key={item.id}
                                    onClick={() => stock > 0 && toggleSelection(item.id)}
                                    className={`relative p-2 rounded-lg border flex flex-col items-center justify-center min-h-[70px] transition-all cursor-pointer ${
                                    isSelected ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-100 bg-white'
                                    } ${stock === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                >
                                    {isSelected && <CheckCircle2 className="absolute top-1 right-1 w-3.5 h-3.5 text-brand-500" />}
                                    
                                    <h3 className={`text-sm font-bold text-center leading-tight break-words w-full ${isSelected ? 'text-brand-700' : 'text-slate-800'}`}>
                                        {item.name}
                                    </h3>
                                    
                                    <span className={`text-[10px] mt-1 px-1.5 py-0.5 rounded-full ${stock === 0 ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                                       餘: {stock}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
          })}
        </div>
        
        {selectedItemIds.size > 0 && (
          <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto p-4 bg-white/90 backdrop-blur border-t border-slate-200 z-30">
             <button 
              onClick={() => setStep('quantity')}
              className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              下一步: 設定數量 <ArrowRight size={20}/>
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. Quantity Input Screen
  if (step === 'quantity') {
    const selectedItems = items.filter(i => selectedItemIds.has(i.id));
    
    return (
      <div className="pb-32 px-4">
         <h2 className="text-lg font-bold mb-4 text-slate-800">步驟 2/3: 設定數量</h2>
         <div className="space-y-6">
           {categories.map(cat => {
             const catItems = selectedItems.filter(i => i.category === cat);
             if (catItems.length === 0) return null;

             return (
               <div key={cat}>
                 <h3 className="text-xs font-bold text-slate-400 mb-2 px-1">{cat}</h3>
                 <div className="space-y-3">
                    {catItems.map(item => {
                        const maxStock = getTotalStock(item);
                        const currentValStr = quantities[item.id] || "0";
                        const currentVal = parseInt(currentValStr) || 0;

                        return (
                        <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-base">{item.name}</h3>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">上限: {maxStock}</span>
                            </div>
                            <div className="flex items-center gap-3">
                            <button 
                                className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 text-lg font-bold active:bg-slate-200 touch-manipulation flex items-center justify-center"
                                onClick={() => setQuantities(prev => ({ 
                                    ...prev, 
                                    [item.id]: Math.max(0, (parseInt(prev[item.id] || "0") || 0) - 1).toString() 
                                }))}
                            >-</button>
                            <input 
                                type="number" 
                                className="flex-1 text-center text-xl font-bold text-brand-600 p-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
                                value={currentValStr === "0" ? "" : currentValStr}
                                placeholder="0"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                const valStr = e.target.value;
                                const val = parseInt(valStr);
                                if (valStr === '') {
                                    setQuantities(prev => ({ ...prev, [item.id]: "" }));
                                } else if (!isNaN(val)) {
                                    setQuantities(prev => ({ ...prev, [item.id]: Math.min(maxStock, val).toString() }));
                                }
                                }}
                            />
                            <button 
                                className="w-9 h-9 rounded-lg bg-brand-100 text-brand-600 text-lg font-bold active:bg-brand-200 touch-manipulation flex items-center justify-center"
                                onClick={() => setQuantities(prev => ({ 
                                    ...prev, 
                                    [item.id]: Math.min(maxStock, (parseInt(prev[item.id] || "0") || 0) + 1).toString() 
                                }))}
                            >+</button>
                            </div>
                        </div>
                        )
                    })}
                 </div>
               </div>
             )
           })}
         </div>

         <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto p-4 bg-white/90 backdrop-blur border-t border-slate-200 flex gap-3 z-30">
             <button 
              onClick={() => setStep('select')}
              className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold active:bg-slate-200"
            >
              上一步
            </button>
             <button 
              onClick={() => {
                const hasInvalid = selectedItems.some(i => {
                    const q = parseInt(quantities[i.id] || "0");
                    return isNaN(q) || q <= 0;
                });
                if (hasInvalid) {
                  alert("請確認所有品項都有設定數量且大於 0");
                  return;
                }
                setStep('confirm');
              }}
              className="flex-[2] bg-brand-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
            >
              計算並確認
            </button>
          </div>
      </div>
    )
  }

  // 3. Calculation & Confirmation
  return <ConfirmationScreen 
    items={items} 
    selectedIds={selectedItemIds} 
    quantities={quantities} 
    onBack={() => setStep('quantity')}
    onConfirm={(plans) => {
      const flatDeductions: { itemId: string; batchId: string; quantityToTake: number }[] = [];
      plans.forEach(plan => {
        plan.deductions.forEach(d => {
          flatDeductions.push({ itemId: plan.itemId, batchId: d.batchId, quantityToTake: d.quantityToTake });
        });
      });
      inventoryService.deductStock(flatDeductions);
      onComplete();
    }}
  />;
};

// Sub-component for Complexity Handling
const ConfirmationScreen: React.FC<{
  items: InventoryItem[];
  selectedIds: Set<string>;
  quantities: Record<string, string>;
  onBack: () => void;
  onConfirm: (plans: DeductionPlan[]) => void;
}> = ({ items, selectedIds, quantities, onBack, onConfirm }) => {
  const [checkedBatches, setCheckedBatches] = useState<Set<string>>(new Set());

  // Calculate Logic (FIFO)
  const plans = useMemo(() => {
    return items.filter(i => selectedIds.has(i.id)).map(item => {
      const qtyNeeded = parseInt(quantities[item.id] || "0") || 0;
      const sortedBatches = sortBatches(item.batches);
      let qtyRemaining = qtyNeeded;
      const deductions = [];

      for (const batch of sortedBatches) {
        if (qtyRemaining <= 0) break;
        const take = Math.min(batch.quantity, qtyRemaining);
        deductions.push({
          batchId: batch.id,
          expiryDate: batch.expiryDate,
          quantityToTake: take
        });
        qtyRemaining -= take;
      }

      return {
        itemId: item.id,
        itemName: item.name,
        totalRequested: qtyNeeded,
        deductions,
        isComplete: qtyRemaining === 0
      };
    });
  }, [items, selectedIds, quantities]);

  const allBatchKeys = plans.flatMap(p => p.deductions.map(d => `${p.itemId}-${d.batchId}`));
  const isAllChecked = allBatchKeys.every(k => checkedBatches.has(k));

  const toggleCheck = (key: string) => {
    const next = new Set(checkedBatches);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCheckedBatches(next);
  };

  return (
    <div className="pb-32 px-4">
      <h2 className="text-lg font-bold mb-4 text-slate-800">步驟 3/3: 確認拿取內容</h2>
      <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3 mb-6 text-xs text-blue-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>系統自動選取最接近有效日期的庫存。請核對拿取數量並勾選確認。</p>
      </div>

      <div className="space-y-4">
        {plans.map(plan => (
          <div key={plan.itemId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">{plan.itemName}</h3>
              <span className="font-bold text-brand-600 text-sm">共取 {plan.totalRequested} 個</span>
            </div>
            <div className="divide-y divide-slate-100">
              {plan.deductions.map(d => {
                const key = `${plan.itemId}-${d.batchId}`;
                const isChecked = checkedBatches.has(key);
                return (
                  <div 
                    key={d.batchId} 
                    onClick={() => toggleCheck(key)}
                    className="p-3 flex items-center gap-3 cursor-pointer active:bg-slate-50"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600">效期: <span className="font-mono font-medium text-slate-800">{d.expiryDate}</span></span>
                        <span className="font-bold text-base text-slate-800">{d.quantityToTake} <span className="text-[10px] font-normal text-slate-500">個</span></span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto p-4 bg-white/90 backdrop-blur border-t border-slate-200 flex gap-3 z-30">
        <button 
          onClick={onBack}
          className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold active:bg-slate-200"
        >
          返回修改
        </button>
        <button 
          disabled={!isAllChecked}
          onClick={() => onConfirm(plans)}
          className={`flex-[2] py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 ${
            isAllChecked ? 'bg-green-600 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isAllChecked ? '確認並扣除' : '請勾選確認'}
        </button>
      </div>
    </div>
  );
};