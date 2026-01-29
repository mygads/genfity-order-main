"use client";

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface InteractiveHoverButtonProps extends HTMLMotionProps<"button"> {
    children: ReactNode;
    className?: string;
}

export function InteractiveHoverButton({ children, className, onAnimationStart: _onAnimationStart, ...props }: InteractiveHoverButtonProps) {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "group relative inline-flex items-center justify-center overflow-hidden rounded-xl px-8 py-3.5 font-bold text-white transition-all duration-300",
                "bg-[#173C82]",
                className
            )}
            {...props}
        >
            <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-[#173C82] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>
        </motion.button>
    );
}
