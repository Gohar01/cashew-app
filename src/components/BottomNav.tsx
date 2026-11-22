import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenAddModal,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-3 py-2 z-40 flex items-center justify-around shadow-lg">
      <button
        onClick={() => onTabChange('dashboard')}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
          activeTab === 'dashboard' ? 'text-amber-600 font-bold' : 'text-slate-500 font-medium'
        }`}
      >
        <LayoutDashboard size={20} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
        <span className="text-[10px]">Overview</span>
      </button>

      <button
        onClick={() => onTabChange('transactions')}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
          activeTab === 'transactions' ? 'text-amber-600 font-bold' : 'text-slate-500 font-medium'
        }`}
      >
        <Receipt size={20} strokeWidth={activeTab === 'transactions' ? 2.5 : 2} />
        <span className="text-[10px]">History</span>
      </button>

      {/* Floating Center Action Button */}
      <button
        onClick={onOpenAddModal}
        className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/35 border-2 border-white active:scale-95 transition-all cursor-pointer"
        aria-label="Add transaction"
      >
        <Plus size={24} strokeWidth={2.8} />
      </button>

      <button
        onClick={() => onTabChange('budgets')}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
          activeTab === 'budgets' ? 'text-amber-600 font-bold' : 'text-slate-500 font-medium'
        }`}
      >
        <PieChart size={20} strokeWidth={activeTab === 'budgets' ? 2.5 : 2} />
        <span className="text-[10px]">Budgets</span>
      </button>

      <button
        onClick={() => onTabChange('import-export')}
        className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors cursor-pointer ${
          activeTab === 'import-export' ? 'text-amber-600 font-bold' : 'text-slate-500 font-medium'
        }`}
      >
        <FileSpreadsheet size={20} strokeWidth={activeTab === 'import-export' ? 2.5 : 2} />
        <span className="text-[10px]">Data</span>
      </button>
    </div>
  );
};
