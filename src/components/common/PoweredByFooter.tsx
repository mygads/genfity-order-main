"use client";

import React from "react";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface PoweredByFooterProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Powered By Footer Component
 * Displays "Powered by" text with Genfity logo
 * Clicking the logo opens genfity.com in new tab
 */
export default function PoweredByFooter({ className = "", size = "sm" }: PoweredByFooterProps) {
  const { t } = useTranslation();

  const logoHeight = size === "lg" ? 28 : size === "md" ? 24 : 20;
  const textSize = size === "lg" ? "text-sm" : size === "md" ? "text-xs" : "text-xs";

  return (
    <div className={`flex items-center justify-center gap-2 ${textSize} ${className}`}>
      <span className="text-gray-500">{t("common.poweredBy")}</span>
      <a
        href="https://genfity.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center hover:opacity-80 transition-opacity"
        aria-label="Genfity - Visit website"
      >
        <Image
          src="/images/logo/logo.png"
          alt="Genfity"
          width={Math.round(logoHeight * 4.5)}
          height={logoHeight}
          className="object-contain"
          style={{ height: `${logoHeight}px`, width: "auto" }}
        />
      </a>
    </div>
  );
}
