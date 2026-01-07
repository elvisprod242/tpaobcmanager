
import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children?: ReactNode;
    footer?: ReactNode;
    size?: 'default' | 'large' | 'full';
}

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'default' }: ModalProps) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Ensure we are mounted and document.body exists to prevent "Minified React error #306"
    if (!isOpen || !mounted || typeof document === 'undefined' || !document.body) return null;

    const sizeClasses = {
        default: 'max-w-2xl',
        large: 'max-w-5xl h-[90vh]',
        full: 'max-w-full h-full m-4'
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />
            <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-700 animate-zoom-in`}>
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                    {children}
                </div>
                {footer && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-b-2xl flex gap-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
