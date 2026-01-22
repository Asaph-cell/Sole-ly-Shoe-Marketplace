import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

export type CartItem = {
  productId: string;
  vendorId: string;
  name: string;
  priceKsh: number;
  imageUrl?: string | null;
  quantity: number;
  size?: string; // Selected shoe size (EU format)
  availableSizes?: string[]; // Sizes available for this product
  color?: string; // Selected product color
  availableColors?: string[]; // Colors available for this product
};

interface CartContextValue {
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateSize: (productId: string, size: string) => void;
  updateColor: (productId: string, color: string) => void;
  clearCart: () => void;
  hasAllSizes: () => boolean; // Check if all items have sizes selected (if required)
  hasAllColors: () => boolean; // Check if all items have colors selected (if required)
  hasAllValidSizes: () => boolean; // Check if all selected sizes are available

  getInvalidSizeItems: () => CartItem[]; // Get items with sizes not in available list
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "solely_cart_v1";

const loadInitialCart = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item.productId && item.vendorId && item.priceKsh >= 0);
  } catch (error) {
    console.error("Failed to parse cart from storage", error);
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadInitialCart);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem: CartContextValue["addItem"] = (item, quantity = 1) => {
    setItems((current) => {
      if (current.length > 0 && current[0].vendorId !== item.vendorId) {
        toast.error("You can only checkout items from one vendor at a time. Complete your current cart first.");
        return current;
      }
      const existing = current.find((c) => c.productId === item.productId);
      if (existing) {
        return current.map((c) =>
          c.productId === item.productId
            ? { ...c, quantity: Math.min(c.quantity + quantity, 10) }
            : c
        );
      }
      return [...current, { ...item, quantity: Math.max(1, Math.min(quantity, 10)) }];
    });
  };

  const removeItem: CartContextValue["removeItem"] = (productId) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const updateQuantity: CartContextValue["updateQuantity"] = (productId, quantity) => {
    setItems((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, Math.min(quantity, 10)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const updateSize: CartContextValue["updateSize"] = (productId, size) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, size } : item
      )
    );
  };

  const updateColor: CartContextValue["updateColor"] = (productId, color) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, color } : item
      )
    );
  };

  const hasAllSizes = (): boolean => {
    return items.length > 0 && items.every((item) => {
      // If product has sizes available, require a size selection
      if (item.availableSizes && item.availableSizes.length > 0) {
        return item.size && item.size.trim() !== "";
      }
      return true; // No sizes available means selection not required
    });
  };

  const hasAllColors = (): boolean => {
    return items.length > 0 && items.every((item) => {
      // If product has colors available, require a color selection
      if (item.availableColors && item.availableColors.length > 0) {
        return item.color && item.color.trim() !== "";
      }
      return true; // No colors available means selection not required
    });
  };

  // Check if all selected sizes are valid (exist in availableSizes)
  const hasAllValidSizes = (): boolean => {
    return items.every((item) => {
      // If no availableSizes, consider valid (product may not have size restrictions)
      if (!item.availableSizes || item.availableSizes.length === 0) return true;
      // If no size selected yet, not valid
      if (!item.size) return false;
      // Check if selected size is in available sizes
      return item.availableSizes.includes(item.size);
    });
  };

  // Get items where selected size is not in available sizes
  const getInvalidSizeItems = (): CartItem[] => {
    return items.filter((item) => {
      if (!item.availableSizes || item.availableSizes.length === 0) return false;
      if (!item.size) return false;
      return !item.availableSizes.includes(item.size);
    });
  };

  const clearCart = () => setItems([]);;

  const { totalQuantity, subtotal } = useMemo(() => {
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.quantity * item.priceKsh, 0);
    return { totalQuantity: quantity, subtotal: total };
  }, [items]);

  const value: CartContextValue = {
    items,
    totalQuantity,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    updateSize,
    clearCart,
    hasAllSizes,
    hasAllColors,
    hasAllValidSizes,
    getInvalidSizeItems,
    updateColor,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};


