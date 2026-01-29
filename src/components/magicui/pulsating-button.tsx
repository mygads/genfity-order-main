"use client";

import { cn } from "@/lib/utils";

interface PulsatingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
    pulseColor?: string;
}

export function PulsatingButton({
    children,
    className,
    pulseColor = "#173C82",
    ...props
}: PulsatingButtonProps) {
    return (
        <button
            className={cn(
                "relative inline-flex items-center justify-center px-6 py-2.5 font-bold text-white rounded-xl transition-all duration-300",
                "bg-[#173C82] hover:bg-[#122c60]",
                className
            )}
            style={{
                "--pulse-color": pulseColor,
            } as React.CSSProperties}
            {...props}
        >
            <span className="absolute inset-0 rounded-xl animate-pulsate"
                style={{ backgroundColor: pulseColor, opacity: 0 }}
            />
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>
        </button>
    );
}
