"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card"
import Link from "next/link"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Page Error:", error)
    }, [error])

    return (
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen">
            <GlassCard className="max-w-md w-full">
                <GlassCardHeader>
                    <GlassCardTitle className="flex items-center justify-center gap-3 text-red-500">
                        <AlertTriangle className="h-8 w-8" />
                        <span className="text-2xl">حدث خطأ</span>
                    </GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent className="text-center space-y-6">
                    <p className="text-muted-foreground text-lg">
                        عذراً، حدث خطأ غير متوقع أثناء تحميل الصفحة.
                    </p>
                    
                    {process.env.NODE_ENV === 'development' && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <p className="text-sm text-red-400 font-mono text-left" dir="ltr">
                                {error.message}
                            </p>
                            {error.digest && (
                                <p className="text-xs text-red-300/70 mt-2 text-left" dir="ltr">
                                    Error ID: {error.digest}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button 
                            onClick={reset}
                            variant="default"
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            إعادة المحاولة
                        </Button>
                        <Button 
                            asChild
                            variant="outline"
                            className="gap-2"
                        >
                            <Link href="/">
                                <Home className="h-4 w-4" />
                                الصفحة الرئيسية
                            </Link>
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني
                    </p>
                </GlassCardContent>
            </GlassCard>
        </div>
    )
}
