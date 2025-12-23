// Loading state utilities
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  retryCount: number;
}

export function createLoadingState(): LoadingState {
  return {
    isLoading: false,
    error: null,
    retryCount: 0
  };
}

export function setLoading(loadingState: LoadingState, isLoading: boolean): LoadingState {
  return {
    ...loadingState,
    isLoading,
    error: isLoading ? null : loadingState.error // Clear error when starting to load
  };
}

export function setError(loadingState: LoadingState, error: string | null): LoadingState {
  return {
    ...loadingState,
    error,
    isLoading: false
  };
}

export function incrementRetry(loadingState: LoadingState): LoadingState {
  return {
    ...loadingState,
    retryCount: loadingState.retryCount + 1
  };
}

export function resetLoadingState(loadingState: LoadingState): LoadingState {
  return {
    isLoading: false,
    error: null,
    retryCount: 0
  };
}

// Loading component props
export interface LoadingComponentProps {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  retryCount?: number;
  children?: React.ReactNode;
}

// Loading spinner component
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]} ${className}`}></div>
  );
}

// Error state component
export function ErrorState({ 
  error, 
  onRetry, 
  retryCount = 0 
}: { 
  error: string; 
  onRetry?: () => void; 
  retryCount?: number; 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-red-500 mb-4">
        <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <p className="text-red-600 mb-4">{error}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          Coba Lagi {retryCount > 0 && `(${retryCount})`}
        </button>
      )}
    </div>
  );
}

// Empty state component
export function EmptyState({ 
  message, 
  action, 
  actionLabel 
}: { 
  message: string; 
  action?: () => void; 
  actionLabel?: string; 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-gray-400 mb-4">
        <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-gray-600 mb-4">{message}</p>
      {action && actionLabel && (
        <button 
          onClick={action}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
