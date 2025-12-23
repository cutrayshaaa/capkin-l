import React from 'react';

// Table Skeleton Component
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className = '' }: TableSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-4 ${className}`}>
      {/* Table Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded"></div>
        ))}
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Card Skeleton Component
interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className = '' }: CardSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-4 ${className}`}>
      <div className="h-32 bg-gray-200 rounded-lg"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

// Dashboard Skeleton Component
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>

      {/* Charts/Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
        <div className="bg-white p-6 rounded-lg border space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

// List Skeleton Component
interface ListSkeletonProps {
  items?: number;
  className?: string;
}

export function ListSkeleton({ items = 5, className = '' }: ListSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3">
          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Form Skeleton Component
interface FormSkeletonProps {
  fields?: number;
  className?: string;
}

export function FormSkeleton({ fields = 6, className = '' }: FormSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-6 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      ))}
      
      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <div className="h-10 bg-gray-200 rounded w-20"></div>
        <div className="h-10 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );
}

// Profile Skeleton Component
export function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Profile Header */}
      <div className="flex items-center space-x-4">
        <div className="h-20 w-20 bg-gray-200 rounded-full"></div>
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chart Skeleton Component
interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

export function ChartSkeleton({ height = 300, className = '' }: ChartSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div 
          className="bg-gray-200 rounded"
          style={{ height: `${height}px` }}
        ></div>
      </div>
    </div>
  );
}

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary ${sizeClasses[size]} ${className}`}></div>
  );
}

// Loading Text Component
interface LoadingTextProps {
  lines?: number;
  className?: string;
}

export function LoadingText({ lines = 3, className = '' }: LoadingTextProps) {
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
      ))}
    </div>
  );
}
