"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import InviteStaffModal from "@/components/staff/InviteStaffModal";
import AddStaffModal from "@/components/staff/AddStaffModal";
import StaffPermissionsModal from "@/components/staff/StaffPermissionsModal";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { StaffPageSkeleton } from "@/components/common/SkeletonLoaders";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface Staff {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
  permissions?: string[];
}

interface StaffApiResponse {
  success: boolean;
  data: {
    staff: Staff[];
  };
}

export default function StaffManagementPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toasts, success: showSuccess, error: showError } = useToast();
  const { user } = useAdminAuth();

  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // SWR hook for data fetching with caching
  const {
    data: staffResponse,
    error: staffError,
    isLoading,
    mutate: mutateStaff
  } = useSWRStatic<StaffApiResponse>('/api/merchant/staff');

  // Extract data from SWR response
  const staff = React.useMemo(() => staffResponse?.data?.staff || [], [staffResponse]);
  const loading = isLoading;

  // Function to refetch data (for backwards compatibility)
  const fetchStaff = useCallback(async () => {
    await mutateStaff();
  }, [mutateStaff]);

  // Search filter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim()) {
        const filtered = staff.filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase())
        );
        setFilteredStaff(filtered);
      } else {
        setFilteredStaff(staff);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, staff]);

  // Show skeleton loader during initial load
  if (loading) {
    return <StaffPageSkeleton />;
  }

  // Show error state if fetch failed
  if (staffError) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Error Loading Staff
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {staffError?.message || 'Failed to load staff members'}
          </p>
          <button
            onClick={() => fetchStaff()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleDeleteStaff = async (staffMember: Staff) => {
    if (!window.confirm(`Remove ${staffMember.name} from your staff?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/staff?userId=${staffMember.userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to remove staff");
      }

      showSuccess("Success", `${staffMember.name} removed successfully`);
      fetchStaff();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to remove staff");
    }
  };

  /**
   * Open permissions modal for a staff member
   */
  const handleOpenPermissions = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setShowPermissionsModal(true);
  };

  /**
   * Save updated permissions for a staff member
   */
  const handleSavePermissions = async (permissions: string[]) => {
    if (!selectedStaff) return;

    setPermissionsLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/staff/${selectedStaff.id}/permissions`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permissions }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update permissions");
      }

      showSuccess("Success", t("admin.staff.permissionsSaved"));
      setShowPermissionsModal(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : t("admin.staff.permissionsSaveError"));
    } finally {
      setPermissionsLoading(false);
    }
  };

  /**
   * Toggle staff active status
   */
  const handleToggleStatus = async (staffMember: Staff) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/staff/${staffMember.id}/permissions`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !staffMember.isActive }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update status");
      }

      showSuccess("Success", `${staffMember.name} ${!staffMember.isActive ? 'activated' : 'deactivated'}`);
      fetchStaff();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to update status");
    }
  };

  // Check if current user is owner
  const isCurrentUserOwner = user?.role === 'MERCHANT_OWNER';

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <PageBreadcrumb pageTitle={t("admin.staff.title")} />

      <div className="mt-6 space-y-5">
        {/* Header Actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("admin.staff.searchPlaceholder")}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                <svg
                  className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 transition-all hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-400"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                {t("admin.staff.addStaff")}
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t("admin.staff.inviteViaEmail")}
              </button>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("admin.staff.subtitle")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredStaff.length} staff member{filteredStaff.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading staff...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {search ? t("admin.staff.noStaff") : t("admin.staff.noStaffYet")}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {search ? 'Try adjusting your search' : 'Add or invite staff to get started'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-800 dark:bg-gray-900/50">
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      {t("admin.staff.name")}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      {t("admin.staff.email")}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      {t("admin.staff.role")}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      {t("admin.staff.status")}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      {t("admin.staff.joined")}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      {t("admin.staff.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {member.name}
                            </p>
                            {member.phone && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {member.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {member.email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${member.role === 'MERCHANT_OWNER'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                          {member.role === 'MERCHANT_OWNER' ? t("admin.staff.owner") : t("admin.staff.staffRole")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${member.isActive
                            ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${member.isActive ? 'bg-success-500' : 'bg-gray-400'}`}></span>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(member.joinedAt).toLocaleDateString('en-AU', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {/* Permissions button - only for non-owners, and only owner can see */}
                          {member.role !== 'MERCHANT_OWNER' && isCurrentUserOwner && (
                            <button
                              onClick={() => handleOpenPermissions(member)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
                              title={t("admin.staff.managePermissions")}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              {t("admin.staff.permissions")}
                            </button>
                          )}
                          {/* Toggle status button - only for non-owners, and only owner can see */}
                          {member.role !== 'MERCHANT_OWNER' && isCurrentUserOwner && (
                            <button
                              onClick={() => handleToggleStatus(member)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                member.isActive
                                  ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                                  : 'text-success-600 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-900/20'
                              }`}
                              title={t("admin.staff.toggleStatus")}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {member.isActive ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                )}
                              </svg>
                              {member.isActive ? t("admin.staff.inactive") : t("admin.staff.active")}
                            </button>
                          )}
                          {/* Delete button - only for non-owners */}
                          {member.role !== 'MERCHANT_OWNER' && (
                            <button
                              onClick={() => handleDeleteStaff(member)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-error-600 transition-colors hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteStaffModal
          show={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            showSuccess("Success", "Staff invitation sent successfully");
            fetchStaff();
          }}
        />
      )}

      {showAddModal && (
        <AddStaffModal
          show={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            showSuccess("Success", "Staff added successfully");
            fetchStaff();
          }}
        />
      )}

      {showPermissionsModal && selectedStaff && (
        <StaffPermissionsModal
          isOpen={showPermissionsModal}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedStaff(null);
          }}
          onSave={handleSavePermissions}
          staffName={selectedStaff.name}
          currentPermissions={selectedStaff.permissions || []}
          isOwner={selectedStaff.role === 'MERCHANT_OWNER'}
          isLoading={permissionsLoading}
        />
      )}
    </div>
  );
}
