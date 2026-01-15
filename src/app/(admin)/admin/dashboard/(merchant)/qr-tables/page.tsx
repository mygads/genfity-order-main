"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import { FaDownload } from "react-icons/fa";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useContextualHint, CONTEXTUAL_HINTS, useClickHereHint, CLICK_HINTS } from "@/lib/tutorial";

interface MerchantData {
  code: string;
  name: string;
  totalTables: number | null;
}

// Fixed preview size for consistent display
const PREVIEW_SIZE = 120;

/**
 * QR Table Generator Page
 * Generate QR codes for each table in the restaurant
 */
export default function QRTablesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toasts, success: showSuccess, error: showError } = useToast();
  const hiddenQrRef = useRef<HTMLDivElement>(null);
  const { showHint } = useContextualHint();
  const { showClickHint } = useClickHereHint();

  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [tableCount, setTableCount] = useState<number>(0);
  const [downloadSize, setDownloadSize] = useState<number>(256);
  const [downloading, setDownloading] = useState(false);
  const [downloadingTable, setDownloadingTable] = useState<number | null>(null);

  // Show contextual hints on first visit
  useEffect(() => {
    if (!loading && merchant) {
      if (tableCount === 0) {
        showHint(CONTEXTUAL_HINTS.emptyQrTables);
      } else {
        showHint(CONTEXTUAL_HINTS.qrTablesFirstVisit);
        // Show print tip after delay with click hint
        const timer = setTimeout(() => {
          showHint(CONTEXTUAL_HINTS.qrPrintTip);
          showClickHint(CLICK_HINTS.qrDownloadAllButton);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, merchant, tableCount, showHint, showClickHint]);

  useEffect(() => {
    fetchMerchant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMerchant = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch merchant");
      }

      const data = await response.json();
      const merchantData = data.data?.merchant || data.data;

      setMerchant({
        code: merchantData.code || "",
        name: merchantData.name || "",
        totalTables: merchantData.totalTables ?? null,
      });

      // Set initial table count from merchant data
      if (merchantData.totalTables) {
        setTableCount(merchantData.totalTables);
      }
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to load merchant data");
    } finally {
      setLoading(false);
    }
  };

  const getBaseUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  };

  const generateQRUrl = (tableNumber: number) => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/${merchant?.code}/order?mode=dinein&tableno=${tableNumber}`;
  };

  const downloadQRCode = (tableNumber: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // Create a temporary div for rendering
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "absolute";
        tempDiv.style.left = "-9999px";
        document.body.appendChild(tempDiv);

        // Use qrcode library for canvas rendering with selected download size
        import("qrcode").then((QRCode) => {
          const qrUrl = generateQRUrl(tableNumber);
          const canvas = document.createElement("canvas");
          
          QRCode.toCanvas(canvas, qrUrl, {
            width: downloadSize,
            margin: 2,
            color: {
              dark: "#1f2937",
              light: "#ffffff",
            },
            errorCorrectionLevel: "H",
          }, (err) => {
            if (err) {
              document.body.removeChild(tempDiv);
              reject(err);
              return;
            }

            // Create final canvas with label
            const padding = 60;
            const finalCanvas = document.createElement("canvas");
            finalCanvas.width = downloadSize + 40;
            finalCanvas.height = downloadSize + padding + 20;
            const finalCtx = finalCanvas.getContext("2d");

            if (!finalCtx) {
              document.body.removeChild(tempDiv);
              reject(new Error("Cannot get final canvas context"));
              return;
            }

            // White background
            finalCtx.fillStyle = "#ffffff";
            finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

            // Draw QR code centered
            finalCtx.drawImage(canvas, 20, 20);

            // Add table label
            finalCtx.fillStyle = "#1f2937";
            finalCtx.font = `bold ${Math.max(18, downloadSize / 10)}px Inter, sans-serif`;
            finalCtx.textAlign = "center";
            finalCtx.fillText(`Table ${tableNumber}`, finalCanvas.width / 2, downloadSize + 50);

            // Download
            const link = document.createElement("a");
            link.download = `${merchant?.code}-table-${tableNumber}.png`;
            link.href = finalCanvas.toDataURL("image/png");
            link.click();

            document.body.removeChild(tempDiv);
            resolve();
          });
        }).catch((err) => {
          document.body.removeChild(tempDiv);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleDownloadSingle = async (tableNumber: number) => {
    setDownloadingTable(tableNumber);
    try {
      await downloadQRCode(tableNumber);
    } catch (err) {
      showError("Error", "Failed to download QR code");
      console.error(err);
    } finally {
      setDownloadingTable(null);
    }
  };

  const handleDownloadAll = async () => {
    if (tableCount === 0) {
      showError("Error", "Please set the number of tables first");
      return;
    }

    setDownloading(true);
    try {
      for (let i = 1; i <= tableCount; i++) {
        await downloadQRCode(i);
        // Small delay between downloads to prevent browser blocking
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      showSuccess("Success", `Downloaded ${tableCount} QR codes`);
    } catch (err) {
      showError("Error", "Failed to download all QR codes");
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveTotalTables = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ totalTables: tableCount }),
      });

      if (!response.ok) {
        throw new Error("Failed to save total tables");
      }

      showSuccess("Success", "Total tables saved successfully");
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to save total tables");
    }
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle={t("admin.qrTables.title")} />
        
        {/* Skeleton Loader */}
        <div className="mt-6 space-y-6">
          {/* Settings Card Skeleton */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/3">
            <div className="mb-6 border-b border-gray-200 pb-5 dark:border-gray-800">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-11 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* QR Codes Grid Skeleton */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/3">
            <div className="mb-6 border-b border-gray-200 pb-5 dark:border-gray-800">
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="w-[120px] h-[120px] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2"></div>
                  <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mt-2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-tutorial="qr-tables-page">
      <ToastContainer toasts={toasts} />
      <PageBreadcrumb pageTitle={t("admin.qrTables.title")} />

      <div className="mt-6 space-y-6">
        {/* Settings Card */}
        <div data-tutorial="qr-settings-card" className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/3">
          <div className="mb-6 border-b border-gray-200 pb-5 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              QR Code Generator
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Generate QR codes for each table. Customers can scan to open the order page with table number pre-filled.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Table Count Input */}
            <div data-tutorial="qr-table-count">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Number of Tables
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={tableCount || ""}
                onChange={(e) => setTableCount(parseInt(e.target.value) || 0)}
                placeholder="e.g. 20"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* Download Size Select */}
            <div data-tutorial="qr-download-size">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Download Size
              </label>
              <select
                value={downloadSize}
                onChange={(e) => setDownloadSize(parseInt(e.target.value))}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <option value={150}>Small (150px)</option>
                <option value={200}>Medium (200px)</option>
                <option value={256}>Large (256px)</option>
                <option value={320}>Extra Large (320px)</option>
                <option value={512}>Print (512px)</option>
              </select>
            </div>

            {/* Save Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSaveTotalTables}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Save Table Count
              </button>
            </div>

            {/* Download All Button */}
            <div data-tutorial="qr-download-all" className="flex items-end">
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={tableCount === 0 || downloading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaDownload className="h-4 w-4" />
                {downloading ? `Downloading...` : `Download All (${tableCount})`}
              </button>
            </div>
          </div>
        </div>

        {/* QR Codes Grid */}
        {tableCount > 0 && (
          <div data-tutorial="qr-codes-grid" className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-white/3">
            <div className="mb-6 border-b border-gray-200 pb-5 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Generated QR Codes
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {tableCount} table{tableCount > 1 ? "s" : ""} • Download size: {downloadSize}px
              </p>
            </div>

            <div
              ref={hiddenQrRef}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
            >
              {Array.from({ length: tableCount }, (_, i) => i + 1).map((tableNumber) => (
                <div
                  key={tableNumber}
                  className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-3 transition-all hover:border-brand-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
                >
                  {/* QR Code Preview - Fixed size */}
                  <div className="rounded-lg bg-white p-2">
                    <QRCodeSVG
                      id={`qr-table-${tableNumber}`}
                      value={generateQRUrl(tableNumber)}
                      size={PREVIEW_SIZE}
                      level="H"
                      includeMargin={false}
                      bgColor="#ffffff"
                      fgColor="#1f2937"
                    />
                  </div>

                  {/* Table Label */}
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {t("admin.qrTables.table")} {tableNumber}
                  </p>

                  {/* Download Button - Always visible */}
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(tableNumber)}
                    disabled={downloadingTable === tableNumber}
                    className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaDownload className="h-3.5 w-3.5" />
                    {downloadingTable === tableNumber ? "..." : t("admin.qrTables.download")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tableCount === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center sm:p-12 dark:border-gray-800 dark:bg-white/3">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
              <svg
                className="h-8 w-8 text-brand-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("admin.qrTables.noTables")}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("admin.qrTables.noTablesDesc")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
