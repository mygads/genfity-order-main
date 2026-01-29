"use client";

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface RainbowButtonProps extends HTMLMotionProps<"button"> {
    children: ReactNode;
    className?: string;
}

export function RainbowButton({ children, className, onAnimationStart: _onAnimationStart, ...props }: RainbowButtonProps) {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "group relative inline-flex items-center justify-center overflow-hidden rounded-xl px-8 py-3 font-bold text-white transition-all duration-300",
                "bg-gradient-to-r from-[#173C82] via-purple-500 via-pink-500 to-orange-500 bg-[length:300%_100%]",
                "animate-rainbow hover:shadow-xl hover:shadow-purple-500/25",
                className
            )}
            {...props}
        >
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>
        </motion.button>
    );
}
