"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

interface MerchantProfile {
  id: string;
  name: string;
  code: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  taxPercentage: string;
  enableTax: boolean;
  isActive: boolean;
}

interface FormData {
  name: string;
  description: string;
  phoneNumber: string;
  taxRate: number;
}

export default function MerchantProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    phoneNumber: "",
    taxRate: 10,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/signin");
          return;
        }

        const response = await fetch("/api/merchant/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        const merchantData = data.data;
        
        setProfile(merchantData);
        setFormData({
          name: merchantData.name,
          description: merchantData.description || "",
          phoneNumber: merchantData.phone,
          taxRate: parseFloat(merchantData.taxPercentage),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

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
        router.push("/signin");
        return;
      }

      const response = await fetch("/api/merchant/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      setSuccess("Profile updated successfully!");
      setEditMode(false);
      
      // Refresh profile data
      const updatedData = data.data;
      setProfile(updatedData);
      setFormData({
        name: updatedData.name,
        description: updatedData.description || "",
        phoneNumber: updatedData.phone,
        taxRate: parseFloat(updatedData.taxPercentage),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageBreadCrumb pageTitle="Merchant Profile" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-body-color">Loading profile...</p>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <PageBreadCrumb pageTitle="Merchant Profile" />
        <div className="mt-6">
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">Profile not found</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBreadCrumb pageTitle="Merchant Profile" />

      <div className="mt-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {editMode ? (
          <ComponentCard title="Edit Profile">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  onClick={() => {
                    setEditMode(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="rounded border border-stroke px-6 py-2.5 font-medium hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded bg-primary px-6 py-2.5 font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </ComponentCard>
        ) : (
          <>
            <ComponentCard title="Basic Information">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-body-color">Merchant Code</p>
                    <p className="mt-1 text-base text-black dark:text-white">{profile.code}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-body-color">Status</p>
                    <p className="mt-1">
                      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                        profile.isActive 
                          ? 'bg-success/10 text-success' 
                          : 'bg-meta-1/10 text-meta-1'
                      }`}>
                        {profile.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-body-color">Merchant Name</p>
                    <p className="mt-1 text-base text-black dark:text-white">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-body-color">Email</p>
                    <p className="mt-1 text-base text-black dark:text-white">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-body-color">Phone</p>
                    <p className="mt-1 text-base text-black dark:text-white">{profile.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-body-color">Currency</p>
                    <p className="mt-1 text-base text-black dark:text-white">{profile.currency}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-body-color">Address</p>
                  <p className="mt-1 text-base text-black dark:text-white">{profile.address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-body-color">Description</p>
                  <p className="mt-1 text-base text-black dark:text-white">{profile.description || '-'}</p>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard title="Tax Settings">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-body-color">Tax Enabled</p>
                    <p className="mt-1 text-base text-black dark:text-white">{profile.enableTax ? 'Yes' : 'No'}</p>
                  </div>
                  {profile.enableTax && (
                    <div>
                      <p className="text-sm font-medium text-body-color">Tax Percentage</p>
                      <p className="mt-1 text-base text-black dark:text-white">{profile.taxPercentage}%</p>
                    </div>
                  )}
                </div>
              </div>
            </ComponentCard>

            <div className="flex justify-end">
              <button
                onClick={() => setEditMode(true)}
                className="rounded bg-primary px-6 py-2.5 font-medium text-white hover:bg-opacity-90"
              >
                Edit Profile
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
