"use client";

import { cn } from "@/lib/utils";
import { motion, MotionProps } from "framer-motion";

interface AuroraTextProps extends MotionProps {
    children: React.ReactNode;
    className?: string;
}

export function AuroraText({ children, className, ...props }: AuroraTextProps) {
    return (
        <motion.span
            className={cn(
                "relative inline-block bg-gradient-to-r from-[#173C82] via-purple-500 to-[#173C82] bg-[length:200%_auto] bg-clip-text text-transparent animate-aurora",
                className
            )}
            {...props}
        >
            {children}
        </motion.span>
    );
}
