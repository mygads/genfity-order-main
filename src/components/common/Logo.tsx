"use client";

import Image from "next/image";

interface LogoProps {
    variant?: "full" | "icon";
    width?: number;
    height?: number;
    className?: string;
}

/**
 * Reusable Logo component with dark mode support
 * 
 * @param variant - "full" for full logo, "icon" for icon only
 * @param width - Custom width (default: 150 for full, 32 for icon)
 * @param height - Custom height (default: 40 for full, 32 for icon)
 * @param className - Additional CSS classes
 */
export default function Logo({
    variant = "full",
    width,
    height,
    className = ""
}: LogoProps) {
    const isIcon = variant === "icon";

    const defaultWidth = isIcon ? 32 : 150;
    const defaultHeight = isIcon ? 32 : 40;

    const w = width || defaultWidth;
    const h = height || defaultHeight;

    if (isIcon) {
        return (
            <>
                <Image
                    className={`dark:hidden ${className}`}
                    src="/images/logo/icon.png"
                    alt="Genfity"
                    width={w}
                    height={h}
                    priority
                />
                <Image
                    className={`hidden dark:block ${className}`}
                    src="/images/logo/icon-dark-mode.png"
                    alt="Genfity"
                    width={w}
                    height={h}
                    priority
                />
            </>
        );
    }

    return (
        <>
            <Image
                className={`dark:hidden ${className}`}
                src="/images/logo/logo.png"
                alt="Genfity"
                width={w}
                height={h}
                priority
            />
            <Image
                className={`hidden dark:block ${className}`}
                src="/images/logo/logo-dark-mode.png"
                alt="Genfity"
                width={w}
                height={h}
                priority
            />
        </>
    );
}
