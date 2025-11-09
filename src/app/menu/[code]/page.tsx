"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isAvailable: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  items: MenuItem[];
}

interface MenuData {
  merchantName: string;
  merchantCode: string;
  categories: Category[];
}

export default function PublicMenuPage() {
  const params = useParams();
  const router = useRouter();
  const merchantCode = params?.code as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [cart, setCart] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/menu/${merchantCode}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch menu");
        }

        setMenuData(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (merchantCode) {
      fetchMenu();
    }
  }, [merchantCode]);

  const addToCart = (itemId: string) => {
    setCart(prev => {
      const newCart = new Map(prev);
      const currentQty = newCart.get(itemId) || 0;
      newCart.set(itemId, currentQty + 1);
      return newCart;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = new Map(prev);
      const currentQty = newCart.get(itemId) || 0;
      if (currentQty > 1) {
        newCart.set(itemId, currentQty - 1);
      } else {
        newCart.delete(itemId);
      }
      return newCart;
    });
  };

  const getTotalItems = () => {
    return Array.from(cart.values()).reduce((sum, qty) => sum + qty, 0);
  };

  const proceedToCheckout = () => {
    if (cart.size === 0) {
      alert("Please add items to cart");
      return;
    }

    // Store cart data in sessionStorage
    const cartData = Array.from(cart.entries()).map(([itemId, quantity]) => {
      // Find item details
      let itemDetails: MenuItem | null = null;
      menuData?.categories.forEach(cat => {
        const found = cat.items.find(item => item.id === itemId);
        if (found) itemDetails = found;
      });
      
      return {
        itemId,
        quantity,
        itemName: itemDetails?.name || "",
        price: itemDetails?.price || "0"
      };
    });

    sessionStorage.setItem("cart", JSON.stringify(cartData));
    sessionStorage.setItem("merchantCode", merchantCode);
    
    router.push("/checkout");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-boxdark-2">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-body-color">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-2 p-4 dark:bg-boxdark-2">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-boxdark">
          <div className="mb-6 text-center">
            <svg className="mx-auto h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="mt-4 text-xl font-bold text-black dark:text-white">Error</h2>
            <p className="mt-2 text-sm text-body-color">{error || "Menu not found"}</p>
          </div>
          <button
            onClick={() => router.push("/lookup")}
            className="w-full rounded bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2 dark:bg-boxdark-2">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow dark:bg-boxdark">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">{menuData.merchantName}</h1>
              <p className="text-sm text-body-color">Code: {menuData.merchantCode}</p>
            </div>
            <button
              onClick={() => router.push("/lookup")}
              className="text-sm text-primary hover:underline"
            >
              Change Merchant
            </button>
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="mx-auto max-w-6xl p-4">
        <div className="space-y-8">
          {menuData.categories.length === 0 ? (
            <div className="rounded-lg bg-white p-12 text-center shadow dark:bg-boxdark">
              <p className="text-body-color">No menu items available</p>
            </div>
          ) : (
            menuData.categories.map((category) => (
              <div key={category.id} className="rounded-lg bg-white p-6 shadow dark:bg-boxdark">
                <h2 className="mb-4 text-xl font-bold text-black dark:text-white">{category.name}</h2>
                {category.description && (
                  <p className="mb-6 text-sm text-body-color">{category.description}</p>
                )}
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border border-stroke p-4 dark:border-strokedark ${
                        !item.isAvailable ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="mb-3">
                        <h3 className="font-medium text-black dark:text-white">{item.name}</h3>
                        {item.description && (
                          <p className="mt-1 text-sm text-body-color">{item.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-primary">
                          Rp {parseFloat(item.price).toLocaleString('id-ID')}
                        </p>
                        
                        {item.isAvailable ? (
                          cart.has(item.id) ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="flex h-8 w-8 items-center justify-center rounded bg-meta-1 text-white hover:bg-meta-1/90"
                              >
                                −
                              </button>
                              <span className="w-8 text-center font-medium text-black dark:text-white">
                                {cart.get(item.id)}
                              </span>
                              <button
                                onClick={() => addToCart(item.id)}
                                className="flex h-8 w-8 items-center justify-center rounded bg-primary text-white hover:bg-opacity-90"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item.id)}
                              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
                            >
                              Add
                            </button>
                          )
                        ) : (
                          <span className="text-sm text-meta-1">Unavailable</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cart Footer */}
      {cart.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg dark:bg-boxdark">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div>
              <p className="text-sm text-body-color">Total Items</p>
              <p className="text-2xl font-bold text-black dark:text-white">{getTotalItems()}</p>
            </div>
            <button
              onClick={proceedToCheckout}
              className="rounded bg-primary px-8 py-3 text-lg font-medium text-white hover:bg-opacity-90"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
