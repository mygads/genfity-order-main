"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminFormFooter from "@/components/common/AdminFormFooter";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useMerchant } from "@/context/MerchantContext";

interface MenuBook {
    id: string;
    name: string;
    items: Array<{
        id: string;
        menuId: string;
        menu: { id: string; name: string; price: number };
    }>;
}

interface PriceItem {
    menuId: string;
    menuName: string;
    originalPrice: number;
    promoPrice: number;
}

const dayOptions = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
];

export default function EditSpecialPricePage() {
    const router = useRouter();
    const params = useParams();
    const priceId = params.id as string;
    const { } = useTranslation();
    const { formatCurrency } = useMerchant();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [menuBooks, setMenuBooks] = useState<MenuBook[]>([]);

    const [name, setName] = useState("");
    const [selectedMenuBookId, setSelectedMenuBookId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [applicableDays, setApplicableDays] = useState<number[]>([]);
    const [isAllDay, setIsAllDay] = useState(true);
    const [startTime, setStartTime] = useState("00:00");
    const [endTime, setEndTime] = useState("23:59");
    const [isActive, setIsActive] = useState(true);
    const [priceItems, setPriceItems] = useState<PriceItem[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem("accessToken");
            if (!token) {
                router.push("/admin/login");
                return;
            }

            const [priceRes, booksRes] = await Promise.all([
                fetch(`/api/merchant/special-prices/${priceId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch("/api/merchant/menu-books", {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const priceData = await priceRes.json();
            const booksData = await booksRes.json();

            if (booksData.success) {
                setMenuBooks(booksData.data);
            }

            if (priceData.success) {
                const sp = priceData.data;
                setName(sp.name);
                setSelectedMenuBookId(sp.menuBookId);
                setStartDate(sp.startDate);
                setEndDate(sp.endDate);
                setApplicableDays(sp.applicableDays);
                setIsAllDay(sp.isAllDay);
                setStartTime(sp.startTime || "00:00");
                setEndTime(sp.endTime || "23:59");
                setIsActive(sp.isActive);

                // Build price items from menu book items + existing promo prices
                const book = sp.menuBook;
                if (book && book.items) {
                    const items: PriceItem[] = book.items.map((item: { menu: { id: string; name: string; price: number } }) => {
                        const existingPrice = sp.priceItems.find((p: { menuId: string }) => p.menuId === item.menu.id);
                        return {
                            menuId: item.menu.id,
                            menuName: item.menu.name,
                            originalPrice: item.menu.price,
                            promoPrice: existingPrice ? existingPrice.promoPrice : item.menu.price,
                        };
                    });
                    setPriceItems(items);
                }
            } else {
                setError("Special price not found");
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    }, [priceId, router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleMenuBookChange = (bookId: string) => {
        setSelectedMenuBookId(bookId);
        const book = menuBooks.find(b => b.id === bookId);
        if (book) {
            setPriceItems(book.items.map(item => ({
                menuId: item.menu.id,
                menuName: item.menu.name,
                originalPrice: item.menu.price,
                promoPrice: item.menu.price,
            })));
        } else {
            setPriceItems([]);
        }
    };

    const handleDayToggle = (day: number) => {
        setApplicableDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handlePromoPriceChange = (menuId: string, price: number) => {
        setPriceItems(prev => prev.map(item =>
            item.menuId === menuId ? { ...item, promoPrice: price } : item
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Name is required");
            return;
        }
        if (applicableDays.length === 0) {
            setError("Select at least one applicable day");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            const token = localStorage.getItem("accessToken");

            const response = await fetch(`/api/merchant/special-prices/${priceId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    menuBookId: selectedMenuBookId,
                    startDate,
                    endDate,
                    applicableDays,
                    isAllDay,
                    startTime: isAllDay ? null : startTime,
                    endTime: isAllDay ? null : endTime,
                    isActive,
                    priceItems: priceItems.map(item => ({
                        menuId: item.menuId,
                        promoPrice: item.promoPrice,
                    })),
                }),
            });

            const data = await response.json();
            if (data.success) {
                router.push("/admin/dashboard/special-prices");
            } else {
                setError(data.message || "Failed to update");
            }
        } catch (err) {
            console.error("Submit error:", err);
            setError("Failed to update special price");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div>
                <PageBreadcrumb pageTitle="Edit Special Price" />
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="mb-6 grid gap-6 md:grid-cols-2">
                        <div><div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="h-11 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div></div>
                        <div><div className="mb-2 h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="h-11 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div></div>
                    </div>
                    <div className="mb-6 h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                    <div className="mb-6 grid gap-6 md:grid-cols-2">
                        <div><div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="h-11 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div></div>
                        <div><div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="h-11 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div></div>
                    </div>
                    <div className="mb-6"><div className="mb-2 h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="flex gap-2">{[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="h-10 w-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>)}</div></div>
                </div>
            </div>
        );
    }

    return (
        <div data-tutorial="special-price-edit-page">
            <PageBreadcrumb pageTitle="Edit Special Price" />

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950" data-tutorial="special-price-edit-form">
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="mb-6 grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Menu Book
                            </label>
                            <select
                                value={selectedMenuBookId}
                                onChange={(e) => handleMenuBookChange(e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                                {menuBooks.map(book => (
                                    <option key={book.id} value={book.id}>
                                        {book.name} ({book.items?.length || 0} menus)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Status Toggle */}
                    <div className="mb-6 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800" data-tutorial="special-price-status">
                        <label className="relative inline-flex cursor-pointer items-center">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-green-500 peer-checked:after:translate-x-full dark:bg-gray-700"></div>
                        </label>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {isActive ? "Active" : "Inactive"}
                        </span>
                    </div>

                    {/* Date Range */}
                    <div className="mb-6 grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Applicable Days */}
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Applicable Days</label>
                        <div className="flex flex-wrap gap-2">
                            {dayOptions.map(day => (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => handleDayToggle(day.value)}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${applicableDays.includes(day.value)
                                        ? "bg-primary-500 text-white"
                                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                        }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time Range */}
                    <div className="mb-6">
                        <div className="mb-3 flex items-center gap-3">
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    checked={isAllDay}
                                    onChange={(e) => setIsAllDay(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-primary-500 peer-checked:after:translate-x-full dark:bg-gray-700"></div>
                            </label>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">All Day</span>
                        </div>

                        {!isAllDay && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Promo Price Editor */}
                    {priceItems.length > 0 && (
                        <div className="mb-6">
                            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Promo Prices
                            </label>
                            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Menu</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Original</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Promo</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Discount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {priceItems.map(item => {
                                            const discount = item.originalPrice > 0
                                                ? Math.round((1 - item.promoPrice / item.originalPrice) * 100)
                                                : 0;
                                            return (
                                                <tr key={item.menuId}>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.menuName}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(item.originalPrice)}</td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={item.promoPrice}
                                                            onChange={(e) => handlePromoPriceChange(item.menuId, Number(e.target.value))}
                                                            min="0"
                                                            className="h-9 w-32 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {discount > 0 ? (
                                                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                                -{discount}%
                                                            </span>
                                                        ) : discount < 0 ? (
                                                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                                                +{Math.abs(discount)}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">No change</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Fixed Footer */}
                    <AdminFormFooter
                        onCancel={() => router.push("/admin/dashboard/special-prices")}
                        isSubmitting={submitting}
                        submitLabel="Save Changes"
                        submittingLabel="Saving..."
                    />
                </form>
            </div>
        </div>
    );
}
