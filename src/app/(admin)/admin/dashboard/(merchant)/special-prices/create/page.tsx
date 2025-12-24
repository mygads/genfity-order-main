"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

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

export default function CreateSpecialPricePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [menuBooks, setMenuBooks] = useState<MenuBook[]>([]);

    const [name, setName] = useState("");
    const [selectedMenuBookId, setSelectedMenuBookId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [applicableDays, setApplicableDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
    const [isAllDay, setIsAllDay] = useState(true);
    const [startTime, setStartTime] = useState("00:00");
    const [endTime, setEndTime] = useState("23:59");
    const [priceItems, setPriceItems] = useState<PriceItem[]>([]);

    useEffect(() => {
        fetchMenuBooks();
    }, []);

    const fetchMenuBooks = async () => {
        try {
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
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to fetch menu books");
        } finally {
            setLoading(false);
        }
    };

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
        if (!selectedMenuBookId) {
            setError("Please select a menu book");
            return;
        }
        if (!startDate || !endDate) {
            setError("Start and end dates are required");
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

            const response = await fetch("/api/merchant/special-prices", {
                method: "POST",
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
                setError(data.message || "Failed to create special price");
            }
        } catch (err) {
            console.error("Submit error:", err);
            setError("Failed to create special price");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div>
                <PageBreadcrumb pageTitle="Create Special Price" />
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="mb-6 grid gap-6 md:grid-cols-2">
                        <div><div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="h-11 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div></div>
                        <div><div className="mb-2 h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div><div className="h-11 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div></div>
                    </div>
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
        <div>
            <PageBreadcrumb pageTitle="Create Special Price" />

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
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
                                placeholder="e.g., Lunch Special"
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Menu Book <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedMenuBookId}
                                onChange={(e) => handleMenuBookChange(e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                                <option value="">Select a menu book</option>
                                {menuBooks.map(book => (
                                    <option key={book.id} value={book.id}>
                                        {book.name} ({book.items?.length || 0} menus)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="mb-6 grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                End Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Applicable Days */}
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Applicable Days <span className="text-red-500">*</span>
                        </label>
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
                                Set Promo Prices
                            </label>
                            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Menu</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Original Price</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Promo Price</th>
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
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                                        {item.menuName}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">
                                                        $A {item.originalPrice.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={item.promoPrice}
                                                            onChange={(e) => handlePromoPriceChange(item.menuId, Number(e.target.value))}
                                                            min="0"
                                                            className="h-9 w-32 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {discount > 0 ? (
                                                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                                -{discount}%
                                                            </span>
                                                        ) : discount < 0 ? (
                                                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
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

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
                        <Link
                            href="/admin/dashboard/special-prices"
                            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/25 hover:bg-primary-600 disabled:opacity-50"
                        >
                            {submitting ? "Creating..." : "Create Special Price"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
