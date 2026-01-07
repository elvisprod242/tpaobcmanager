
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    duration?: number;
}

interface NotificationContextType {
    addNotification: (type: NotificationType, message: string, duration?: number) => void;
    removeNotification: (id: string) => void;
    notifications: Notification[];
    unreadSystemCount: number;
    clearSystemNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadSystemCount, setUnreadSystemCount] = useState(0);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const addNotification = useCallback((type: NotificationType, message: string, duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newNotification = { id, type, message, duration };
        
        setNotifications((prev) => [...prev, newNotification]);
        
        // Incrémente le compteur pour la cloche du header
        setUnreadSystemCount(prev => prev + 1);

        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }, [removeNotification]);

    const clearSystemNotifications = useCallback(() => {
        setUnreadSystemCount(0);
    }, []);

    return (
        <NotificationContext.Provider value={{ addNotification, removeNotification, notifications, unreadSystemCount, clearSystemNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
