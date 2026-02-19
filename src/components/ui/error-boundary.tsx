"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-lg">
                        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>

                        <h2 className="text-xl font-caladea text-gray-900 mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-gray-500 text-sm mb-6 font-poppins">
                            An unexpected error occurred. Please try again.
                        </p>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = "/dashboard"}
                                className="flex-1 h-11 rounded-full border-gray-200"
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Home
                            </Button>
                            <Button
                                onClick={this.handleRetry}
                                className="flex-1 h-11 rounded-full bg-gray-900 text-white hover:bg-gray-800"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Retry
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
