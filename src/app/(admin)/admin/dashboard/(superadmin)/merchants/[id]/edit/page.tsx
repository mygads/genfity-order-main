"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

interface MerchantFormData {
  name: string;
  description: string;
  phoneNumber: string;
  taxRate: number;
}

export default function EditMerchantPage() {
  const router = useRouter();
  const params = useParams();
  const merchantId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<MerchantFormData>({
    name: "",
    description: "",
    phoneNumber: "",
    taxRate: 10,
  });

  useEffect(() => {
    const fetchMerchant = async () => {
      try {
        setLoading(true);
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
          throw new Error("Failed to fetch merchant");
        }

        const data = await response.json();
        const merchant = data.data;
        
        setFormData({
          name: merchant.name,
          description: merchant.description || "",
          phoneNumber: merchant.phone,
          taxRate: parseFloat(merchant.taxPercentage),
        });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "number") {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      const response = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update merchant");
      }

      setSuccess("Merchant updated successfully!");
      
      setTimeout(() => {
        router.push(`/admin/merchants/${merchantId}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageBreadCrumb pageTitle="Edit Merchant" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-body-color">Loading merchant...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBreadCrumb pageTitle="Edit Merchant" />

      <div className="mt-6">
        <ComponentCard title="Update Merchant Information">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                <p className="mt-2 text-xs text-green-500">Redirecting...</p>
              </div>
            )}

            <div>
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Merchant Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Tax Rate (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="taxRate"
                value={formData.taxRate}
                onChange={handleChange}
                required
                min="0"
                max="100"
                step="0.01"
                className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-stroke pt-6 dark:border-strokedark">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded border border-stroke px-6 py-2.5 font-medium hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-primary px-6 py-2.5 font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Update Merchant"}
              </button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
