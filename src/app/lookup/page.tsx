"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface MerchantInfo {
  code: string;
  name: string;
  description: string | null;
  address: string;
  phone: string;
  currency: string;
  isActive: boolean;
}

export default function MerchantLookupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchantCode, setMerchantCode] = useState("");
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!merchantCode.trim()) {
      setError("Please enter a merchant code");
      return;
    }

    setLoading(true);
    setError(null);
    setMerchant(null);

    try {
      const response = await fetch(`/api/public/merchant/${merchantCode.trim()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Merchant not found");
      }

      setMerchant(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleViewMenu = () => {
    if (merchant) {
      router.push(`/menu/${merchant.code}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-2 p-4 dark:bg-boxdark-2">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black dark:text-white">GENFITY</h1>
          <p className="mt-2 text-lg text-body-color">Online Ordering System</p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-boxdark">
          <h2 className="mb-6 text-2xl font-bold text-black dark:text-white">Find Your Restaurant</h2>
          
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Enter Merchant Code
              </label>
              <input
                type="text"
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value)}
                placeholder="e.g., REST001"
                className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-lg uppercase text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
              <p className="mt-2 text-sm text-body-color">
                Ask your restaurant staff for their merchant code
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-primary px-6 py-3 text-lg font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search Merchant"}
            </button>
          </form>
        </div>

        {merchant && (
          <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-boxdark">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-black dark:text-white">{merchant.name}</h3>
              {merchant.isActive ? (
                <span className="inline-flex rounded-full bg-success/10 px-4 py-1.5 text-sm font-medium text-success">
                  Active
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-meta-1/10 px-4 py-1.5 text-sm font-medium text-meta-1">
                  Inactive
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-body-color">Merchant Code</p>
                  <p className="mt-1 text-lg font-bold text-primary">{merchant.code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-body-color">Phone</p>
                  <p className="mt-1 text-base text-black dark:text-white">{merchant.phone}</p>
                </div>
              </div>

              {merchant.description && (
                <div>
                  <p className="text-sm font-medium text-body-color">About</p>
                  <p className="mt-1 text-base text-black dark:text-white">{merchant.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-body-color">Address</p>
                <p className="mt-1 text-base text-black dark:text-white">{merchant.address}</p>
              </div>

              <div className="border-t border-stroke pt-6 dark:border-strokedark">
                {merchant.isActive ? (
                  <button
                    onClick={handleViewMenu}
                    className="w-full rounded bg-primary px-6 py-3 text-lg font-medium text-white hover:bg-opacity-90"
                  >
                    View Menu & Order
                  </button>
                ) : (
                  <div className="rounded-lg bg-warning/10 p-4">
                    <p className="text-center text-sm text-warning">
                      This merchant is currently inactive. Please contact the restaurant directly.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-body-color">
            Need help?{" "}
            <a href="mailto:support@genfity.com" className="text-primary hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
