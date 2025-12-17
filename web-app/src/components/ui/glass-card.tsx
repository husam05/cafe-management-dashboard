
import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "neon" | "destruction";
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, variant = "default", children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative overflow-hidden rounded-xl border border-white/20 shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                    variant === "default" && "bg-white/40 dark:bg-black/40 hover:bg-white/50 dark:hover:bg-black/50",
                    variant === "neon" && "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
                    variant === "destruction" && "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50",
                    className
                )}
                {...props}
            >
                <div className="relative z-10 p-6">{children}</div>

                {/* Subtle Gradient Overlay */}
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 pointer-events-none" />
            </div>
        );
    }
);
GlassCard.displayName = "GlassCard";

export function GlassCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props} />;
}

export function GlassCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn("text-lg font-semibold leading-none tracking-tight", className)}
            {...props}
        />
    );
}

export function GlassCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("pt-0", className)} {...props} />;
}
