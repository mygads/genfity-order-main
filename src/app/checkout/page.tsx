"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CartItem {
  itemId: string;
  quantity: number;
  itemName: string;
  price: string;
}

interface OrderFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: {
    itemId: string;
    quantity: number;
  }[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchantCode, setMerchantCode] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
  });

  useEffect(() => {
    // Load cart from sessionStorage
    const storedCart = sessionStorage.getItem("cart");
    const storedMerchantCode = sessionStorage.getItem("merchantCode");
    
    if (!storedCart || !storedMerchantCode) {
      router.push("/lookup");
      return;
    }

    setCart(JSON.parse(storedCart));
    setMerchantCode(storedMerchantCode);
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const orderData: OrderFormData = {
        ...formData,
        items: cart.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity
        }))
      };

      const response = await fetch(`/api/public/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantCode,
          ...orderData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create order");
      }

      // Clear cart
      sessionStorage.removeItem("cart");
      sessionStorage.removeItem("merchantCode");

      // Redirect to tracking page
      router.push(`/track/${data.data.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-2 p-4 dark:bg-boxdark-2">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-primary hover:underline"
          >
            ← Back to Menu
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Order Form */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow dark:bg-boxdark">
              <h2 className="mb-6 text-2xl font-bold text-black dark:text-white">Customer Information</h2>
              
              {error && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="mb-2.5 block font-medium text-black dark:text-white">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    required
                    className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2.5 block font-medium text-black dark:text-white">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleChange}
                    required
                    className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2.5 block font-medium text-black dark:text-white">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    required
                    className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded bg-primary px-6 py-3 text-lg font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Placing Order..." : "Place Order"}
                </button>
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow dark:bg-boxdark">
              <h3 className="mb-4 text-xl font-bold text-black dark:text-white">Order Summary</h3>
              
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-center justify-between border-b border-stroke pb-3 dark:border-strokedark">
                    <div className="flex-1">
                      <p className="font-medium text-black dark:text-white">{item.itemName}</p>
                      <p className="text-sm text-body-color">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-black dark:text-white">
                      Rp {(parseFloat(item.price) * item.quantity).toLocaleString('id-ID')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex justify-between">
                  <p className="text-body-color">Subtotal</p>
                  <p className="font-medium text-black dark:text-white">
                    Rp {calculateSubtotal().toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="flex justify-between text-sm">
                  <p className="text-body-color">Tax (included)</p>
                  <p className="text-body-color">Calculated by merchant</p>
                </div>
                <div className="flex justify-between border-t border-stroke pt-2 dark:border-strokedark">
                  <p className="text-lg font-bold text-black dark:text-white">Estimated Total</p>
                  <p className="text-lg font-bold text-primary">
                    Rp {calculateSubtotal().toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Your order will be confirmed by the merchant. You will receive an order number for tracking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
