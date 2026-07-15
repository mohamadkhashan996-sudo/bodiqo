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
  variantId?: string;
  variantTitle?: string;
};

export function cartLineKey(productId: string, variantId?: string) {
  return `${productId}:${variantId ?? ""}`;
}

type AddItemInput = CatalogProduct & {
  variantId?: string;
  variantTitle?: string;
  price?: number;
  image?: string;
};

type CartState = {
  items: CartItem[];
  addItem: (product: AddItemInput, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
  ) => void;
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
        const variantId = product.variantId;
        const lineKey = cartLineKey(product.id, variantId);
        set((state) => {
          const existing = state.items.find(
            (i) => cartLineKey(i.productId, i.variantId) === lineKey,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                cartLineKey(i.productId, i.variantId) === lineKey
                  ? {
                      ...i,
                      quantity: Math.min(20, Number(i.quantity) + qty),
                    }
                  : i,
              ),
            };
          }
          const title = product.variantTitle
            ? `${product.title} — ${product.variantTitle}`
            : product.title;
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                slug: product.slug,
                title,
                image: product.image ?? "",
                price: Number(product.price),
                quantity: qty,
                variantId,
                variantTitle: product.variantTitle,
              },
            ],
          };
        });
      },
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => cartLineKey(i.productId, i.variantId) !== cartLineKey(productId, variantId),
          ),
        })),
      updateQuantity: (productId, quantity, variantId) => {
        const qty = Number(quantity);
        const lineKey = cartLineKey(productId, variantId);
        set((state) => ({
          items:
            !Number.isFinite(qty) || qty <= 0
              ? state.items.filter(
                  (i) => cartLineKey(i.productId, i.variantId) !== lineKey,
                )
              : state.items.map((i) =>
                  cartLineKey(i.productId, i.variantId) === lineKey
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
        const state = {
          ...current,
          ...(persisted as object),
        } as typeof current;
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
