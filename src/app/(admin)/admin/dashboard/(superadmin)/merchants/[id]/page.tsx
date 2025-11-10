"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

interface MerchantDetails {
  id: string;
  code: string;
  name: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  logoUrl: string | null;
  isActive: boolean;
  enableTax: boolean;
  taxPercentage: string;
  currency: string;
  createdAt: string;
  openingHours: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  merchantUsers: Array<{
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function MerchantDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const merchantId = params?.id as string;

  const [merchant, setMerchant] = useState<MerchantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMerchant = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/auth/signin");
          return;
        }

        const response = await fetch(`/api/admin/merchants/${merchantId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/auth/signin");
            return;
          }
          throw new Error("Failed to fetch merchant");
        }

        const data = await response.json();
        setMerchant(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (merchantId) {
      fetchMerchant();
    }
  }, [merchantId, router]);

  const handleToggleStatus = async () => {
    if (!merchant) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/admin/merchants/${merchant.id}/toggle`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to toggle status");
      }

      // Update local state
      setMerchant({ ...merchant, isActive: !merchant.isActive });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  if (loading) {
    return (
      <>
        <PageBreadCrumb pageTitle="Merchant Details" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-body-color">Loading merchant details...</p>
        </div>
      </>
    );
  }

  if (error || !merchant) {
    return (
      <>
        <PageBreadCrumb pageTitle="Merchant Details" />
        <div className="mt-6">
          <ComponentCard title="Error">
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error || "Merchant not found"}
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/merchants")}
              className="mt-4 text-primary hover:underline"
            >
              ← Back to Merchants
            </button>
          </ComponentCard>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBreadCrumb pageTitle={merchant.name} />

      <div className="mt-6 space-y-6">
        {/* Basic Information */}
        <ComponentCard title="Basic Information">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-body-color">
                Merchant Code
              </label>
              <p className="font-mono text-lg font-semibold text-meta-3">
                {merchant.code}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-body-color">
                Status
              </label>
              <button
                onClick={handleToggleStatus}
                className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${
                  merchant.isActive
                    ? "bg-success bg-opacity-10 text-success"
                    : "bg-danger bg-opacity-10 text-danger"
                }`}
              >
                {merchant.isActive ? "Active" : "Inactive"}
              </button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-body-color">
                Merchant Name
              </label>
              <p className="text-black dark:text-white">{merchant.name}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-body-color">
                Email
              </label>
              <p className="text-black dark:text-white">{merchant.email}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-body-color">
                Phone
              </label>
              <p className="text-black dark:text-white">{merchant.phone}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-body-color">
                Currency
              </label>
              <p className="text-black dark:text-white">{merchant.currency}</p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-body-color">
                Address
              </label>
              <p className="text-black dark:text-white">{merchant.address}</p>
            </div>

            {merchant.description && (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-body-color">
                  Description
                </label>
                <p className="text-black dark:text-white">{merchant.description}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3 border-t border-stroke pt-6 dark:border-strokedark">
            <button
              onClick={() => router.push(`/admin/merchants/${merchant.id}/edit`)}
              className="rounded bg-primary px-6 py-2.5 font-medium text-white hover:bg-opacity-90"
            >
              Edit Merchant
            </button>
            <button
              onClick={() => router.push("/admin/merchants")}
              className="rounded border border-stroke px-6 py-2.5 font-medium hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
            >
              Back to List
            </button>
          </div>
        </ComponentCard>

        {/* Tax Settings */}
        <ComponentCard title="Tax Settings">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-body-color">
                Tax Enabled
              </label>
              <p className="text-black dark:text-white">
                {merchant.enableTax ? "Yes" : "No"}
              </p>
            </div>

            {merchant.enableTax && (
              <div>
                <label className="mb-2 block text-sm font-medium text-body-color">
                  Tax Percentage
                </label>
                <p className="text-black dark:text-white">{merchant.taxPercentage}%</p>
              </div>
            )}
          </div>
        </ComponentCard>

        {/* Opening Hours */}
        <ComponentCard title="Opening Hours">
          {merchant.openingHours && merchant.openingHours.length > 0 ? (
            <div className="space-y-3">
              {merchant.openingHours.map((hour) => (
                <div
                  key={hour.dayOfWeek}
                  className="flex items-center justify-between border-b border-stroke py-3 last:border-0 dark:border-strokedark"
                >
                  <span className="font-medium text-black dark:text-white">
                    {DAYS[hour.dayOfWeek]}
                  </span>
                  {hour.isClosed ? (
                    <span className="text-danger">Closed</span>
                  ) : (
                    <span className="text-black dark:text-white">
                      {hour.openTime} - {hour.closeTime}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-color">No opening hours configured</p>
          )}
        </ComponentCard>

        {/* Staff/Owners */}
        <ComponentCard title="Staff & Owners">
          {merchant.merchantUsers && merchant.merchantUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="px-4 py-3 font-medium text-black dark:text-white">
                      Name
                    </th>
                    <th className="px-4 py-3 font-medium text-black dark:text-white">
                      Email
                    </th>
                    <th className="px-4 py-3 font-medium text-black dark:text-white">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {merchant.merchantUsers.map((mu, index) => (
                    <tr
                      key={index}
                      className="border-b border-stroke dark:border-strokedark"
                    >
                      <td className="px-4 py-3 text-black dark:text-white">
                        {mu.user.name}
                      </td>
                      <td className="px-4 py-3 text-black dark:text-white">
                        {mu.user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                            mu.role === "OWNER"
                              ? "bg-primary bg-opacity-10 text-primary"
                              : "bg-meta-5 bg-opacity-10 text-meta-5"
                          }`}
                        >
                          {mu.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-body-color">No staff members found</p>
          )}
        </ComponentCard>

        {/* Metadata */}
        <ComponentCard title="Metadata">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-body-color">
                Merchant ID
              </label>
              <p className="font-mono text-sm text-black dark:text-white">
                {merchant.id}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-body-color">
                Created At
              </label>
              <p className="text-black dark:text-white">
                {new Date(merchant.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
