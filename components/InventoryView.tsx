import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem, Category, ViewCategory, CATEGORY_ALERTS } from '../types';
import { getTotalStock, isExpiringSoon, isLowStock, sortBatches, getDaysRemaining, getTodayString } from '../utils';
import { inventoryService } from '../services/inventoryService';
import { AlertTriangle, AlertOctagon, ChevronDown, ChevronUp, Trash2, Edit2, PlusCircle, PackageOpen, X, Check, Calendar, Hash, ArrowDownCircle, Plus } from 'lucide-react';

interface InventoryViewProps {
  items: InventoryItem[];
  category: ViewCategory;
  onUpdate: () => void;
}

// 定義彈窗的類型
type DialogType = 'rename' | 'edit_batch' | 'delete_confirm' | 'stock_in' | 'add_item';

interface DialogState {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message?: string;
  // Context Data
  itemId?: string;
  batchId?: string;
  // Form Values
  nameVal?: string;
  qtyVal?: string;
  dateVal?: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ items, category, onUpdate }) => {
  // Filter logic
  const filteredItems = items.filter(i => {
    if (category === CATEGORY_ALERTS) {
      return isExpiringSoon(i) || isLowStock(i);
    }
    return i.category === category;
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Initial Dialog State
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    type: 'rename',
    title: '',
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus effect
  useEffect(() => {
    if (dialog.isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.select(), 100);
    }
  }, [dialog.isOpen]);

  const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));

  // 通用確認處理邏輯
  const handleConfirm = () => {
    const { type, itemId, batchId, nameVal, qtyVal, dateVal } = dialog;

    if (type === 'add_item') {
        if (nameVal?.trim()) {
            inventoryService.addItem(nameVal.trim(), category as Category);
            onUpdate();
        }
    } 
    else if (type === 'rename' && itemId) {
        if (nameVal?.trim()) {
            inventoryService.updateItemName(itemId, nameVal.trim());
            onUpdate();
        }
    }
    else if (type === 'delete_confirm' && itemId) {
        inventoryService.deleteItem(itemId);
        onUpdate();
        if (expandedId === itemId) setExpandedId(null);
    }
    else if (type === 'edit_batch' && itemId && batchId) {
        const q = parseInt(qtyVal || '0');
        if (!isNaN(q)) {
            // Pass dateVal if it exists
            inventoryService.updateBatch(itemId, batchId, q, dateVal);
            onUpdate();
        }
    }
    else if (type === 'stock_in' && itemId) {
        const q = parseInt(qtyVal || '0');
        const d = dateVal || getTodayString();
        if (!isNaN(q) && q > 0 && d) {
            inventoryService.addStock(itemId, d, q);
            onUpdate();
        }
    }

    closeDialog();
  };

  // 渲染彈窗內容
  const renderDialogContent = () => {
    switch (dialog.type) {
      case 'delete_confirm':
        return (
          <div className="mb-6">
             <p className="text-slate-600 mb-2">{dialog.message}</p>
             <p className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100">此動作無法復原。</p>
          </div>
        );
      
      case 'rename':
      case 'add_item':
        return (
            <input
                ref={inputRef}
                type="text"
                className="w-full border-2 border-slate-200 rounded-lg p-3 text-lg font-bold text-slate-700 focus:border-brand-500 focus:ring-0 outline-none mb-6"
                value={dialog.nameVal || ''}
                onChange={e => setDialog(prev => ({...prev, nameVal: e.target.value}))}
                placeholder="輸入名稱..."
                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            />
        );

      case 'edit_batch':
        return (
             <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">數量</label>
                  <input
                      ref={inputRef}
                      type="number"
                      className="w-full border-2 border-slate-200 rounded-lg p-3 text-2xl font-bold text-center text-brand-600 focus:border-brand-500 focus:ring-0 outline-none"
                      value={dialog.qtyVal || ''}
                      onChange={e => setDialog(prev => ({...prev, qtyVal: e.target.value}))}
                      placeholder="0"
                      onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                  />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">有效期限 (修正日期)</label>
                   <input
                        type="date"
                        className="w-full border-2 border-slate-200 rounded-lg p-3 font-medium focus:border-brand-500 focus:ring-0 outline-none"
                        value={dialog.dateVal || ''}
                        onChange={e => setDialog(prev => ({...prev, dateVal: e.target.value}))}
                    />
                </div>
             </div>
        );

      case 'stock_in':
        return (
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">數量</label>
                    <input
                        ref={inputRef}
                        type="number"
                        className="w-full border-2 border-slate-200 rounded-lg p-3 text-2xl font-bold text-center text-brand-600 focus:border-brand-500 focus:ring-0 outline-none"
                        value={dialog.qtyVal || ''}
                        onChange={e => setDialog(prev => ({...prev, qtyVal: e.target.value}))}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">有效期限</label>
                    <input
                        type="date"
                        className="w-full border-2 border-slate-200 rounded-lg p-3 font-medium focus:border-brand-500 focus:ring-0 outline-none"
                        value={dialog.dateVal || getTodayString()}
                        onChange={e => setDialog(prev => ({...prev, dateVal: e.target.value}))}
                    />
                </div>
            </div>
        );
    }
  };

  const renderDialog = () => {
    if (!dialog.isOpen) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800">{dialog.title}</h3>
            <button onClick={closeDialog} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          
          {renderDialogContent()}

          <div className="flex gap-3">
            <button 
              onClick={closeDialog}
              className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button 
              onClick={handleConfirm}
              className={`flex-1 py-3 font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 text-white ${
                  dialog.type === 'delete_confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              <Check size={18} /> 確認
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---

  if (filteredItems.length === 0) {
    return (
      <>
        {renderDialog()}
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <PackageOpen size={48} className="mb-4 opacity-50"/>
          <p className="font-bold">{category === CATEGORY_ALERTS ? "太棒了！沒有庫存異常👏" : "此分類暫無品項"}</p>
          
          {category !== CATEGORY_ALERTS && (
              <button 
              className="mt-4 text-brand-600 font-bold flex items-center gap-1 bg-brand-50 px-4 py-2 rounded-lg active:bg-brand-100"
              onClick={() => setDialog({ isOpen: true, type: 'add_item', title: '新增品項', nameVal: '' })}
              >
              <PlusCircle size={18}/> 新增品項
              </button>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-24">
      {renderDialog()}

      {category === CATEGORY_ALERTS && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700 mb-4 flex gap-2">
              <AlertTriangle className="shrink-0 w-5 h-5"/>
              <p>此頁面顯示所有「效期剩餘 7 天內」或「庫存少於 3 個」的品項。</p>
          </div>
      )}

      {filteredItems.map(item => {
        const total = getTotalStock(item);
        const expiring = isExpiringSoon(item);
        const low = isLowStock(item);
        const isExpanded = expandedId === item.id;

        return (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-200">
            {/* Header / Summary Card */}
            <div 
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
              className={`p-4 flex justify-between items-center cursor-pointer active:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50/50' : ''}`}
            >
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <div className="flex flex-col w-full">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-lg truncate max-w-[140px] sm:max-w-xs">
                            {item.name}
                        </h3>
                        
                        {/* Actions moved here, Stock In moved to right */}
                        <div className="flex items-center gap-1 shrink-0">
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDialog({
                                        isOpen: true,
                                        type: 'rename',
                                        title: '重新命名',
                                        itemId: item.id,
                                        nameVal: item.name
                                    });
                                }}
                                className="p-1 text-slate-400 hover:text-brand-600 rounded-full hover:bg-slate-100 transition-colors"
                             >
                                 <Edit2 size={14} />
                             </button>
                              <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDialog({
                                        isOpen: true,
                                        type: 'delete_confirm',
                                        title: '刪除品項確認',
                                        message: `確定要刪除「${item.name}」嗎？所有庫存資料將會消失。`,
                                        itemId: item.id
                                    });
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                             >
                                 <Trash2 size={14} />
                             </button>

                             {/* Stock In Button (Moved to right, Changed to Plus) */}
                             {category !== CATEGORY_ALERTS && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDialog({ 
                                            isOpen: true, 
                                            type: 'stock_in', 
                                            title: `入庫: ${item.name}`, 
                                            itemId: item.id,
                                            qtyVal: '',
                                            dateVal: getTodayString()
                                        });
                                    }}
                                    className="p-1 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-full transition-colors ml-1"
                                    title="快速入庫"
                                >
                                    <Plus size={16} strokeWidth={3} />
                                </button>
                             )}
                        </div>

                        {total === 0 && <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full shrink-0">缺貨</span>}
                    </div>
                    {category === CATEGORY_ALERTS && <span className="text-xs text-slate-400">{item.category}</span>}
                  
                    {/* Status Badges */}
                    <div className="flex gap-2 mt-1 flex-wrap">
                        {total > 0 && expiring && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={10} /> 效期注意
                        </span>
                        )}
                        {low && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                            <AlertOctagon size={10} /> 少量
                        </span>
                        )}
                    </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pl-2 shrink-0">
                <div className="text-right">
                  <span className={`text-2xl font-bold ${total === 0 ? 'text-slate-300' : 'text-slate-800'}`}>
                    {total}
                  </span>
                  <span className="text-xs text-slate-400 block">總庫存</span>
                </div>
                {isExpanded ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
              </div>
            </div>

            {/* Detailed View */}
            {isExpanded && (
              <div className="bg-slate-50 border-t border-slate-100 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                
                <div className="mb-2">
                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">庫存批次明細</h4>
                </div>

                <div className="space-y-2">
                  {sortBatches(item.batches).map(batch => {
                    const days = getDaysRemaining(batch.expiryDate);
                    const isUrgent = days <= 7;
                    return (
                      <div key={batch.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                        <div className="flex flex-col">
                           <span className={`font-mono font-medium ${isUrgent ? 'text-red-600' : 'text-slate-700'}`}>
                             {batch.expiryDate}
                           </span>
                           <span className={`text-xs ${isUrgent ? 'text-red-500' : 'text-slate-400'}`}>
                             {days < 0 ? '已過期' : `剩餘 ${days} 天`}
                           </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800 text-lg">{batch.quantity}</span>
                            <button 
                                onClick={() => setDialog({
                                    isOpen: true,
                                    type: 'edit_batch',
                                    title: '修正內容',
                                    itemId: item.id,
                                    batchId: batch.id,
                                    qtyVal: batch.quantity.toString(),
                                    dateVal: batch.expiryDate // Load current date
                                })}
                                className="text-xs text-brand-600 font-bold px-3 py-1.5 bg-brand-50 border border-brand-100 rounded active:bg-brand-200"
                            >
                                修正
                            </button>
                        </div>
                      </div>
                    );
                  })}
                  {item.batches.length === 0 && <p className="text-sm text-slate-400 italic text-center py-2 bg-slate-100/50 rounded-lg">無庫存資料</p>}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {category !== CATEGORY_ALERTS && (
        <button 
            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:text-brand-600 hover:border-brand-300 transition-colors flex items-center justify-center gap-2 active:scale-[0.99]"
            onClick={() => setDialog({ isOpen: true, type: 'add_item', title: '新增品項', nameVal: '' })}
        >
            <PlusCircle size={20} /> 新增{category}品項
        </button>
      )}
    </div>
  );
};