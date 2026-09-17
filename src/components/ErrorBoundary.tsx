import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-[#faf8f5]">
          <div className="w-full max-w-md bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-900">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h2>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                {this.props.fallbackMessage || 'An unexpected error occurred in this view. Your session data is preserved.'}
              </p>
              {this.state.error && (
                <div className="mt-3 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-left font-mono text-[11px] text-stone-600 truncate max-w-full">
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto"
              >
                Reload View
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  this.handleReset();
                  window.location.href = '/';
                }}
                leftIcon={<Home className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto"
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
