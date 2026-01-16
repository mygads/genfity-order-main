"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CloseIcon } from "@/icons";

interface SubscriptionData {
  type: "TRIAL" | "DEPOSIT" | "MONTHLY";
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED";
  trialDaysRemaining: number | null;
  subscriptionEndsAt: string | null;
  balance: number;
  currency: string;
}

interface BalanceSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchantId: string;
  merchantName: string;
  currency: string;
  onSuccess?: () => void;
}

type TabType = "balance" | "subscription";
type SubscriptionType = "TRIAL" | "DEPOSIT" | "MONTHLY" | "";

export default function BalanceSubscriptionModal({
  isOpen,
  onClose,
  merchantId,
  merchantName,
  currency,
  onSuccess,
}: BalanceSubscriptionModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("balance");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Subscription data
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

  // Balance form
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceDescription, setBalanceDescription] = useState("");

  // Subscription form
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>("");
  const [monthlyPeriodMonths, setMonthlyPeriodMonths] = useState("1");
  const [extendDays, setExtendDays] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<"ACTIVE" | "SUSPENDED" | "">("");
  const [suspendReason, setSuspendReason] = useState("");

  // Fetch subscription data
  const fetchSubscriptionData = useCallback(async () => {
    try {
      setFetchLoading(true);
      setError(null);

      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/admin/merchants/${merchantId}/subscription`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSubscriptionData(data.data);
        }
      }
    } catch (err) {
      console.error("Error fetching subscription:", err);
    } finally {
      setFetchLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    if (isOpen && merchantId) {
      fetchSubscriptionData();
    }
  }, [isOpen, merchantId, fetchSubscriptionData]);

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceAmount) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const amount = parseFloat(balanceAmount);
      if (isNaN(amount)) {
        setError("Invalid amount");
        return;
      }

      const response = await fetch(`/api/admin/merchants/${merchantId}/balance/adjust`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          description: balanceDescription || `Manual adjustment by Super Admin`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(`Balance adjusted successfully. New balance: ${currency} ${data.data?.newBalance || amount}`);
        setBalanceAmount("");
        setBalanceDescription("");
        fetchSubscriptionData(); // Refresh data
        onSuccess?.();
      } else {
        setError(data.message || "Failed to adjust balance");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const body: Record<string, unknown> = {};

      // Handle subscription type change
      if (subscriptionType) {
        body.type = subscriptionType;
        if (subscriptionType === "MONTHLY") {
          const months = parseInt(monthlyPeriodMonths);
          if (isNaN(months) || months < 1 || months > 24) {
            setError("Period months must be between 1 and 24");
            return;
          }
          body.monthlyPeriodMonths = months;
        }
      }

      if (extendDays) {
        const days = parseInt(extendDays);
        if (isNaN(days) || days < 1 || days > 365) {
          setError("Days must be between 1 and 365");
          return;
        }
        body.extendDays = days;
      }

      if (subscriptionStatus) {
        body.status = subscriptionStatus;
        if (subscriptionStatus === "SUSPENDED" && suspendReason) {
          body.suspendReason = suspendReason;
        }
      }

      if (Object.keys(body).length === 0) {
        setError("Please provide at least one update");
        return;
      }

      const response = await fetch(`/api/admin/merchants/${merchantId}/subscription`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess("Subscription updated successfully");
        setSubscriptionType("");
        setMonthlyPeriodMonths("1");
        setExtendDays("");
        setSubscriptionStatus("");
        setSuspendReason("");
        fetchSubscriptionData(); // Refresh data
        onSuccess?.();
      } else {
        setError(data.message || "Failed to update subscription");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative z-50 mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Manage Merchant
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {merchantName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("balance")}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === "balance"
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Balance
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === "subscription"
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Subscription
          </button>
        </div>

        {/* Current Status */}
        {fetchLoading ? (
          <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <div className="animate-pulse">
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="mt-2 h-6 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </div>
        ) : subscriptionData ? (
          <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Current Balance</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white">
                  {subscriptionData.currency} {subscriptionData.balance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Subscription Type</p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    subscriptionData.type === "TRIAL"
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                      : subscriptionData.type === "DEPOSIT"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  }`}
                >
                  {subscriptionData.type}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Status</p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    subscriptionData.status === "ACTIVE"
                      ? "bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400"
                      : subscriptionData.status === "SUSPENDED"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {subscriptionData.status}
                </span>
              </div>
              {subscriptionData.trialDaysRemaining !== null && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Trial Days Left</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {subscriptionData.trialDaysRemaining} days
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-900/20 dark:text-error-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-success-50 p-3 text-sm text-success-600 dark:bg-success-900/20 dark:text-success-400">
            {success}
          </div>
        )}

        {/* Balance Tab */}
        {activeTab === "balance" && (
          <form onSubmit={handleAdjustBalance} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Amount ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="Enter amount (+ to add, - to deduct)"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Use positive number to add, negative to deduct
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description (Optional)
              </label>
              <input
                type="text"
                value={balanceDescription}
                onChange={(e) => setBalanceDescription(e.target.value)}
                placeholder="e.g., Promotional credit, Refund, etc."
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !balanceAmount}
              className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Processing..." : "Adjust Balance"}
            </button>
          </form>
        )}

        {/* Subscription Tab */}
        {activeTab === "subscription" && (
          <form onSubmit={handleUpdateSubscription} className="space-y-4">
            {/* Subscription Type Change */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Change Subscription Type
              </label>
              <select
                value={subscriptionType}
                onChange={(e) => setSubscriptionType(e.target.value as SubscriptionType)}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Keep current type</option>
                <option value="TRIAL">Trial (30 days)</option>
                <option value="DEPOSIT">Deposit (Pay-per-use)</option>
                <option value="MONTHLY">Monthly Subscription</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {subscriptionType === "TRIAL" && "Will reset to new 30-day trial period"}
                {subscriptionType === "DEPOSIT" && "Merchant will pay per order commission"}
                {subscriptionType === "MONTHLY" && "Fixed monthly fee subscription"}
                {!subscriptionType && `Current: ${subscriptionData?.type || "None"}`}
              </p>
            </div>

            {/* Monthly Period (only shown when MONTHLY is selected) */}
            {subscriptionType === "MONTHLY" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subscription Period (Months)
                </label>
                <select
                  value={monthlyPeriodMonths}
                  onChange={(e) => setMonthlyPeriodMonths(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="1">1 Month</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (1 Year)</option>
                </select>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Extend Period (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                placeholder="e.g., 30"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Extend the current subscription period by this many days
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Change Status
              </label>
              <select
                value={subscriptionStatus}
                onChange={(e) => setSubscriptionStatus(e.target.value as "ACTIVE" | "SUSPENDED" | "")}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Keep current status</option>
                <option value="ACTIVE">Activate</option>
                <option value="SUSPENDED">Suspend</option>
              </select>
            </div>

            {subscriptionStatus === "SUSPENDED" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Suspend Reason
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Reason for suspension..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!subscriptionType && !extendDays && !subscriptionStatus)}
              className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Processing..." : "Update Subscription"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
