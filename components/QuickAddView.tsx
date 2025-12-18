import React, { useState } from 'react';
import { InventoryItem, Category } from '../types';
import { inventoryService } from '../services/inventoryService';
import { getTodayString, generateId } from '../utils';
import { Check, Plus, Trash2, Calendar, Hash, ArrowRight, PackageCheck } from 'lucide-react';

interface QuickAddViewProps {
  items: InventoryItem[];
  onComplete: () => void;
}

// Helper interface for local state
interface InboundEntry {
  internalId: string; // unique ID for UI key
  qty: string;
  date: string;
}

export const QuickAddView: React.FC<QuickAddViewProps> = ({ items, onComplete }) => {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  
  // Data structure: ItemId -> Array of Entries
  const [inboundData, setInboundData] = useState<Record<string, InboundEntry[]>>({});
  const [step, setStep] = useState<'select' | 'details' | 'confirm'>('select');

  const categories = Object.values(Category);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(id)) {
      newSet.delete(id);
      // Clean up data
      const newData = { ...inboundData };
      delete newData[id];
      setInboundData(newData);
    } else {
      newSet.add(id);
      // Init data with one empty entry
      setInboundData(prev => ({ 
        ...prev, 
        [id]: [{ internalId: generateId(), qty: '1', date: getTodayString() }] 
      }));
    }
    setSelectedItemIds(newSet);
  };

  const addEntry = (itemId: string) => {
    setInboundData(prev => ({
      ...prev,
      [itemId]: [
        ...(prev[itemId] || []),
        { internalId: generateId(), qty: '1', date: getTodayString() }
      ]
    }));
  };

  const removeEntry = (itemId: string, internalId: string) => {
    setInboundData(prev => {
      const currentEntries = prev[itemId] || [];
      if (currentEntries.length <= 1) return prev; 
      return {
        ...prev,
        [itemId]: currentEntries.filter(e => e.internalId !== internalId)
      };
    });
  };

  const updateEntry = (itemId: string, internalId: string, field: keyof InboundEntry, value: string) => {
    setInboundData(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).map(entry => 
        entry.internalId === internalId ? { ...entry, [field]: value } : entry
      )
    }));
  };

  if (step === 'select') {
    return (
      <div className="pb-32 px-2">
        <h2 className="text-lg font-bold mb-3 text-slate-800 px-2">步驟 1/3: 選擇進貨品項</h2>
        <div className="space-y-4">
            {categories.map(cat => {
                const catItems = items.filter(i => i.category === cat);
                if (catItems.length === 0) return null;
                
                return (
                    <div key={cat}>
                        <h3 className="text-xs font-bold text-slate-400 mb-1 px-2">{cat}</h3>
                        {/* Compact Grid: 3 columns, tighter gap */}
                        <div className="grid grid-cols-3 gap-2">
                        {catItems.map(item => {
                            const isSelected = selectedItemIds.has(item.id);
                            return (
                            <button
                                key={item.id}
                                onClick={() => toggleSelection(item.id)}
                                className={`relative p-2 rounded-lg border flex flex-col items-center justify-center min-h-[70px] transition-all active:scale-95 ${
                                isSelected ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white'
                                }`}
                            >
                                {isSelected && <Check className="absolute top-1 right-1 w-3.5 h-3.5 text-brand-500" />}
                                <h3 className={`text-sm font-bold text-center leading-tight break-words w-full ${isSelected ? 'text-brand-700' : 'text-slate-700'}`}>
                                    {item.name}
                                </h3>
                            </button>
                            )
                        })}
                        </div>
                    </div>
                );
            })}
        </div>

        {selectedItemIds.size > 0 && (
          <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto p-4 bg-white/90 backdrop-blur border-t border-slate-200 z-30">
            <button 
              onClick={() => setStep('details')}
              className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
            >
              下一步：輸入數量與效期
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. Details
  if (step === 'details') {
    return (
        <div className="pb-32 px-4">
        <h2 className="text-lg font-bold mb-4 text-slate-800">步驟 2/3: 輸入詳細資訊</h2>
        <div className="space-y-6">
            {categories.map(cat => {
                const catItems = items.filter(i => i.category === cat && selectedItemIds.has(i.id));
                if (catItems.length === 0) return null;

                return (
                    <div key={cat} className="space-y-4">
                        {catItems.map(item => {
                            const entries = inboundData[item.id] || [];
                            return (
                                <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-base mb-3 text-slate-800 border-b border-slate-100 pb-2 flex justify-between items-center">
                                    {item.name}
                                    <span className="text-xs font-normal text-slate-400">共 {entries.length} 筆</span>
                                </h3>
                                
                                <div className="space-y-3">
                                    {entries.map((entry, index) => (
                                    <div key={entry.internalId} className="bg-slate-50 p-2 rounded-lg border border-slate-100 relative">
                                        {entries.length > 1 && (
                                        <button 
                                            onClick={() => removeEntry(item.id, entry.internalId)}
                                            className="absolute -top-2 -right-2 bg-white text-slate-400 border border-slate-200 rounded-full p-1 shadow-sm hover:text-red-500"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        )}

                                        <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 mb-1">
                                            <Hash size={10}/> 數量
                                            </label>
                                            <input 
                                            type="number"
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-lg font-bold text-center text-brand-600 focus:ring-2 focus:ring-brand-500 outline-none"
                                            value={entry.qty}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => updateEntry(item.id, entry.internalId, 'qty', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 mb-1">
                                            <Calendar size={10}/> 有效期限
                                            </label>
                                            <input 
                                            type="date"
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none h-[46px]"
                                            value={entry.date}
                                            onChange={(e) => updateEntry(item.id, entry.internalId, 'date', e.target.value)}
                                            />
                                        </div>
                                        </div>
                                    </div>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => addEntry(item.id)}
                                    className="mt-3 w-full py-2 border border-dashed border-brand-300 text-brand-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 active:bg-brand-50"
                                >
                                    <Plus size={14}/> 新增同品項不同效期
                                </button>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>

        <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto p-4 bg-white/90 backdrop-blur border-t border-slate-200 flex gap-3 z-30">
            <button 
            onClick={() => setStep('select')}
            className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold"
            >
            上一步
            </button>
            <button 
            onClick={() => {
                // Check valid
                let hasInvalid = false;
                Object.values(inboundData).flat().forEach(e => {
                    const q = parseInt(e.qty);
                    if (isNaN(q) || q <= 0 || !e.date) {
                        hasInvalid = true;
                    }
                });

                if (hasInvalid) {
                    alert("請確認所有欄位的數量(>0)與日期皆已填寫");
                    return;
                }
                setStep('confirm');
            }}
            className="flex-[2] bg-brand-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
            下一步：確認總覽 <ArrowRight size={18}/>
            </button>
        </div>
        </div>
    );
  }

  // 3. Confirm Step
  return (
    <div className="pb-32 px-4">
        <h2 className="text-lg font-bold mb-4 text-slate-800">步驟 3/3: 確認進貨內容</h2>
        <div className="bg-orange-50 p-3 rounded-lg flex items-start gap-3 mb-6 text-sm text-orange-800">
            <PackageCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <p>請確認以下進貨清單無誤。按下「確認進貨」後將直接寫入庫存。</p>
        </div>

        <div className="space-y-6">
            {categories.map(cat => {
                // Filter items in this category that have entries
                const catItems = items.filter(i => 
                    i.category === cat && 
                    selectedItemIds.has(i.id) &&
                    (inboundData[i.id]?.length || 0) > 0
                );
                
                if (catItems.length === 0) return null;

                return (
                    <div key={cat} className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 px-1">{cat}</h3>
                        {catItems.map(item => {
                             const entries = inboundData[item.id] || [];
                             const totalQty = entries.reduce((sum, e) => sum + (parseInt(e.qty) || 0), 0);
                             
                             return (
                                 <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                     <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                                         <span className="font-bold text-slate-800">{item.name}</span>
                                         <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">總計 +{totalQty}</span>
                                     </div>
                                     <div className="divide-y divide-slate-100">
                                         {entries.map(e => (
                                             <div key={e.internalId} className="px-3 py-2 flex justify-between items-center text-sm">
                                                 <div className="flex items-center gap-2 text-slate-600">
                                                     <Calendar size={12}/> {e.date}
                                                 </div>
                                                 <div className="font-mono font-bold text-slate-700">
                                                     x {e.qty}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             )
                        })}
                    </div>
                );
            })}
        </div>

        <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto p-4 bg-white/90 backdrop-blur border-t border-slate-200 flex gap-3 z-30">
            <button 
                onClick={() => setStep('details')}
                className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold"
            >
                返回修改
            </button>
            <button 
                onClick={() => {
                    const flatEntries: {itemId: string, date: string, qty: number}[] = [];
                    Object.entries(inboundData).forEach(([itemId, entries]) => {
                        entries.forEach(e => {
                            const q = parseInt(e.qty);
                            if (!isNaN(q) && q > 0 && e.date) {
                                flatEntries.push({ itemId, date: e.date, qty: q });
                            }
                        });
                    });
                    
                    flatEntries.forEach(entry => {
                        inventoryService.addStock(entry.itemId, entry.date, entry.qty);
                    });
                    
                    onComplete();
                }}
                className="flex-[2] bg-brand-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
                <Check size={18}/> 確認進貨
            </button>
        </div>
    </div>
  );
};