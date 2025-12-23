import React from 'react';
import { Button } from './ui/button';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface ErrorRetryProps {
  message: string;
  onRetry: () => void;
  type?: 'error' | 'network' | 'timeout' | 'unauthorized';
  className?: string;
  showRetryButton?: boolean;
}

export function ErrorRetry({ 
  message, 
  onRetry, 
  type = 'error',
  className = '',
  showRetryButton = true
}: ErrorRetryProps) {
  const getIcon = () => {
    switch (type) {
      case 'network':
        return <WifiOff className="h-12 w-12 text-red-500" />;
      case 'timeout':
        return <Wifi className="h-12 w-12 text-yellow-500" />;
      case 'unauthorized':
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      default:
        return <AlertCircle className="h-12 w-12 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'network':
        return 'Koneksi Terputus';
      case 'timeout':
        return 'Waktu Habis';
      case 'unauthorized':
        return 'Akses Ditolak';
      default:
        return 'Terjadi Kesalahan';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'network':
        return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      case 'timeout':
        return 'Server tidak merespons dalam waktu yang ditentukan.';
      case 'unauthorized':
        return 'Anda tidak memiliki izin untuk mengakses data ini.';
      default:
        return message || 'Terjadi kesalahan yang tidak terduga.';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[200px] p-6 ${className}`}>
      <div className="text-center space-y-4">
        {getIcon()}
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {getTitle()}
          </h3>
          <p className="text-gray-600 max-w-md">
            {getDescription()}
          </p>
        </div>

        {showRetryButton && (
          <Button 
            onClick={onRetry}
            className="mt-4"
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Coba Lagi
          </Button>
        )}
      </div>
    </div>
  );
}

// Compact Error Component
interface CompactErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function CompactError({ message, onRetry, className = '' }: CompactErrorProps) {
  return (
    <div className={`flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-center space-x-3">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <span className="text-red-700 text-sm">{message}</span>
        {onRetry && (
          <Button 
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="ml-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

// Inline Error Component
interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className = '' }: InlineErrorProps) {
  return (
    <div className={`flex items-center space-x-2 text-red-600 text-sm ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {

  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <ErrorRetry
          message={this.state.error?.message || 'Terjadi kesalahan yang tidak terduga'}
          onRetry={this.resetError}
          type="error"
        />
      );
    }

    return this.props.children;
  }
}

// Default Error Fallback Component
export function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Oops! Terjadi Kesalahan
            </h2>
            <p className="text-gray-600">
              Aplikasi mengalami masalah yang tidak terduga.
            </p>
            {error && (
              <details className="text-left text-sm text-gray-500 bg-gray-50 p-3 rounded">
                <summary className="cursor-pointer font-medium">Detail Error</summary>
                <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
              </details>
            )}
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={resetError}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1"
            >
              Refresh Halaman
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
