"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminFormFooter from "@/components/common/AdminFormFooter";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useMerchant } from "@/context/MerchantContext";

interface Menu {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    isActive: boolean;
}

export default function CreateMenuBookPage() {
    const router = useRouter();
    const { } = useTranslation();
    const { formatCurrency } = useMerchant();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [menus, setMenus] = useState<Menu[]>([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchMenus = useCallback(async () => {
        try {
            const token = localStorage.getItem("accessToken");
            if (!token) {
                router.push("/admin/login");
                return;
            }

            const response = await fetch("/api/merchant/menu", {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                setMenus(data.data.filter((m: Menu & { deletedAt?: string }) => !m.deletedAt));
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to fetch menus");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchMenus();
    }, [fetchMenus]);

    const filteredMenus = useMemo(() => {
        if (!searchQuery.trim()) return menus;
        return menus.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [menus, searchQuery]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Name is required");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            const token = localStorage.getItem("accessToken");

            const response = await fetch("/api/merchant/menu-books", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    menuIds: selectedMenuIds,
                }),
            });

            const data = await response.json();
            if (data.success) {
                router.push("/admin/dashboard/menu-books");
            } else {
                setError(data.message || "Failed to create menu book");
            }
        } catch (err) {
            console.error("Submit error:", err);
            setError("Failed to create menu book");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div>
                <PageBreadcrumb pageTitle="Create Menu Book" />
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="mb-6 grid gap-6 md:grid-cols-2">
                        <div><div className="mb-2 h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="h-11 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div></div>
                        <div><div className="mb-2 h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="h-11 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div></div>
                    </div>
                    <div className="mb-6"><div className="mb-2 h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="h-10 w-full max-w-md mb-3 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div><div className="h-48 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div></div>
                </div>
            </div>
        );
    }

    return (
        <div data-tutorial="menu-book-create-page">
            <PageBreadcrumb pageTitle="Create Menu Book" />

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950" data-tutorial="menu-book-form">
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="mb-6 grid gap-6 md:grid-cols-2" data-tutorial="menu-book-basic-info">
                        <div data-tutorial="menu-book-name">
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Lunch Special Menus"
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Description
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description"
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Menu Selection */}
                    <div className="mb-6" data-tutorial="menu-book-selection">
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Select Menus ({selectedMenuIds.length} selected)
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search menus..."
                            className="mb-3 h-10 w-full max-w-md rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            data-tutorial="menu-book-search"
                        />

                        {selectedMenuIds.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {selectedMenuIds.map(id => {
                                    const menu = menus.find(m => m.id === id);
                                    return menu ? (
                                                                                <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                                            {menu.name}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedMenuIds(prev => prev.filter(x => x !== id))}
                                                                                            className="hover:text-brand-900"
                                            >
                                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}

                        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                            {filteredMenus.length === 0 ? (
                                <p className="p-4 text-center text-sm text-gray-500">No menus found</p>
                            ) : (
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredMenus.map(menu => {
                                        const isSelected = selectedMenuIds.includes(menu.id);
                                        return (
                                            <label key={menu.id} className={`flex cursor-pointer items-center gap-3 p-3 transition-colors ${isSelected ? "bg-brand-50 dark:bg-brand-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        if (isSelected) {
                                                            setSelectedMenuIds(prev => prev.filter(x => x !== menu.id));
                                                        } else {
                                                            setSelectedMenuIds(prev => [...prev, menu.id]);
                                                        }
                                                    }}
                                                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{menu.name}</p>
                                                    <p className="text-xs text-gray-500">{formatCurrency(menu.price)}</p>
                                                </div>
                                                {!menu.isActive && (
                                                    <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">Inactive</span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fixed Footer */}
                    <AdminFormFooter
                        onCancel={() => router.push("/admin/dashboard/menu-books")}
                        isSubmitting={submitting}
                        submitLabel="Create Menu Book"
                        submittingLabel="Creating..."
                    />
                </form>
            </div>
        </div>
    );
}
