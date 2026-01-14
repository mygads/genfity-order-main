"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import InviteStaffModal from "@/components/staff/InviteStaffModal";
import AddStaffModal from "@/components/staff/AddStaffModal";
import StaffPermissionsModal from "@/components/staff/StaffPermissionsModal";
import StaffViewModal, { type StaffViewItem } from "@/components/staff/StaffViewModal";
import EditStaffModal from "@/components/staff/EditStaffModal";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { StaffPageSkeleton } from "@/components/common/SkeletonLoaders";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useContextualHint, CONTEXTUAL_HINTS, useClickHereHint, CLICK_HINTS } from "@/lib/tutorial";
import { STAFF_PERMISSIONS } from "@/lib/constants/permissions";
import IconToggle from "@/components/ui/IconToggle";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { FaEye, FaTrash, FaUserShield, FaEdit } from "react-icons/fa";

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
  invitationStatus?: 'WAITING' | 'ACCEPTED' | null;
  invitedAt?: string | null;
  acceptedAt?: string | null;
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
  const { showHint } = useContextualHint();
  const { showClickHint } = useClickHereHint();

  // Staff management is owner-only
  const isCurrentUserOwner = user?.role === 'MERCHANT_OWNER';

  useEffect(() => {
    if (user && !isCurrentUserOwner) {
      router.replace('/admin/dashboard');
    }
  }, [user, isCurrentUserOwner, router]);

  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewStaff, setViewStaff] = useState<StaffViewItem | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [savingToggle, setSavingToggle] = useState<Record<string, { active?: boolean; driver?: boolean }>>({});

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

  const updateStaffCache = useCallback(
    (
      current: StaffApiResponse | undefined,
      updater: (prev: Staff[]) => Staff[]
    ): StaffApiResponse => {
      const base: StaffApiResponse = current ?? { success: true, data: { staff: [] } };
      const prevStaff = base.data?.staff ?? [];
      return {
        ...base,
        data: {
          ...base.data,
          staff: updater(prevStaff),
        },
      };
    },
    []
  );

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

  // Show contextual hint on first visit
  useEffect(() => {
    if (!loading) {
      showHint(CONTEXTUAL_HINTS.staffFirstVisit);
      // If no staff, show click hint pointing to Add Staff button
      if (staff.length === 0) {
        setTimeout(() => {
          showClickHint(CLICK_HINTS.addStaffButton);
        }, 1000);
      }
    }
  }, [loading, staff.length, showHint, showClickHint]);

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

  const handleAskDeleteStaff = (staffMember: Staff) => {
    setStaffToDelete(staffMember);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    if (!isCurrentUserOwner) return;

    setDeleteLoading(true);
    const staffMember = staffToDelete;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      await mutateStaff(
        async (current) => {
          const response = await fetch(`/api/merchant/staff?userId=${staffMember.userId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.message || "Failed to remove staff");
          }

          return updateStaffCache(current, (prev) => prev.filter((s) => s.userId !== staffMember.userId));
        },
        {
          optimisticData: (current) =>
            updateStaffCache(current, (prev) => prev.filter((s) => s.userId !== staffMember.userId)),
          rollbackOnError: true,
          revalidate: false,
          populateCache: true,
        }
      );

      showSuccess("Success", `${staffMember.name} removed successfully`);
      setShowDeleteConfirm(false);
      setStaffToDelete(null);
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to remove staff");
    } finally {
      setDeleteLoading(false);
    }
  };

  /**
   * Open permissions modal for a staff member
   */
  const handleOpenPermissions = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setShowPermissionsModal(true);
  };

  const handleOpenView = (staffMember: Staff) => {
    setViewStaff(staffMember);
    setShowViewModal(true);
  };

  const handleOpenEdit = (staffMember: Staff) => {
    if (!isCurrentUserOwner) return;
    if (staffMember.role === 'MERCHANT_OWNER') return;
    if (staffMember.invitationStatus === 'WAITING') return;
    setEditStaff(staffMember);
    setShowEditModal(true);
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

      // Use userId instead of id - the API expects the user ID, not the merchantUser ID
      const response = await fetch(`/api/merchant/staff/${selectedStaff.userId}/permissions`, {
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

      // Fetch latest data so the permissions UI stays in sync.
      await fetchStaff();

      setShowPermissionsModal(false);
      setSelectedStaff(null);
      // Keep UI snappy; background revalidate is optional.
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
    if (!isCurrentUserOwner) return;
    if (staffMember.role === 'MERCHANT_OWNER') return;

    try {
      setSavingToggle((prev) => ({
        ...prev,
        [staffMember.userId]: { ...(prev[staffMember.userId] || {}), active: true },
      }));

      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      // Use userId instead of id - the API expects the user ID, not the merchantUser ID
      const nextIsActive = !staffMember.isActive;

      await mutateStaff(
        async (current) => {
          const response = await fetch(`/api/merchant/staff/${staffMember.userId}/permissions`, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ isActive: nextIsActive }),
          });

          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(data?.message || "Failed to update status");
          }

          return updateStaffCache(current, (prev) =>
            prev.map((s) => (s.userId === staffMember.userId ? { ...s, isActive: nextIsActive } : s))
          );
        },
        {
          optimisticData: (current) =>
            updateStaffCache(current, (prev) =>
              prev.map((s) => (s.userId === staffMember.userId ? { ...s, isActive: nextIsActive } : s))
            ),
          rollbackOnError: true,
          revalidate: false,
          populateCache: true,
        }
      );

      showSuccess("Success", `${staffMember.name} ${nextIsActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSavingToggle((prev) => ({
        ...prev,
        [staffMember.userId]: { ...(prev[staffMember.userId] || {}), active: false },
      }));
    }
  };

  const handleToggleDriverAccess = async (staffMember: Staff) => {
    if (!isCurrentUserOwner) return;
    if (staffMember.role === 'MERCHANT_OWNER') return;
    if (staffMember.invitationStatus === 'WAITING') {
      showError('Error', 'Staff invitation must be accepted before enabling driver access.');
      return;
    }

    const current = staffMember.permissions || [];
    const hasDriver = current.includes(STAFF_PERMISSIONS.DRIVER_DASHBOARD);
    const next = hasDriver
      ? current.filter((p) => p !== STAFF_PERMISSIONS.DRIVER_DASHBOARD)
      : [...new Set([...current, STAFF_PERMISSIONS.DRIVER_DASHBOARD])];

    try {
      setSavingToggle((prev) => ({
        ...prev,
        [staffMember.userId]: { ...(prev[staffMember.userId] || {}), driver: true },
      }));

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const nextHasDriver = !hasDriver;

      await mutateStaff(
        async (currentResp) => {
          const response = await fetch(`/api/merchant/staff/${staffMember.userId}/permissions`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ permissions: next }),
          });

          const json = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(json?.message || 'Failed to update driver access');
          }

          return updateStaffCache(currentResp, (prev) =>
            prev.map((s) => (s.userId === staffMember.userId ? { ...s, permissions: next } : s))
          );
        },
        {
          optimisticData: (currentResp) =>
            updateStaffCache(currentResp, (prev) =>
              prev.map((s) => (s.userId === staffMember.userId ? { ...s, permissions: next } : s))
            ),
          rollbackOnError: true,
          revalidate: false,
          populateCache: true,
        }
      );

      showSuccess('Success', nextHasDriver ? 'Driver access enabled' : 'Driver access disabled');
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to update driver access');
    } finally {
      setSavingToggle((prev) => ({
        ...prev,
        [staffMember.userId]: { ...(prev[staffMember.userId] || {}), driver: false },
      }));
    }
  };

  const handleSaveStaffEdits = async (values: { name: string; phone?: string; newPassword?: string }) => {
    if (!editStaff) return;
    if (!isCurrentUserOwner) return;
    if (editStaff.role === 'MERCHANT_OWNER') return;
    if (editStaff.invitationStatus === 'WAITING') return;

    setEditLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      await mutateStaff(
        async (current) => {
          const response = await fetch(`/api/merchant/staff/${editStaff.userId}`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: values.name,
              phone: values.phone,
              newPassword: values.newPassword,
            }),
          });

          const json = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(json?.message || 'Failed to update staff');
          }

          return updateStaffCache(current, (prev) =>
            prev.map((s) =>
              s.userId === editStaff.userId
                ? {
                    ...s,
                    name: values.name,
                    phone: values.phone,
                  }
                : s
            )
          );
        },
        {
          optimisticData: (current) =>
            updateStaffCache(current, (prev) =>
              prev.map((s) =>
                s.userId === editStaff.userId
                  ? {
                      ...s,
                      name: values.name,
                      phone: values.phone,
                    }
                  : s
              )
            ),
          rollbackOnError: true,
          revalidate: false,
          populateCache: true,
        }
      );

      showSuccess('Success', 'Staff updated successfully');
      setShowEditModal(false);
      setEditStaff(null);
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to update staff');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div data-tutorial="staff-page">
      <ToastContainer toasts={toasts} />
      <PageBreadcrumb pageTitle={t("admin.staff.title")} />

      <div className="mt-6 space-y-5">
        {/* Header Actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/3" data-tutorial="staff-actions">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-50 max-w-md">
              <div className="relative" data-tutorial="staff-search">
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

            {isCurrentUserOwner && (
              <div className="flex flex-wrap gap-3" data-tutorial="staff-buttons">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 transition-all hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-400"
                  data-tutorial="add-staff-btn"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  {t("admin.staff.addStaff")}
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600"
                  data-tutorial="invite-staff-btn"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t("admin.staff.inviteViaEmail")}
                </button>
              </div>
            )}
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
                      Invite
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      {t("admin.staff.joined")}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      Active
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      Driver
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
                        {member.role === 'MERCHANT_OWNER' ? (
                          <span className="text-sm text-gray-400 dark:text-gray-600">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                              member.invitationStatus === 'WAITING'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            }`}
                          >
                            {member.invitationStatus === 'WAITING' ? 'Waiting' : 'Accepted'}
                          </span>
                        )}
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
                        {member.role === 'MERCHANT_OWNER' ? (
                          <span className="text-sm text-gray-400 dark:text-gray-600">—</span>
                        ) : (
                          <IconToggle
                            checked={member.isActive}
                            onChange={() => handleToggleStatus(member)}
                            disabled={!isCurrentUserOwner || Boolean(savingToggle[member.userId]?.active)}
                            label="Active"
                            ariaLabel={`Toggle active for ${member.name}`}
                            size="sm"
                            variant="iconOnly"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {member.role === 'MERCHANT_OWNER' ? (
                          <span className="text-sm text-gray-400 dark:text-gray-600">—</span>
                        ) : (
                          <IconToggle
                            checked={(member.permissions || []).includes(STAFF_PERMISSIONS.DRIVER_DASHBOARD)}
                            onChange={() => handleToggleDriverAccess(member)}
                            disabled={
                              !isCurrentUserOwner ||
                              member.invitationStatus === 'WAITING' ||
                              Boolean(savingToggle[member.userId]?.driver)
                            }
                            label="Driver"
                            ariaLabel={`Toggle driver access for ${member.name}`}
                            size="sm"
                            variant="iconOnly"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenView(member)}
                            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                            title="View staff details"
                          >
                            <FaEye className="h-4 w-4" />
                          </button>

                          {/* Edit staff - accepted only */}
                          {member.role !== 'MERCHANT_OWNER' && isCurrentUserOwner && member.invitationStatus !== 'WAITING' && (
                            <button
                              onClick={() => handleOpenEdit(member)}
                              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                              title="Edit staff"
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                          )}

                          {/* Permissions button - only for non-owners, and only owner can see */}
                          {member.role !== 'MERCHANT_OWNER' && isCurrentUserOwner && (
                            <button
                              onClick={() => handleOpenPermissions(member)}
                              disabled={member.invitationStatus === 'WAITING'}
                              className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors ${
                                member.invitationStatus === 'WAITING'
                                  ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                                  : 'text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20'
                              }`}
                              title={member.invitationStatus === 'WAITING' ? 'Invitation must be accepted first' : t("admin.staff.managePermissions")}
                            >
                              <FaUserShield className="h-4 w-4" />
                            </button>
                          )}
                          {/* Delete button - only for non-owners */}
                          {member.role !== 'MERCHANT_OWNER' && isCurrentUserOwner && (
                            <button
                              onClick={() => handleAskDeleteStaff(member)}
                              className="inline-flex items-center justify-center rounded-lg p-2 text-error-600 transition-colors hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                              aria-label={`Remove ${member.name}`}
                              title="Remove staff"
                            >
                              <FaTrash className="h-4 w-4" />
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

      {showViewModal && viewStaff && (
        <StaffViewModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setViewStaff(null);
          }}
          staff={viewStaff}
        />
      )}

      {showEditModal && editStaff && (
        <EditStaffModal
          isOpen={showEditModal}
          staff={editStaff}
          isLoading={editLoading}
          onClose={() => {
            setShowEditModal(false);
            setEditStaff(null);
          }}
          onSave={handleSaveStaffEdits}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (deleteLoading) return;
          setShowDeleteConfirm(false);
          setStaffToDelete(null);
        }}
        onConfirm={handleConfirmDeleteStaff}
        title="Remove staff"
        message={
          staffToDelete
            ? `Remove ${staffToDelete.name} from your staff? This will revoke their access to this merchant.`
            : 'Remove this staff member?'
        }
        confirmText={deleteLoading ? 'Removing...' : 'Remove'}
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
