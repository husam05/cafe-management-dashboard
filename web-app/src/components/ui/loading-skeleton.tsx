import { Skeleton } from "@/components/ui/skeleton"
import { GlassCard, GlassCardContent, GlassCardHeader } from "@/components/ui/glass-card"

export function DashboardSkeleton() {
    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-end">
                <div className="text-right">
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>

            {/* Shift Status Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="text-right space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-6 w-16" />
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="text-right space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-6 w-20" />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <GlassCard key={i} className="p-6">
                        <div className="flex flex-col items-end space-y-3">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-32" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Chart and Transactions */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <GlassCard className="col-span-4">
                    <GlassCardHeader>
                        <Skeleton className="h-6 w-32" />
                    </GlassCardHeader>
                    <GlassCardContent>
                        <Skeleton className="h-64 w-full" />
                    </GlassCardContent>
                </GlassCard>
                <GlassCard className="col-span-3">
                    <GlassCardHeader>
                        <Skeleton className="h-6 w-28" />
                    </GlassCardHeader>
                    <GlassCardContent className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex justify-between items-center">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                        ))}
                    </GlassCardContent>
                </GlassCard>
            </div>

            {/* Daily Performance Table */}
            <GlassCard>
                <GlassCardHeader>
                    <Skeleton className="h-6 w-36" />
                </GlassCardHeader>
                <GlassCardContent>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex justify-between items-center py-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        ))}
                    </div>
                </GlassCardContent>
            </GlassCard>
        </div>
    )
}

export function CardSkeleton() {
    return (
        <GlassCard className="p-6">
            <div className="flex flex-col items-end space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-6 w-24 rounded-full" />
            </div>
        </GlassCard>
    )
}

export function ChartSkeleton() {
    return (
        <GlassCard>
            <GlassCardHeader>
                <Skeleton className="h-6 w-32" />
            </GlassCardHeader>
            <GlassCardContent>
                <Skeleton className="h-64 w-full" />
            </GlassCardContent>
        </GlassCard>
    )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <GlassCard>
            <GlassCardHeader>
                <Skeleton className="h-6 w-36" />
            </GlassCardHeader>
            <GlassCardContent>
                <div className="space-y-3">
                    {Array.from({ length: rows }).map((_, i) => (
                        <div key={i} className="flex justify-between items-center py-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>
            </GlassCardContent>
        </GlassCard>
    )
}
