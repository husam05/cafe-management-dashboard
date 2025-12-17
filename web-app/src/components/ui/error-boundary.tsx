"use client"

import React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card"

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Error caught by boundary:", error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <GlassCard className="m-4">
                    <GlassCardHeader>
                        <GlassCardTitle className="flex items-center justify-end gap-2 text-red-500">
                            <span>حدث خطأ</span>
                            <AlertTriangle className="h-5 w-5" />
                        </GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent className="text-right">
                        <p className="text-muted-foreground mb-4">
                            عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.
                        </p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <pre className="text-xs bg-red-500/10 p-3 rounded-lg mb-4 overflow-auto text-left" dir="ltr">
                                {this.state.error.message}
                            </pre>
                        )}
                        <Button 
                            onClick={this.handleReset}
                            variant="outline"
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            إعادة المحاولة
                        </Button>
                    </GlassCardContent>
                </GlassCard>
            )
        }

        return this.props.children
    }
}

// Wrapper for async components
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: React.ReactNode
) {
    return function WrappedComponent(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <Component {...props} />
            </ErrorBoundary>
        )
    }
}
