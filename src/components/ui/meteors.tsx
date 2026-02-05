"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

export const Meteors = ({
  number,
  className,
}: {
  number?: number;
  className?: string;
}) => {
  const [meteorStyles, setMeteorStyles] = useState<Array<React.CSSProperties>>([]);

  useEffect(() => {
    const styles = new Array(number || 20).fill(true).map(() => ({
      top: Math.floor(Math.random() * 100) + "%",
      left: Math.floor(Math.random() * 100) + "%",
      animationDelay: Math.random() * 1 + "s",
      animationDuration: Math.floor(Math.random() * (8 - 2) + 2) + "s",
    }));
    setMeteorStyles(styles);
  }, [number]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full h-full relative"
      >
        {meteorStyles.map((style, idx) => (
          <span
            key={"meteor" + idx}
            className={cn(
              "animate-meteor-effect absolute h-0.5 w-0.5 rotate-[0deg] rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10]",
              "before:absolute before:top-1/2 before:h-[1px] before:w-[50px] before:-translate-y-[50%] before:transform before:bg-gradient-to-r before:from-[#64748b] before:to-transparent before:content-['']",
              className
            )}
            style={style}
          />
        ))}
      </motion.div>
    </div>
  );
};
