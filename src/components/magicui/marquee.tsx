import { cn } from "@/lib/utils";

interface MarqueeProps {
    className?: string;
    reverse?: boolean;
    pauseOnHover?: boolean;
    children?: React.ReactNode;
    vertical?: boolean;
    repeat?: number;
    [key: string]: any;
}

export default function Marquee({
    className,
    reverse,
    pauseOnHover = false,
    children,
    vertical = false,
    repeat = 4,
    ...props
}: MarqueeProps) {
    return (
        <div
            {...props}
            className={cn(
                "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]",
                {
                    "flex-row": !vertical,
                    "flex-col": vertical,
                },
                className,
            )}
        >
            {Array(repeat)
                .fill(0)
                .map((_, i) => (
                    <div
                        key={i}
                        className={cn("flex shrink-0 justify-start [gap:var(--gap)]", {
                            "flex-row": !vertical,
                            "flex-col": vertical,
                            "group-hover:[animation-play-state:paused]": pauseOnHover,
                        })}
                        style={{
                            animation: vertical
                                ? `marquee-vertical var(--duration, 40s) linear infinite${reverse ? ' reverse' : ''}`
                                : `marquee var(--duration, 40s) linear infinite${reverse ? ' reverse' : ''}`
                        }}
                    >
                        {children}
                    </div>
                ))}
        </div>
    );
}
