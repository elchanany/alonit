'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error';
}

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType>({
    showToast: () => { },
});

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now().toString() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 2000);
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Container styles - BOTTOM CENTER
    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: '120px',
        left: '0',
        right: '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        zIndex: 999999,
        pointerEvents: 'none'
    };

    // Toast item styles
    const getToastStyle = (type: 'success' | 'error'): React.CSSProperties => ({
        backgroundColor: type === 'success' ? '#22c55e' : '#ef4444',
        color: 'white',
        padding: '14px 24px',
        borderRadius: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minWidth: '220px',
        maxWidth: '90vw',
        pointerEvents: 'auto'
    });

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {toasts.length > 0 && (
                <div style={containerStyle}>
                    {toasts.map(toast => (
                        <div
                            key={toast.id}
                            style={{
                                ...getToastStyle(toast.type),
                                animation: 'slideUpToast 0.3s ease-out'
                            }}
                        >
                            <span style={{ flex: 1, fontSize: '15px', fontWeight: 500 }}>
                                {toast.message}
                            </span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    padding: '0',
                                    lineHeight: '1',
                                    fontWeight: 'bold'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
