import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Toast Notification Data Structure
 */
export interface Toast {
  /** Unique identifier for the toast */
  id: string;
  /** Semantic type controlling color and iconography */
  type: 'success' | 'error' | 'info';
  /** Human-readable message to display */
  message: string;
  /** Optional custom duration in milliseconds before auto-dismissal */
  duration?: number;
}

/**
 * Context Interface for Toast Notifications
 */
interface ToastContextType {
  /** Current list of active toast notifications */
  toasts: Toast[];
  /** Dispatch a new toast notification */
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  /** Explicitly remove a toast by its ID */
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * ToastProvider Component
 *
 * Manages toast notifications with automatic dismissal timer.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * Removes a toast from active state by ID
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Dispatches a new toast notification.
   * Creates a unique ID and schedules automatic removal after 3.5 seconds.
   */
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message }]);

      // Automatically dismiss the toast after 3500ms
      setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

/**
 * Custom hook to dispatch and manage toasts.
 * Throws an error if invoked outside of a ToastProvider.
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
