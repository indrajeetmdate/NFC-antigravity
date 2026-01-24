
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-4 text-center">
                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4 border border-red-900/50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                    <p className="text-zinc-400 mb-6 max-w-md">We're sorry, but the application encountered an unexpected error.</p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-gold text-black px-6 py-2 rounded-lg font-bold hover:bg-gold-600 transition-colors"
                        >
                            Reload Application
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="bg-zinc-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-zinc-700 transition-colors"
                        >
                            Go Home
                        </button>
                    </div>
                    {this.state.error && (
                        <div className="mt-8 p-4 bg-black/50 rounded-lg text-left max-w-lg w-full overflow-auto max-h-40 border border-zinc-800">
                            <p className="font-mono text-xs text-red-400">{this.state.error.toString()}</p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
