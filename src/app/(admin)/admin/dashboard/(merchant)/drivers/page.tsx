"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { StaffPageSkeleton } from "@/components/common/SkeletonLoaders";
import AddDriverModal from "@/components/drivers/AddDriverModal";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { StatusToggle } from "@/components/common/StatusToggle";

interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  joinedAt?: string;
  source?: "driver" | "staff";
}

interface DriversApiResponse {
  success: boolean;
  data: Driver[];
}

export default function DriversManagementPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toasts, success: showSuccess, error: showError } = useToast();
  const { user } = useAdminAuth();

  const [search, setSearch] = useState("");
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const {
    data: driversResponse,
    error: driversError,
    isLoading,
    mutate: mutateDrivers,
  } = useSWRStatic<DriversApiResponse>("/api/merchant/drivers?includeInactive=1");

  const drivers = useMemo(() => (Array.isArray(driversResponse?.data) ? driversResponse?.data : []), [driversResponse]);

  const fetchDrivers = useCallback(async () => {
    await mutateDrivers();
  }, [mutateDrivers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const s = search.trim().toLowerCase();
      if (!s) {
        setFilteredDrivers(drivers);
        return;
      }

      setFilteredDrivers(
        drivers.filter((d) => d.name.toLowerCase().includes(s) || d.email.toLowerCase().includes(s))
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [search, drivers]);

  const handleDeleteDriver = async (driver: Driver) => {
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/drivers/${driver.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to remove driver access");
      }

      showSuccess("Success", `${driver.name} removed from drivers`);
      fetchDrivers();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to remove driver access");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return <StaffPageSkeleton />;
  }

  if (driversError) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Error Loading Drivers</h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{driversError?.message || "Failed to load drivers"}</p>
          <button
            onClick={() => fetchDrivers()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-white transition-colors hover:bg-brand-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.role === "MERCHANT_OWNER";

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <PageBreadcrumb pageTitle={t("admin.drivers.title")} />

      <div className="mt-6 space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-50 max-w-md flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search drivers by name or email..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                  </svg>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                >
                  Add Driver
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Drivers</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage delivery driver accounts for your merchant.</p>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredDrivers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h13l3 5v6a2 2 0 01-2 2h-1a2 2 0 01-2-2H8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">No drivers found</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add a driver from your accepted staff members.</p>
              </div>
            ) : (
              filteredDrivers.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-55 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 10-8 0v4M5 11h14l-1 10H6L5 11z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{d.email}{d.phone ? ` • ${d.phone}` : ""}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusToggle
                      isActive={d.isActive}
                      onToggle={() => {}}
                      disabled
                      size="sm"
                      activeLabel={t("common.active")}
                      inactiveLabel={t("common.inactive")}
                    />

                    {isOwner && (
                      <button
                        onClick={() => setDriverToDelete(d)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        Delete Driver
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!driverToDelete}
        onClose={() => {
          if (deleteLoading) return;
          setDriverToDelete(null);
        }}
        onConfirm={() => {
          if (!driverToDelete) return;
          void handleDeleteDriver(driverToDelete);
        }}
        title={"Remove driver access"}
        message={driverToDelete ? `Remove ${driverToDelete.name} from drivers? They will lose driver portal access.` : "Remove this driver?"}
        confirmText={deleteLoading ? "Removing..." : "Remove"}
        cancelText={"Cancel"}
        variant="danger"
      />

      <AddDriverModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          showSuccess("Success", "Driver access granted successfully");
          fetchDrivers();
        }}
      />
    </div>
  );
}
