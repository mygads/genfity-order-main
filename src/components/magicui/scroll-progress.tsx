"use client";

import { cn } from "@/lib/utils";
import { motion, useScroll, useSpring } from "framer-motion";

interface ScrollProgressProps {
    className?: string;
}

export function ScrollProgress({ className }: ScrollProgressProps) {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    return (
        <motion.div
            className={cn(
                "fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#173C82] via-purple-500 to-[#173C82] origin-left z-[9999]",
                className
            )}
            style={{ scaleX }}
        />
    );
}
