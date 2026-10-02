import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem } from '../types';
import { STORAGE_KEYS } from '../services/apiConfig';
import { secureStorage } from '../lib/security';

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  replaceItem: (item: CartItem) => void;
  clearCart: () => void;
  subtotal: number;
  shippingFee: number;
  total: number;
  totalQuantity: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const MAX_QUANTITY = 10;

const clampQuantity = (value: unknown): number => {
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(MAX_QUANTITY, parsed));
};

/**
 * Validates a persisted cart line. Prices here are DISPLAY ONLY — the server
 * recalculates every total from its own catalogue at order time. We only keep
 * lines whose shape is sane so hand-edited storage can't crash the UI.
 */
const sanitizeStoredItem = (value: unknown): CartItem | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  const id = typeof record.id === 'string' ? record.id : '';
  const name = typeof record.name === 'string' ? record.name : '';
  const price = Number(record.price);

  if (!id || !name || !Number.isFinite(price) || price < 0) return null;

  return {
    id,
    name,
    subtitle: typeof record.subtitle === 'string' ? record.subtitle : '',
    price,
    quantity: clampQuantity(record.quantity),
    image: typeof record.image === 'string' ? record.image : '',
    slug: typeof record.slug === 'string' ? record.slug : undefined,
    currency: typeof record.currency === 'string' ? record.currency : 'INR',
    availableStock: Number.isFinite(Number(record.availableStock)) ? Number(record.availableStock) : undefined,
  };
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const raw = secureStorage.get<unknown>(STORAGE_KEYS.CART, []);
    if (!Array.isArray(raw)) return [];
    return raw
      .map(sanitizeStoredItem)
      .filter((item): item is CartItem => item !== null);
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Persist cart contents (shape-sanitised on the way in).
  useEffect(() => {
    secureStorage.set(STORAGE_KEYS.CART, items);
  }, [items]);

  const addItem = useCallback((item: CartItem, quantity = 1) => {
    if (!item || typeof item.id !== 'string' || !item.id) return;

    const safeQty = clampQuantity(quantity);

    setItems((prev) => {
      const exists = prev.find((entry) => entry.id === item.id);
      if (exists) {
        return prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                // refresh display data from the latest product fetch
                name: item.name,
                subtitle: item.subtitle,
                price: item.price,
                image: item.image,
                availableStock: item.availableStock,
                quantity: Math.min(MAX_QUANTITY, entry.quantity + safeQty),
              }
            : entry
        );
      }

      return [...prev, { ...item, quantity: safeQty }];
    });

    setIsCartOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(id);
        return;
      }
      const safeQty = clampQuantity(quantity);
      setItems((prev) => prev.map((entry) => (entry.id === id ? { ...entry, quantity: safeQty } : entry)));
    },
    [removeItem]
  );

  /** Re-sync a single line with freshly fetched product data. */
  const replaceItem = useCallback((item: CartItem) => {
    setItems((prev) =>
      prev.map((entry) =>
        entry.id === item.id
          ? { ...entry, name: item.name, subtitle: item.subtitle, price: item.price, image: item.image, availableStock: item.availableStock }
          : entry
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = items.reduce((sum, item) => sum + item.price * clampQuantity(item.quantity), 0);
  const shippingFee = 0;
  const total = subtotal + shippingFee;
  const totalQuantity = items.reduce((sum, item) => sum + clampQuantity(item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        replaceItem,
        clearCart,
        subtotal,
        shippingFee,
        total,
        totalQuantity,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

/**
 * Custom hook to access the CartContext.
 * Throws an informative error if used outside a CartProvider.
 */
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
