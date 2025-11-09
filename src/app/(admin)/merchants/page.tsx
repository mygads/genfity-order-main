"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

interface Merchant {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  enableTax: boolean;
  taxPercentage: string;
  createdAt: string;
}

export default function MerchantsPage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);

  // Fetch merchants from API
  const fetchMerchants = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      const url = activeOnly 
        ? "/api/admin/merchants?activeOnly=true"
        : "/api/admin/merchants";

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/auth/signin");
          return;
        }
        throw new Error("Failed to fetch merchants");
      }

      const data = await response.json();
      setMerchants(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  // Toggle merchant status
  const handleToggleStatus = async (merchantId: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/admin/merchants/${merchantId}/toggle`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to toggle merchant status");
      }

      // Refresh merchants list
      fetchMerchants();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  // Delete merchant
  const handleDelete = async (merchantId: string, merchantName: string) => {
    if (!confirm(`Are you sure you want to delete "${merchantName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete merchant");
      }

      // Refresh merchants list
      fetchMerchants();
      alert("Merchant deleted successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete merchant");
    }
  };

  return (
    <>
      <PageBreadCrumb pageTitle="Merchants Management" />

      <div className="mt-6">
        <ComponentCard
          title="All Merchants"
          desc="Manage restaurant merchants and their settings"
        >
          {/* Actions Bar */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-stroke"
                />
                <span>Active Only</span>
              </label>
              <button
                onClick={fetchMerchants}
                className="rounded bg-gray-2 px-4 py-2 text-sm font-medium hover:bg-gray-3 dark:bg-meta-4 dark:hover:bg-opacity-80"
              >
                Refresh
              </button>
            </div>
            <button
              onClick={() => router.push("/admin/merchants/create")}
              className="rounded bg-primary px-6 py-2.5 font-medium text-white hover:bg-opacity-90"
            >
              + Create Merchant
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-10 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-2 text-sm text-body-color">Loading merchants...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Merchants Table */}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Code
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Merchant Name
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Email
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Phone
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Tax
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Status
                    </th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {merchants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center">
                        <p className="text-body-color">No merchants found</p>
                        <button
                          onClick={() => router.push("/admin/merchants/create")}
                          className="mt-4 text-primary hover:underline"
                        >
                          Create your first merchant
                        </button>
                      </td>
                    </tr>
                  ) : (
                    merchants.map((merchant) => (
                      <tr key={merchant.id} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm text-meta-3">
                            {merchant.code}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-black dark:text-white">
                            {merchant.name}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm">{merchant.email}</td>
                        <td className="px-4 py-4 text-sm">{merchant.phone}</td>
                        <td className="px-4 py-4 text-sm">
                          {merchant.enableTax ? `${merchant.taxPercentage}%` : "No Tax"}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleToggleStatus(merchant.id)}
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                              merchant.isActive
                                ? "bg-success bg-opacity-10 text-success"
                                : "bg-danger bg-opacity-10 text-danger"
                            }`}
                          >
                            {merchant.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/admin/merchants/${merchant.id}`)}
                              className="text-primary hover:underline"
                              title="View Details"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => router.push(`/admin/merchants/${merchant.id}/edit`)}
                              className="text-meta-5 hover:underline"
                              title="Edit"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(merchant.id, merchant.name)}
                              className="text-danger hover:underline"
                              title="Delete"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          {!loading && !error && merchants.length > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-stroke pt-4 dark:border-strokedark">
              <p className="text-sm text-body-color">
                Showing {merchants.length} merchant{merchants.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </ComponentCard>
      </div>
    </>
  );
}
