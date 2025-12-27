
import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Notification, useNotification } from '../../contexts/NotificationContext';

const ToastItem: React.FC<{ notification: Notification }> = ({ notification }) => {
    const { removeNotification } = useNotification();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Déclencher l'animation d'entrée
        const timer = requestAnimationFrame(() => setIsVisible(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        // Attendre la fin de l'animation de sortie avant de retirer du DOM
        setTimeout(() => removeNotification(notification.id), 300);
    };

    const icons = {
        success: <CheckCircle size={20} className="text-emerald-500" />,
        error: <AlertCircle size={20} className="text-red-500" />,
        warning: <AlertTriangle size={20} className="text-amber-500" />,
        info: <Info size={20} className="text-blue-500" />
    };

    const styles = {
        success: 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900/30 shadow-emerald-900/5',
        error: 'bg-white dark:bg-slate-800 border-red-100 dark:border-red-900/30 shadow-red-900/5',
        warning: 'bg-white dark:bg-slate-800 border-amber-100 dark:border-amber-900/30 shadow-amber-900/5',
        info: 'bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900/30 shadow-blue-900/5'
    };

    return (
        <div 
            className={`
                pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm
                transform transition-all duration-300 ease-out max-w-sm w-full
                ${styles[notification.type]}
                ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}
            `}
            role="alert"
        >
            <div className="shrink-0 mt-0.5">{icons[notification.type]}</div>
            <div className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">
                {notification.message}
            </div>
            <button 
                onClick={handleClose} 
                className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export const ToastContainer = () => {
    const { notifications } = useNotification();

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none items-end p-4 sm:p-0">
            {notifications.map((notification) => (
                <ToastItem key={notification.id} notification={notification} />
            ))}
        </div>
    );
};
