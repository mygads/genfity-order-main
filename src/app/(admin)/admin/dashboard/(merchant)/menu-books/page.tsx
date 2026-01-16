"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useContextualHint, CONTEXTUAL_HINTS } from "@/lib/tutorial/components/ContextualHint";
import { TableActionButton } from "@/components/common/TableActionButton";
import { StatusToggle } from "@/components/common/StatusToggle";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useModalImplicitClose } from "@/hooks/useModalImplicitClose";

interface MenuBook {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    items: Array<{
        id: string;
        menu: { id: string; name: string; price: number };
    }>;
    _count: { items: number; specialPrices: number };
}

export default function MenuBooksPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const { showHint } = useContextualHint();
    const [loading, setLoading] = useState(true);
    const [menuBooks, setMenuBooks] = useState<MenuBook[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const closeDeleteModal = useCallback(() => setDeleteId(null), []);
    const { onBackdropMouseDown: onDeleteModalBackdropMouseDown } = useModalImplicitClose({
        isOpen: Boolean(deleteId),
        onClose: closeDeleteModal,
        disableImplicitClose: deleting,
    });

    // Show contextual hint on first visit or empty state
    useEffect(() => {
        if (!loading) {
            if (menuBooks.length === 0) {
                showHint(CONTEXTUAL_HINTS.menuBooksEmpty);
            } else {
                showHint(CONTEXTUAL_HINTS.menuBooksFirstVisit);
            }
        }
    }, [loading, menuBooks.length, showHint]);

    const fetchMenuBooks = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("accessToken");
            if (!token) {
                router.push("/admin/login");
                return;
            }

            const response = await fetch("/api/merchant/menu-books", {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                setMenuBooks(data.data);
            } else {
                setError(data.message || "Failed to fetch menu books");
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to fetch menu books");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchMenuBooks();
    }, [fetchMenuBooks]);

    const handleDelete = async (id: string) => {
        try {
            setDeleting(true);
            const token = localStorage.getItem("accessToken");

            const response = await fetch(`/api/merchant/menu-books/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                setMenuBooks(prev => prev.filter(book => book.id !== id));
                setDeleteId(null);
            } else {
                setError(data.message || "Failed to delete");
            }
        } catch (err) {
            console.error("Delete error:", err);
            setError("Failed to delete menu book");
        } finally {
            setDeleting(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const token = localStorage.getItem("accessToken");

            const response = await fetch(`/api/merchant/menu-books/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            const data = await response.json();
            if (data.success) {
                setMenuBooks(prev => prev.map(book =>
                    book.id === id ? { ...book, isActive: !currentStatus } : book
                ));
            }
        } catch (err) {
            console.error("Toggle error:", err);
        }
    };

    const filteredBooks = menuBooks.filter(book =>
        book.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div>
                <PageBreadcrumb pageTitle={t("admin.menuBooks.title")} />
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    {/* Skeleton Header */}
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="h-7 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                            <div className="mt-2 h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                        </div>
                        <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                    {/* Skeleton Search */}
                    <div className="mb-6">
                        <div className="h-11 w-full max-w-md animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                    {/* Skeleton Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-left"><div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                    <th className="px-4 py-3 text-left"><div className="h-3 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                    <th className="px-4 py-3 text-left"><div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                    <th className="px-4 py-3 text-left"><div className="h-3 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                    <th className="px-4 py-3 text-right"><div className="ml-auto h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-4">
                                            <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                                            <div className="mt-1 h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                                        </td>
                                        <td className="px-4 py-4"><div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div></td>
                                        <td className="px-4 py-4"><div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div></td>
                                        <td className="px-4 py-4"><div className="h-6 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div></td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                                                <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div data-tutorial="menu-books-page">
            <PageBreadcrumb pageTitle={t("admin.menuBooks.title")} />

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-tutorial="menu-books-header">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("admin.menuBooks.title")}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t("admin.menuBooks.subtitle")}
                        </p>
                    </div>
                    <Link
                        href="/admin/dashboard/menu-books/create"
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600"
                        data-tutorial="menu-books-create"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t("admin.menuBooks.create")}
                    </Link>
                </div>

                {/* Search */}
                <div className="mb-6" data-tutorial="menu-books-search">
                    <input
                        type="text"
                        placeholder={t("admin.menuBooks.searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 w-full max-w-md rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                </div>

                {error && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                        {error}
                        <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
                    </div>
                )}

                {/* Table */}
                {filteredBooks.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50" data-tutorial="menu-books-empty">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{t("admin.menuBooks.noMenuBooks")}</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("admin.menuBooks.noMenuBooksDesc")}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto" data-tutorial="menu-books-list">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t("admin.menuBooks.name")}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t("admin.menuBooks.items")}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t("admin.menuBooks.specialPrices")}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t("admin.menuBooks.status")}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t("admin.menuBooks.actions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredBooks.map((book) => (
                                    <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="px-4 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{book.name}</p>
                                                {book.description && (
                                                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{book.description}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                {book._count.items} menus
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                {book._count.specialPrices} prices
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusToggle
                                                isActive={book.isActive}
                                                onToggle={() => toggleStatus(book.id, book.isActive)}
                                                size="sm"
                                                activeLabel={t("admin.menuBooks.active")}
                                                inactiveLabel={t("admin.menuBooks.inactive")}
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <TableActionButton
                                                    icon={FaEdit}
                                                    onClick={() => router.push(`/admin/dashboard/menu-books/${book.id}/edit`)}
                                                    title={t("admin.menuBooks.edit")}
                                                    aria-label={t("admin.menuBooks.edit")}
                                                />
                                                <TableActionButton
                                                    icon={FaTrash}
                                                    tone="danger"
                                                    onClick={() => setDeleteId(book.id)}
                                                    title={t("common.delete")}
                                                    aria-label={t("common.delete")}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onMouseDown={onDeleteModalBackdropMouseDown}
                >
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("admin.menuBooks.deleteConfirm")}</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {t("admin.menuBooks.deleteWarning")}
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={closeDeleteModal}
                                disabled={deleting}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                {t("admin.menuBooks.cancel")}
                            </button>
                            <button
                                onClick={() => handleDelete(deleteId)}
                                disabled={deleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? t("admin.menuBooks.deleting") : t("admin.menuBooks.delete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
