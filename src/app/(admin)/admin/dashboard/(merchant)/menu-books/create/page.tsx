"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminFormFooter from "@/components/common/AdminFormFooter";
import { StatusToggle } from "@/components/common/StatusToggle";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useMerchant } from "@/context/MerchantContext";
import { FaArrowLeft } from "react-icons/fa";
import { fetchMerchantApi } from "@/lib/utils/orderApiClient";

interface Menu {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    isActive: boolean;
    categories?: Array<{ category: { id: string; name: string } }>;
    category?: { id: string; name: string } | null;
}

export default function CreateMenuBookPage() {
    const router = useRouter();
    const { t, locale } = useTranslation();
    const { formatCurrency } = useMerchant();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [menus, setMenus] = useState<Menu[]>([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAllSelected, setShowAllSelected] = useState(false);

    const fetchMenus = useCallback(async () => {
        try {
            const token = localStorage.getItem("accessToken");
            if (!token) {
                router.push("/admin/login");
                return;
            }

            const response = await fetchMerchantApi("/api/merchant/menu", { token });

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

    const menusByCategory = useMemo(() => {
        const map = new Map<string, { id: string; name: string; menus: Menu[] }>();

        for (const menu of filteredMenus) {
            const primaryCategory = menu.categories?.[0]?.category || menu.category || null;
            const key = primaryCategory?.id || "uncategorized";
            const name = primaryCategory?.name || (locale === 'id' ? 'Tanpa Kategori' : 'Uncategorized');

            const existing = map.get(key);
            if (existing) {
                existing.menus.push(menu);
            } else {
                map.set(key, { id: key, name, menus: [menu] });
            }
        }

        const groups = Array.from(map.values()).map(g => ({
            ...g,
            menus: g.menus.sort((a, b) => a.name.localeCompare(b.name)),
        }));

        groups.sort((a, b) => {
            if (a.id === "uncategorized") return 1;
            if (b.id === "uncategorized") return -1;
            return a.name.localeCompare(b.name);
        });

        return groups;
    }, [filteredMenus, locale]);

    const selectedMenus = useMemo(() => {
        const byId = new Map(menus.map(m => [m.id, m] as const));
        return selectedMenuIds.map(id => byId.get(id)).filter(Boolean) as Menu[];
    }, [menus, selectedMenuIds]);

    const filteredMenuIds = useMemo(() => filteredMenus.map(m => m.id), [filteredMenus]);

    const selectAllMenus = (menuIds: string[]) => {
        setSelectedMenuIds(prev => Array.from(new Set([...prev, ...menuIds])));
    };

    const deselectAllMenus = (menuIds: string[]) => {
        const ids = new Set(menuIds);
        setSelectedMenuIds(prev => prev.filter(id => !ids.has(id)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError(locale === 'id' ? 'Nama wajib diisi' : 'Name is required');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            const token = localStorage.getItem("accessToken");

            const response = await fetchMerchantApi("/api/merchant/menu-books", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    menuIds: selectedMenuIds,
                }),
                token,
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
                <PageBreadcrumb pageTitle={t("admin.menuBooks.create")} />
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
            <PageBreadcrumb pageTitle={t("admin.menuBooks.create")} />

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950" data-tutorial="menu-book-form">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={() => router.push("/admin/dashboard/menu-books")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                        <FaArrowLeft className="h-4 w-4" />
                        {t("common.back")}
                    </button>

                    <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.menuBooks.create")}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t("admin.menuBooks.subtitle")}</div>
                    </div>
                </div>

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
                                {t("admin.menuBooks.name")} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={locale === 'id' ? 'Contoh: Menu Promo Siang' : 'e.g., Lunch Special Menus'}
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t("admin.menuBooks.description")}
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={locale === 'id' ? 'Deskripsi (opsional)' : 'Optional description'}
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Menu Selection */}
                    <div className="mb-6" data-tutorial="menu-book-selection">
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {locale === 'id' ? 'Pilih Menu' : 'Select Menus'} ({selectedMenuIds.length} {locale === 'id' ? 'dipilih' : 'selected'})
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={locale === 'id' ? 'Cari menu...' : 'Search menus...'}
                            className="mb-3 h-10 w-full max-w-md rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            data-tutorial="menu-book-search"
                        />

                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => selectAllMenus(filteredMenuIds)}
                                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                            >
                                {locale === 'id' ? 'Pilih semua (hasil filter)' : 'Select all (filtered)'}
                            </button>
                            <button
                                type="button"
                                onClick={() => deselectAllMenus(filteredMenuIds)}
                                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                            >
                                {locale === 'id' ? 'Hapus pilihan (hasil filter)' : 'Deselect (filtered)'}
                            </button>
                            {selectedMenuIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedMenuIds([])}
                                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                                >
                                    {locale === 'id' ? 'Reset pilihan' : 'Clear selection'}
                                </button>
                            )}
                            <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                                {locale === 'id'
                                    ? `${filteredMenus.length} menu ditampilkan`
                                    : `${filteredMenus.length} menus shown`}
                            </div>
                        </div>

                        {selectedMenuIds.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {(showAllSelected ? selectedMenus : selectedMenus.slice(0, 8)).map(menu => (
                                    <span key={menu.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                                        {menu.name}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMenuIds(prev => prev.filter(x => x !== menu.id))}
                                            className="hover:text-brand-900"
                                        >
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </span>
                                ))}

                                {selectedMenus.length > 8 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllSelected(s => !s)}
                                        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                                    >
                                        {showAllSelected
                                            ? (locale === 'id' ? 'Sembunyikan' : 'Hide')
                                            : (locale === 'id' ? `+${selectedMenus.length - 8} lagi` : `+${selectedMenus.length - 8} more`)}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                            {filteredMenus.length === 0 ? (
                                <p className="p-4 text-center text-sm text-gray-500">{locale === 'id' ? 'Tidak ada menu' : 'No menus found'}</p>
                            ) : (
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {menusByCategory.map(group => {
                                        const groupMenuIds = group.menus.map(m => m.id);
                                        const selectedInGroup = groupMenuIds.filter(id => selectedMenuIds.includes(id)).length;
                                        return (
                                            <div key={group.id}>
                                                <div className="flex items-center justify-between gap-3 bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                            {group.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {selectedInGroup}/{group.menus.length} {locale === 'id' ? 'dipilih' : 'selected'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => selectAllMenus(groupMenuIds)}
                                                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                                                        >
                                                            {t("admin.staff.selectAll")}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => deselectAllMenus(groupMenuIds)}
                                                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                                                        >
                                                            {t("admin.staff.deselectAll")}
                                                        </button>
                                                    </div>
                                                </div>

                                                {group.menus.map(menu => {
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
                                                            <StatusToggle
                                                                isActive={menu.isActive}
                                                                onToggle={() => { }}
                                                                disabled
                                                                size="sm"
                                                                activeLabel={t("common.active")}
                                                                inactiveLabel={t("common.inactive")}
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
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
                        submitLabel={t("admin.menuBooks.create")}
                        submittingLabel={locale === 'id' ? 'Membuat...' : 'Creating...'}
                    />
                </form>
            </div>
        </div>
    );
}
