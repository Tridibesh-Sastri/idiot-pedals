import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem } from '../types';
import { STORAGE_KEYS } from '../services/apiConfig';

/**
 * Flagship pedal product used as the default item in the cart.
 * Seeded automatically for instant demonstration of the e-commerce flow.
 */
export const NEON_FUZZ_BOX: CartItem = {
  id: 'neon-fuzz-box',
  name: 'Neon Fuzz Box',
  subtitle: 'Handwired Analog Fuzz / Overdrive Pedal',
  price: 2499,
  originalPrice: 3499,
  quantity: 1,
  image: '/assets/pedal_preview.jpg',
};

/**
 * Shape of the data and operations provided by the CartContext.
 */
interface CartContextType {
  /** Array of active cart line items */
  items: CartItem[];
  /** Add a product to the cart or increment its quantity */
  addItem: (item?: CartItem, quantity?: number) => void;
  /** Remove an item from the cart by unique ID */
  removeItem: (id: string) => void;
  /** Update quantity of an existing item */
  updateQuantity: (id: string, quantity: number) => void;
  /** Remove all items from the cart */
  clearCart: () => void;
  /** Calculated sum of (price * quantity) across all line items */
  subtotal: number;
  /** Standard shipping cost (0 = free nationwide shipping) */
  shippingFee: number;
  /** Final calculated order total (subtotal + shippingFee) */
  total: number;
  /** Total count of individual physical pedal units in the cart */
  totalQuantity: number;
  /** Boolean flag controlling the slide-over cart drawer visibility */
  isCartOpen: boolean;
  /** Direct setter to show or hide the cart drawer */
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * CartProvider Component
 *
 * Manages shopping cart line items with automatic browser LocalStorage
 * persistence and reactive total calculations.
 */
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State: Cart items initialized from localStorage or default seed
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CART);
      return stored ? JSON.parse(stored) : [NEON_FUZZ_BOX];
    } catch {
      return [NEON_FUZZ_BOX];
    }
  });

  // State: Slide-over drawer visibility
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync cart contents to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
    } catch {
      // Storage unavailable or quota exceeded; fallback gracefully
    }
  }, [items]);

  /**
   * Adds an item to the cart. If the item already exists, its quantity is incremented.
   * Also triggers the slide-over cart drawer to open.
   */
  const addItem = (item = NEON_FUZZ_BOX, qty = 1) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [...prev, { ...item, quantity: qty }];
    });
    setIsCartOpen(true);
  };

  /**
   * Removes an item completely from the cart by its ID
   */
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  /**
   * Updates an item's quantity. If the new quantity is 0 or less, the item is removed.
   */
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  };

  /**
   * Clears all items from the cart
   */
  const clearCart = () => {
    setItems([]);
  };

  // Reactive price calculations
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = 0; // Free insured shipping nationwide for launch
  const total = subtotal + shippingFee;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

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
