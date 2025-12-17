"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, PieChart, Sparkles, Settings } from "lucide-react"

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
    const pathname = usePathname()

    return (
        <div className={cn("pb-12", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        مراقبة المقهى
                    </h2>
                    <div className="space-y-1">
                        <Button variant={pathname === "/" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right">
                            <Link href="/">
                                <LayoutDashboard className="ml-2 h-4 w-4" /> {/* Swap mr to ml for RTL */}
                                لوحة التحكم
                            </Link>
                        </Button>
                        <Button variant={pathname === "/analytics" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right">
                            <Link href="/analytics">
                                <PieChart className="ml-2 h-4 w-4" />
                                التحليلات
                            </Link>
                        </Button>
                        <Button variant={pathname === "/store" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right">
                            <Link href="/store">
                                <LayoutDashboard className="ml-2 h-4 w-4 rotate-90" />
                                المخزن
                            </Link>
                        </Button>
                        <Button variant={pathname === "/ai-insights" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right">
                            <Link href="/ai-insights">
                                <Sparkles className="ml-2 h-4 w-4 text-purple-500" />
                                ذكاء الأعمال (AI)
                            </Link>
                        </Button>
                        <Button variant={pathname === "/settings" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right">
                            <Link href="/settings">
                                <Settings className="ml-2 h-4 w-4" />
                                الإعدادات
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
