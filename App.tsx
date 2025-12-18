import React, { useState, useEffect, useMemo } from 'react';
import { Category, InventoryItem, ViewCategory, CATEGORY_ALERTS } from './types';
import { inventoryService } from './services/inventoryService';
import { InventoryView } from './components/InventoryView';
import { QuickTakeView } from './components/QuickTakeView';
import { QuickAddView } from './components/QuickAddView';
import { LayoutGrid, MinusCircle, PlusCircle, ChefHat, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { isExpiringSoon, isLowStock } from './utils';

const TABS = [
  { id: 'inventory', label: '庫存一覽', icon: LayoutGrid },
  { id: 'take', label: '大批拿試吃', icon: MinusCircle },
  { id: 'add', label: '大批進試吃', icon: PlusCircle },
] as const;

type TabId = typeof TABS[number]['id'];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('inventory');
  const [activeCategory, setActiveCategory] = useState<ViewCategory>(Category.PINEAPPLE_CAKE);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time Database Subscription (works for both Local and Firebase now)
  useEffect(() => {
    const unsubscribe = inventoryService.subscribe((data) => {
      setItems(data);
      isLoading && setIsLoading(false);
    });
    // Cleanup on unmount
    return () => unsubscribe();
  }, []);

  // Calculate totals for badges or alerts
  const alertCount = useMemo(() => {
    return items.filter(i => isExpiringSoon(i) || isLowStock(i)).length;
  }, [items]);

  return (
    <div className="min-h-screen font-sans text-slate-800 bg-slate-50 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      
      {/* Top Header */}
      <header className="bg-white px-4 pt-12 pb-3 shadow-sm z-10 sticky top-0">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
             <div className="bg-brand-500 p-2 rounded-lg">
               <ChefHat className="text-white w-6 h-6" />
             </div>
             <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">試吃品庫存</h1>
           </div>
           
           {/* Status Indicator */}
           <div className="flex items-center gap-1 opacity-70">
             <Wifi size={14} className="text-green-600"/>
             <span className="text-xs text-slate-500 font-medium">已就緒</span>
           </div>
        </div>

        {/* Categories (Only show in Inventory Mode) */}
        {activeTab === 'inventory' && (
          // Scroll container wrapper
          <div className="relative -mx-4 px-4">
              <div className="flex gap-2 overflow-x-auto pb-3 touch-pan-x snap-x px-1">
                {/* The Special Alerts Category */}
                <button
                    onClick={() => setActiveCategory(CATEGORY_ALERTS)}
                    className={`shrink-0 snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all border flex items-center gap-1 ${
                      activeCategory === CATEGORY_ALERTS 
                        ? 'bg-red-100 text-red-700 border-red-200 shadow-md transform scale-105' 
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    <AlertTriangle size={14} className={alertCount > 0 ? "text-red-500 animate-bounce" : ""} />
                    需注意 ({alertCount})
                </button>

                {/* Regular Categories */}
                {Object.values(Category).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                      activeCategory === cat 
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md transform scale-105' 
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                
                {/* Spacer for right scrolling comfort */}
                <div className="w-2 shrink-0"></div>
             </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pt-4 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'inventory' && (
              <InventoryView 
                items={items} 
                category={activeCategory} 
                onUpdate={() => {}} // No-op now, driven by subscription
              />
            )}
            
            {activeTab === 'take' && (
              <QuickTakeView 
                items={items}
                onComplete={() => {
                  alert("✅ 庫存已更新！");
                  setActiveTab('inventory');
                }}
              />
            )}

            {activeTab === 'add' && (
              <QuickAddView 
                items={items}
                onComplete={() => {
                  alert("✅ 進貨成功！");
                  setActiveTab('inventory');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-200 flex justify-around pb-2 pt-2 z-50"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center p-3 w-full transition-colors active:bg-slate-50 ${
                isActive ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`mb-1 relative`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-xs font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-1 bg-brand-600 rounded-t-full" />
              )}
            </button>
          )
        })}
      </nav>
      
      {/* Safe area spacer for bottom nav */}
      <div className="h-28 shrink-0" />
    </div>
  );
};

export default App;