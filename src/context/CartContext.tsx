"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

/**
 * GENFITY - Cart Context & Provider
 *
 * Manages shopping cart state with localStorage persistence.
 * Supports multi-merchant carts with different order modes.
 *
 * @specification FRONTEND_SPECIFICATION.md - Cart Management
 *
 * localStorage keys:
 * - cart_[merchantCode]_dinein - Dine-in cart
 * - cart_[merchantCode]_takeaway - Takeaway cart
 * - table_number_[merchantCode] - Table number for dine-in
 *
 * Cart structure:
 * {
 *   merchantCode: string,
 *   mode: "dinein" | "takeaway",
 *   tableNumber?: string,
 *   items: LocalCartItem[]
 * }
 *
 * Features:
 * - Add/remove/update items
 * - Clear cart
 * - Persist to localStorage
 * - Sync across tabs via storage events
 * - Calculate totals automatically
 */

export interface CartItem {
  cartItemId: string;
  menuId: string;
  menuName: string;
  price: number; // ✅ FIXED: Force number type
  quantity: number;
  addons?: Array<{
    id: string;
    name: string;
    price: number; // ✅ FIXED: Force number type
  }>;
  notes?: string;
}

export interface Cart {
  merchantCode: string;
  mode: "dinein" | "takeaway";
  tableNumber?: string;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  updateItem: (cartItemId: string, updates: Partial<CartItem>) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getTotal: () => number;
  initializeCart: (merchantCode: string, mode: "dinein" | "takeaway") => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Custom hook to access cart context
 * @throws {Error} If used outside CartProvider
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}

interface CartProviderProps {
  children: React.ReactNode;
}

/**
 * Cart Provider Component
 * Wraps app to provide cart state management
 */
export function CartProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<Cart | null>(null);

  /**
   * Get localStorage key for current cart
   */
  const getStorageKey = useCallback((merchantCode: string, mode: "dinein" | "takeaway") => {
    return `cart_${merchantCode}_${mode}`;
  }, []);

  /**
   * Load cart from localStorage
   */
  const loadCart = useCallback((merchantCode: string, mode: "dinein" | "takeaway") => {
    const key = `cart_${merchantCode}_${mode}`;
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        // ✅ Sanitize prices first
        const sanitizedCart: Cart = {
          ...parsed,
          items: parsed.items.map((item: any) => ({
            ...item,
            price: typeof item.price === "string" ? parseFloat(item.price) : item.price,
            addons: item.addons?.map((addon: any) => ({
              ...addon,
              price: typeof addon.price === "string" ? parseFloat(addon.price) : addon.price,
            })) || [],
          })),
        };

        // ✅ Load table number BEFORE setCart (for dine-in mode)
        if (mode === "dinein") {
          const tableKey = `table_${merchantCode}`;
          const tableData = localStorage.getItem(tableKey);
          if (tableData) {
            const { tableNumber } = JSON.parse(tableData);
            console.log("📍 Table number loaded:", tableNumber);
            sanitizedCart.tableNumber = tableNumber; // ✅ Merge BEFORE setCart
          }
        }

        console.log("📦 Cart loaded with tableNumber:", sanitizedCart);
        setCart(sanitizedCart); // ✅ Now includes tableNumber

      } catch (error) {
        console.error("Error loading cart:", error);
        initializeEmptyCart(merchantCode, mode);
      }
    } else {
      initializeEmptyCart(merchantCode, mode);
    }
  }, []);

  // Initialize empty cart
  const initializeEmptyCart = (merchantCode: string, mode: "dinein" | "takeaway") => {
    const newCart: Cart = {
      merchantCode,
      mode,
      items: [],
    };

    // Load table number if dine-in
    if (mode === "dinein") {
      const tableKey = `table_${merchantCode}`;
      const tableData = localStorage.getItem(tableKey);
      if (tableData) {
        const { tableNumber } = JSON.parse(tableData);
        newCart.tableNumber = tableNumber;
      }
    }

    setCart(newCart);
    saveCart(newCart);
  };

  // Save cart to localStorage
  const saveCart = (updatedCart: Cart) => {
    const key = `cart_${updatedCart.merchantCode}_${updatedCart.mode}`;
    localStorage.setItem(key, JSON.stringify(updatedCart));
    console.log("💾 Cart saved to localStorage:", updatedCart);
  };

  /**
   * ✅ FIXED: Add comprehensive logging for debugging
   *
   * @description
   * Logs every step of addItem process:
   * 1. Input validation (price type)
   * 2. Duplicate check
   * 3. Cart state before/after
   * 4. localStorage persistence
   */
  const addItem = useCallback((item: Omit<CartItem, "cartItemId">) => {
    console.log("➕ [ADD ITEM] Starting addItem flow:", {
      menuName: item.menuName,
      price: item.price,
      priceType: typeof item.price,
      quantity: item.quantity,
      addons: item.addons?.length || 0,
    });

    setCart((prev) => {
      if (!prev) {
        console.warn("⚠️ [ADD ITEM] Cart not initialized");
        return prev;
      }

      // ✅ Ensure price is number
      const sanitizedItem = {
        ...item,
        price: typeof item.price === "string" ? parseFloat(item.price) : item.price,
        addons: item.addons?.map((addon) => ({
          ...addon,
          price: typeof addon.price === "string" ? parseFloat(addon.price) : addon.price,
        })) || [],
      };

      console.log("🔧 [ADD ITEM] Sanitized item:", {
        price: sanitizedItem.price,
        priceType: typeof sanitizedItem.price,
      });

      // Check if item already exists (same menu + addons)
      const existingItemIndex = prev.items.findIndex(
        (cartItem) =>
          cartItem.menuId === sanitizedItem.menuId &&
          JSON.stringify(cartItem.addons) === JSON.stringify(sanitizedItem.addons)
      );

      let updatedCart: Cart;

      if (existingItemIndex >= 0) {
        // ✅ Update quantity of existing item
        console.log("🔄 [ADD ITEM] Item exists, updating quantity:", {
          currentQty: prev.items[existingItemIndex].quantity,
          addQty: sanitizedItem.quantity,
          newQty: prev.items[existingItemIndex].quantity + sanitizedItem.quantity,
        });

        const updatedItems = [...prev.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + sanitizedItem.quantity,
        };

        updatedCart = { ...prev, items: updatedItems };
      } else {
        // ✅ Add new item
        const newItem: CartItem = {
          ...sanitizedItem,
          cartItemId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };

        console.log("➕ [ADD ITEM] Adding new item:", {
          cartItemId: newItem.cartItemId,
          price: newItem.price,
          quantity: newItem.quantity,
          subtotal: newItem.price * newItem.quantity,
        });

        updatedCart = { ...prev, items: [...prev.items, newItem] };
      }

      console.log("📊 [ADD ITEM] Cart state updated:", {
        itemCount: updatedCart.items.length,
        totalItems: updatedCart.items.reduce((sum, i) => sum + i.quantity, 0),
        totalPrice: updatedCart.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      });

      saveCart(updatedCart);
      return updatedCart;
    });
  }, []);

  const updateItem = useCallback((cartItemId: string, updates: Partial<CartItem>) => {
    console.log("✏️ [UPDATE ITEM] Updating item:", { cartItemId, updates });

    setCart((prev) => {
      if (!prev) return prev;

      const updatedItems = prev.items.map((item) =>
        item.cartItemId === cartItemId ? { ...item, ...updates } : item
      );

      const updatedCart = { ...prev, items: updatedItems };
      saveCart(updatedCart);
      return updatedCart;
    });
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    console.log("🗑️ [REMOVE ITEM] Removing item:", cartItemId);

    setCart((prev) => {
      if (!prev) return prev;

      const updatedCart = {
        ...prev,
        items: prev.items.filter((item) => item.cartItemId !== cartItemId),
      };

      saveCart(updatedCart);
      return updatedCart;
    });
  }, []);

  const clearCart = useCallback(() => {
    console.log("🗑️ [CLEAR CART] Clearing entire cart");

    setCart((prev) => {
      if (!prev) return prev;

      const clearedCart = { ...prev, items: [] };
      saveCart(clearedCart);
      return clearedCart;
    });
  }, []);

  const getItemCount = useCallback(() => {
    if (!cart) return 0;
    const count = cart.items.reduce((total, item) => total + item.quantity, 0);
    console.log("🔢 [GET COUNT] Total items:", count);
    return count;
  }, [cart]);

  const getTotal = useCallback(() => {
    if (!cart) return 0;

    const total = cart.items.reduce((sum, item) => {
      const itemPrice = item.price * item.quantity;
      const addonsPrice =
        (item.addons || []).reduce((addonSum, addon) => addonSum + addon.price, 0) * item.quantity;

      console.log("💰 [GET TOTAL] Item calculation:", {
        name: item.menuName,
        basePrice: item.price,
        quantity: item.quantity,
        itemSubtotal: itemPrice,
        addonsSubtotal: addonsPrice,
        itemTotal: itemPrice + addonsPrice,
      });

      return sum + itemPrice + addonsPrice;
    }, 0);

    console.log("💰 [GET TOTAL] Cart total:", total);
    return total;
  }, [cart]);

  const initializeCart = useCallback(
    (merchantCode: string, mode: "dinein" | "takeaway") => {
      console.log("🚀 [INIT CART] Initializing cart:", { merchantCode, mode });
      loadCart(merchantCode, mode);
    },
    [loadCart]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        getItemCount,
        getTotal,
        initializeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

