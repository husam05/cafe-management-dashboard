"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card"
import { Sparkles, Loader2, TrendingUp, AlertTriangle, FileText, Zap, Brain, BarChart3, Activity } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function AIInsightsPage() {
    const [result, setResult] = useState("")
    const [loading, setLoading] = useState(false)
    const [activePrompt, setActivePrompt] = useState("")

    const generateInsight = async (promptType: string, promptText: string) => {
        setLoading(true)
        setActivePrompt(promptType)
        setResult("") // Clear previous
        try {
            const res = await fetch("/api/generate-insight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: promptText }),
            })
            const data = await res.json()
            setResult(data.text)
        } catch (error) {
            setResult("# خطأ\nفشل في إنشاء الرؤى. يرجى المحاولة مرة أخرى.")
        } finally {
            setLoading(false)
            setActivePrompt("")
        }
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 min-h-screen">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-purple-600 via-indigo-600 to-blue-600 p-8 shadow-2xl">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-right">
                        <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center justify-end gap-3">
                            <span>مركز ذكاء الأعمال</span>
                            <Brain className="w-10 h-10 animate-pulse" />
                        </h1>
                        <p className="text-purple-100 text-lg max-w-2xl">
                            استخدم قوة الذكاء الاصطناعي لتحليل البيانات والتنبؤ بالمبيعات
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 border border-white/30">
                            <div className="text-white/80 text-xs">نموذج محلي</div>
                            <div className="text-white text-lg font-bold flex items-center gap-1">
                                <Activity className="w-4 h-4 animate-pulse" />
                                نشط
                            </div>
                        </div>
                    </div>
                </div>
                {/* Decorative Background Elements */}
                <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-purple-500 opacity-20 blur-3xl"></div>
                <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-indigo-500 opacity-20 blur-3xl"></div>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Control Panel */}
                <div className="md:col-span-4 space-y-4">
                    <GlassCard className="h-fit">
                        <GlassCardHeader>
                            <GlassCardTitle className="flex items-center justify-end gap-2">
                                أدوات التحليل
                                <Zap className="h-5 w-5 text-purple-500" />
                            </GlassCardTitle>
                            <p className="text-sm text-muted-foreground text-right">اختر نوع التقرير المطلوب</p>
                        </GlassCardHeader>
                        <GlassCardContent className="space-y-3">
                            <Button
                                variant="outline"
                                className="w-full justify-end gap-2 h-16 text-lg hover:scale-105 transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                                onClick={() => generateInsight('full', 'full_report')}
                                disabled={loading}
                            >
                                <span className="font-bold">تقرير شامل</span>
                                <FileText className="h-5 w-5 text-blue-500" />
                            </Button>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="secondary"
                                    className="justify-center gap-2 h-14 hover:scale-105 transition-all duration-300 flex-col"
                                    onClick={() => generateInsight('forecast', 'forecast_only')}
                                    disabled={loading}
                                >
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                    <span className="text-xs">توقعات المبيعات</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="justify-center gap-2 h-14 hover:scale-105 transition-all duration-300 flex-col"
                                    onClick={() => generateInsight('anomalies', 'detect_anomalies')}
                                    disabled={loading}
                                >
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    <span className="text-xs">كشف الشذوذ</span>
                                </Button>
                            </div>

                            {/* New Recommendations Button */}
                            <Button
                                variant="outline"
                                className="w-full justify-end gap-2 h-14 hover:scale-105 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                                onClick={() => generateInsight('recommendations', 'recommendations')}
                                disabled={loading}
                            >
                                <span className="font-medium">توصيات ذكية</span>
                                <Sparkles className="h-5 w-5 text-emerald-500" />
                            </Button>

                            {loading && (
                                <GlassCard variant="neon" className="animate-pulse">
                                    <div className="flex flex-col items-center justify-center p-6 space-y-3">
                                        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                                        <span className="text-sm font-bold text-purple-900 dark:text-purple-300">
                                            {activePrompt === 'forecast' ? 'جارٍ حساب التوقعات...' : 
                                             activePrompt === 'anomalies' ? 'جارٍ تحليل الشذوذ...' :
                                             activePrompt === 'recommendations' ? 'جارٍ إنشاء التوصيات...' :
                                             'جارٍ تحليل البيانات...'}
                                        </span>
                                        <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 animate-pulse rounded-full" style={{ width: '70%' }}></div>
                                        </div>
                                    </div>
                                </GlassCard>
                            )}
                        </GlassCardContent>
                    </GlassCard>

                    {/* Info Card */}
                    <GlassCard className="bg-blue-500/5 border-blue-500/20">
                        <GlassCardContent className="p-4">
                            <div className="flex items-start gap-3 text-right" dir="rtl">
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm mb-1 text-blue-900 dark:text-blue-100">
                                        نموذج محلي آمن
                                    </h4>
                                    <p className="text-xs text-blue-800 dark:text-blue-200">
                                        يتم تشغيل التحليل محلياً على جهازك لضمان الخصوصية وسرعة الأداء
                                    </p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-blue-500 flex-shrink-0" />
                            </div>
                        </GlassCardContent>
                    </GlassCard>

                    {/* Model Performance Card */}
                    <GlassCard className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20">
                        <GlassCardContent className="p-4">
                            <div className="text-right" dir="rtl">
                                <h4 className="font-bold text-sm mb-3 text-emerald-900 dark:text-emerald-100 flex items-center justify-end gap-2">
                                    أداء النماذج
                                    <Activity className="h-4 w-4" />
                                </h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-emerald-600 font-medium">نشط</span>
                                        <span className="text-muted-foreground">LightGBM</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-emerald-600 font-medium">نشط</span>
                                        <span className="text-muted-foreground">ARIMA</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-emerald-600 font-medium">نشط</span>
                                        <span className="text-muted-foreground">Regression</span>
                                    </div>
                                </div>
                            </div>
                        </GlassCardContent>
                    </GlassCard>
                </div>

                {/* Result Panel */}
                <div className="md:col-span-8">
                    <GlassCard className="min-h-[600px]">
                        <GlassCardHeader>
                            <GlassCardTitle className="flex items-center justify-end gap-2">
                                النتائج والتوصيات
                                <Sparkles className="h-5 w-5 text-indigo-500" />
                            </GlassCardTitle>
                        </GlassCardHeader>
                        <GlassCardContent>
                            {result ? (
                                <div className="prose prose-purple dark:prose-invert max-w-none text-right animate-in fade-in duration-500" dir="rtl">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {result}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                                    <div className="relative">
                                        <Sparkles className="h-24 w-24 mb-4 text-slate-200 dark:text-slate-800 animate-pulse" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-2xl rounded-full"></div>
                                    </div>
                                    <p className="text-lg font-medium">اختر أداة تحليل لبدء الرؤى</p>
                                    <p className="text-sm text-muted-foreground mt-2">سيتم عرض النتائج هنا</p>
                                </div>
                            )}
                        </GlassCardContent>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
