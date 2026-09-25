import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem } from '../types';
import { STORAGE_KEYS } from '../services/apiConfig';
import { secureStorage, getAuthoritativePrice } from '../lib/security';

export const NEON_FUZZ_BOX: CartItem = {
  id: 'neon-fuzz-box',
  name: 'Neon Fuzz Box',
  subtitle: 'Handwired Analog Fuzz / Overdrive Pedal',
  price: 2499,
  originalPrice: 3499,
  quantity: 1,
  image: '/assets/pedal_preview.jpg',
};

interface CartContextType {
  items: CartItem[];
  addItem: (item?: CartItem, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  shippingFee: number;
  total: number;
  totalQuantity: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State: Cart items initialized with authoritative pricing verification
  const [items, setItems] = useState<CartItem[]>(() => {
    const raw = secureStorage.get<CartItem[]>(STORAGE_KEYS.CART, [NEON_FUZZ_BOX]);
    if (!Array.isArray(raw)) return [NEON_FUZZ_BOX];
    
    // Sanitize and re-bind to immutable ledger prices
    return raw.map((i) => ({
      ...i,
      price: getAuthoritativePrice(i.id),
      quantity: Math.max(1, Math.min(5, Number(i.quantity) || 1)),
    }));
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync cart contents securely
  useEffect(() => {
    secureStorage.set(STORAGE_KEYS.CART, items);
  }, [items]);

  const addItem = (item = NEON_FUZZ_BOX, qty = 1) => {
    const safeQty = Math.max(1, Math.min(5, qty));
    setItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, price: getAuthoritativePrice(i.id), quantity: Math.min(5, i.quantity + safeQty) }
            : i
        );
      }
      return [...prev, { ...item, price: getAuthoritativePrice(item.id), quantity: safeQty }];
    });
    setIsCartOpen(true);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    const safeQty = Math.min(5, Math.max(1, quantity));
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, price: getAuthoritativePrice(i.id), quantity: safeQty } : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  // Authoritative price calculations — immune to devtools DOM/state manipulation
  const subtotal = items.reduce(
    (sum, item) => sum + getAuthoritativePrice(item.id) * Math.min(5, Math.max(1, item.quantity)),
    0
  );
  const shippingFee = 0;
  const total = subtotal + shippingFee;
  const totalQuantity = items.reduce((sum, item) => sum + Math.min(5, Math.max(1, item.quantity)), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
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
