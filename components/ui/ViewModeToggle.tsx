
import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'grid' | 'list';

export const ViewModeToggle = ({ mode, setMode }: { mode: ViewMode, setMode: (m: ViewMode) => void }) => (
    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
        <button 
            onClick={() => setMode('grid')} 
            className={`p-2 rounded-lg transition-all duration-200 ${mode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-white scale-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
            title="Vue Grille"
        >
            <LayoutGrid size={18} />
        </button>
        <button 
            onClick={() => setMode('list')} 
            className={`p-2 rounded-lg transition-all duration-200 ${mode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-white scale-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}
            title="Vue Liste"
        >
            <List size={18} />
        </button>
    </div>
);
