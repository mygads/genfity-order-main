"use client";

import React, { useEffect, useMemo, useState } from "react";
import { STAFF_PERMISSIONS } from "@/lib/constants/permissions";
import { fetchMerchantApi } from "@/lib/utils/orderApiClient";

interface AddDriverModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type StaffRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  permissions?: string[];
  invitationStatus?: "WAITING" | "ACCEPTED" | null;
};

export default function AddDriverModal({ show, onClose, onSuccess }: AddDriverModalProps) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleStaff = useMemo(() => {
    return staff
      .filter((s) => s.isActive)
      .filter((s) => s.invitationStatus !== "WAITING")
      .filter((s) => !(s.permissions || []).includes(STAFF_PERMISSIONS.DRIVER_DASHBOARD));
  }, [staff]);

  useEffect(() => {
    let cancelled = false;

    async function loadStaff() {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("accessToken");
        if (!token) {
          window.location.href = "/admin/login";
          return;
        }

        const res = await fetchMerchantApi("/api/merchant/staff", {
          token,
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.message || "Failed to load staff list");
        }

        const rows = (json?.data?.staff || []) as StaffRow[];
        if (!cancelled) {
          setStaff(rows);
          setSelectedUserId("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load staff list");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (show) {
      loadStaff();
    }

    return () => {
      cancelled = true;
    };
  }, [show]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUserId) {
      setError("Please select a staff member");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const response = await fetchMerchantApi("/api/merchant/drivers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUserId,
        }),
        token,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to add driver");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add driver");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setSelectedUserId("");
      setError(null);
      onClose();
    }
  };

  const isDirty = selectedUserId.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (isDirty) return;
        handleClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Driver</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Grant driver access to accepted staff</p>
            </div>
            <button
              onClick={handleClose}
              disabled={saving}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg bg-error-50 p-3 dark:bg-error-900/20">
              <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Staff Member *</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loading || saving}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900"
            >
              <option value="">{loading ? "Loading staff..." : "Choose staff"}</option>
              {eligibleStaff.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Only accepted and active staff can be added as drivers.
            </p>
          </div>

          {!loading && eligibleStaff.length === 0 && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
              <p className="text-sm text-gray-700 dark:text-gray-300">No eligible staff found.</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Invite staff first and ensure they accept the invitation.</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading || !selectedUserId}
              className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
