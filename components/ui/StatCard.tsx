
import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300 group backdrop-blur-sm">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</p>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={22} className="text-white" />
            </div>
        </div>
        {trend && (
            <div className="mt-4 flex items-center text-sm">
                <span className={`flex items-center font-bold ${trend > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {trend > 0 ? <ArrowUpRight size={16} className="mr-0.5" /> : <ArrowUpRight size={16} className="mr-0.5 rotate-90" />}
                    {Math.abs(trend)}%
                </span>
                <span className="text-slate-400 dark:text-slate-500 ml-2 font-medium">vs mois dernier</span>
            </div>
        )}
    </div>
);
