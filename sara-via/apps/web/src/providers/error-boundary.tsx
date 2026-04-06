'use client';

import React from 'react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = {
    hasError: false,
    errorMessage: ''
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Frontend boundary caught an error', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-8 text-center">
          <div className="rounded-[28px] border border-white/10 bg-white/10 p-8 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold">حدث خطأ غير متوقع</h2>
            <p className="mt-3 text-slate-300">{this.state.errorMessage}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
