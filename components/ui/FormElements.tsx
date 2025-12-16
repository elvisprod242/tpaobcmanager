
import React from 'react';
import { ChevronDown } from 'lucide-react';

export const FormInput = ({ label, type = "text", value, onChange, placeholder, disabled = false, className = "", step }: any) => (
    <div className={className}>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{label}</label>
        <input 
            type={type} 
            value={value} 
            onChange={onChange} 
            disabled={disabled}
            step={step}
            className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} 
            placeholder={placeholder} 
        />
    </div>
);

export const FormSelect = ({ label, value, onChange, options, disabled = false }: any) => (
    <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{label}</label>
        <div className="relative">
            <select 
                value={value} 
                onChange={onChange} 
                disabled={disabled}
                className={`w-full appearance-none px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
                {options.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    </div>
);
