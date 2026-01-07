
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, CheckCheck, Check, MessageCircle, Loader2 } from 'lucide-react';
import { User as UserType, Message } from '../types';
import { api } from '../services/api';

interface ChatProps {
    currentUser: UserType;
}

export const Chat = ({ currentUser }: ChatProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isDirector = currentUser.role === 'directeur';

    // 1. Initialisation de l'utilisateur cible
    useEffect(() => {
        const initChatUser = async () => {
            try {
                const allUsers = await api.getAllUsers();
                
                // Détermination automatique de l'interlocuteur (Logique Démo Simplifiée)
                let target: UserType | undefined;

                if (isDirector) {
                    target = allUsers.find(u => u.role === 'obc');
                } else {
                    target = allUsers.find(u => u.role === 'directeur');
                }

                if (target) {
                    setSelectedUser(target);
                }
            } catch (error) {
                console.error("Erreur init user chat", error);
            } finally {
                setIsLoading(false);
            }
        };
        initChatUser();
    }, [currentUser, isDirector]);

    // 2. Souscription aux messages en temps réel (Firestore onSnapshot)
    useEffect(() => {
        setIsLoading(true);
        // La fonction retourne la méthode unsubscribe pour le nettoyage
        const unsubscribe = api.subscribeToMessages((msgs) => {
            setMessages(msgs);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 3. Gestion des lectures & Scroll
    useEffect(() => {
        if (selectedUser && messages.length > 0) {
            // Marquer comme lu si on est le destinataire et que ce n'est pas lu
            const hasUnread = messages.some(m => m.senderId === selectedUser.id && m.receiverId === currentUser.id && !m.read);
            if (hasUnread) {
                api.markMessagesAsRead(selectedUser.id, currentUser.id);
            }
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, selectedUser, currentUser]);

    // Ajustement hauteur textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [newMessage]);

    const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        const content = newMessage.trim();
        setNewMessage(''); // Clear UI immédiatement
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        const msg: Message = {
            id: `msg_${Date.now()}`,
            senderId: currentUser.id,
            receiverId: selectedUser.id,
            content: content,
            timestamp: new Date().toISOString(),
            read: false
        };

        await api.sendMessage(msg);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const activeConversation = useMemo(() => {
        if (!selectedUser) return [];
        return messages.filter(m => 
            (m.senderId === currentUser.id && m.receiverId === selectedUser.id) ||
            (m.senderId === selectedUser.id && m.receiverId === currentUser.id)
        ); // Déjà trié par timestamp dans la souscription API
    }, [messages, selectedUser, currentUser]);

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading && !messages.length) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!selectedUser) {
        return (
            <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500">
                <MessageCircle size={48} className="opacity-50 mb-4" />
                <p className="text-lg font-medium">Aucun interlocuteur trouvé.</p>
                <p className="text-sm">Le système nécessite un compte 'OBC' et un compte 'Directeur' enregistrés.</p>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in flex-col">
            
            {/* Header Chat */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {selectedUser.avatarUrl ? (
                                <img src={selectedUser.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                selectedUser.prenom[0]
                            )}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">
                            {selectedUser.prenom} {selectedUser.nom}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                            {selectedUser.role === 'obc' ? 'Manager OBC (Terrain)' : 'Direction Générale'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/20 scroll-smooth">
                {activeConversation.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse">
                            <MessageCircle size={32} className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium">Démarrez la conversation en temps réel.</p>
                    </div>
                ) : (
                    activeConversation.map((msg, index) => {
                        const isMe = msg.senderId === currentUser.id;
                        const showAvatar = !isMe && (index === 0 || activeConversation[index - 1].senderId !== msg.senderId);
                        
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 animate-zoom-in`}>
                                {!isMe && (
                                    <div className={`w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                                        {selectedUser.avatarUrl ? <img src={selectedUser.avatarUrl} className="rounded-full w-full h-full object-cover" /> : selectedUser.prenom[0]}
                                    </div>
                                )}
                                
                                <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3 shadow-sm relative group transition-all ${
                                    isMe 
                                    ? 'bg-blue-600 text-white rounded-br-sm' 
                                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-200 dark:border-slate-600'
                                }`}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                                    <div className={`text-[10px] mt-1.5 flex items-center gap-1 justify-end opacity-70 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {formatTime(msg.timestamp)}
                                        {isMe && (
                                            msg.read ? <CheckCheck size={14} strokeWidth={1.5} /> : <Check size={14} strokeWidth={1.5} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto w-full items-end">
                    <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Écrivez votre message..." 
                        className="flex-1 px-5 py-3.5 bg-slate-100 dark:bg-slate-900 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all placeholder:text-slate-400 resize-none min-h-[56px] max-h-32 custom-scrollbar"
                        rows={1}
                        autoFocus
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim()}
                        className="p-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center aspect-square h-[56px] shrink-0"
                    >
                        <Send size={22} className={newMessage.trim() ? "translate-x-0.5" : ""} />
                    </button>
                </form>
            </div>
        </div>
    );
};
