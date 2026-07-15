import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CatalogProduct } from "@/lib/catalog";

export type CartItem = {
  productId: string;
  slug: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (product: CatalogProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        const qty = Math.max(1, Math.min(20, Number(quantity) || 1));
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.id
                  ? {
                      ...i,
                      quantity: Math.min(20, Number(i.quantity) + qty),
                    }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                slug: product.slug,
                title: product.title,
                image: product.image,
                price: Number(product.price),
                quantity: qty,
              },
            ],
          };
        });
      },
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) => {
        const qty = Number(quantity);
        set((state) => ({
          items:
            !Number.isFinite(qty) || qty <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId
                    ? { ...i, quantity: Math.min(20, Math.floor(qty)) }
                    : i,
                ),
        }));
      },
      clearCart: () => set({ items: [] }),
      itemCount: () =>
        get().items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
      subtotal: () =>
        get().items.reduce(
          (sum, i) => sum + Number(i.price) * (Number(i.quantity) || 0),
          0,
        ),
    }),
    {
      name: "bodiqo-cart",
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as object) } as typeof current;
        state.items = (state.items || []).map((item) => ({
          ...item,
          price: Number(item.price),
          quantity: Math.max(1, Math.min(20, Number(item.quantity) || 1)),
        }));
        return state;
      },
    },
  ),
);
