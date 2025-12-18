"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, PieChart, Sparkles, Settings, Target, Receipt, Users, Wallet, Trash2, TrendingUp, ChevronDown } from "lucide-react"
import { useState } from "react"

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
    const pathname = usePathname()
    const [ownerOpen, setOwnerOpen] = useState(pathname.startsWith("/dashboard"))

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
                                <LayoutDashboard className="ml-2 h-4 w-4" />
                                لوحة التحكم
                            </Link>
                        </Button>
                        
                        {/* Owner Dashboard Section */}
                        <div className="space-y-1">
                            <Button 
                                variant={pathname.startsWith("/dashboard") ? "secondary" : "ghost"} 
                                className="w-full justify-between text-right"
                                onClick={() => setOwnerOpen(!ownerOpen)}
                            >
                                <ChevronDown className={cn("h-4 w-4 transition-transform", ownerOpen && "rotate-180")} />
                                <div className="flex items-center">
                                    <Target className="ml-2 h-4 w-4 text-emerald-500" />
                                    لوحة المالك
                                </div>
                            </Button>
                            
                            {ownerOpen && (
                                <div className="mr-4 space-y-1 border-r border-emerald-500/20 pr-2">
                                    <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right text-sm">
                                        <Link href="/dashboard">
                                            <TrendingUp className="ml-2 h-3 w-3 text-emerald-500" />
                                            نظرة عامة
                                        </Link>
                                    </Button>
                                    <Button variant={pathname === "/dashboard/outflow" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right text-sm">
                                        <Link href="/dashboard/outflow">
                                            <Wallet className="ml-2 h-3 w-3 text-red-500" />
                                            تفاصيل المصروفات
                                        </Link>
                                    </Button>
                                    <Button variant={pathname === "/dashboard/payroll" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right text-sm">
                                        <Link href="/dashboard/payroll">
                                            <Users className="ml-2 h-3 w-3 text-purple-500" />
                                            إدارة الرواتب
                                        </Link>
                                    </Button>
                                    <Button variant={pathname === "/dashboard/waste" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right text-sm">
                                        <Link href="/dashboard/waste">
                                            <Trash2 className="ml-2 h-3 w-3 text-orange-500" />
                                            تتبع الهدر
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                        
                        <Button variant={pathname === "/kpis" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right">
                            <Link href="/kpis">
                                <Target className="ml-2 h-4 w-4 text-emerald-500" />
                                المؤشرات المالية (KPIs)
                            </Link>
                        </Button>
                        <Button variant={pathname === "/analytics" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right">
                            <Link href="/analytics">
                                <PieChart className="ml-2 h-4 w-4" />
                                التحليلات
                            </Link>
                        </Button>
                        <Button variant={pathname === "/expenses" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right">
                            <Link href="/expenses">
                                <Receipt className="ml-2 h-4 w-4 text-red-500" />
                                المصروفات
                            </Link>
                        </Button>
                        <Button variant={pathname === "/payroll" ? "secondary" : "ghost"} asChild className="w-full justify-start text-right">
                            <Link href="/payroll">
                                <Users className="ml-2 h-4 w-4 text-blue-500" />
                                الرواتب
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
