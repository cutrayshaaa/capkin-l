import React from 'react';
import { 
  Inbox, 
  FileText, 
  Users, 
  Target, 
  TrendingUp,
  FolderOpen,
  Database
} from 'lucide-react';
import { Button } from './ui/button';

interface EmptyStateProps {
  icon?: 'inbox' | 'file' | 'users' | 'target' | 'trending' | 'folder' | 'database';
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const iconMap = {
  inbox: Inbox,
  file: FileText,
  users: Users,
  target: Target,
  trending: TrendingUp,
  folder: FolderOpen,
  database: Database
};

export function EmptyState({ 
  icon = 'inbox',
  title = 'Tidak Ada Data',
  message,
  actionLabel,
  onAction
}: EmptyStateProps) {
  const Icon = iconMap[icon];

  return (
    <div className="text-center py-12">
      <Icon className="h-16 w-16 text-gray-400 mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {message}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="default">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

interface TableEmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function TableEmptyState({ 
  message, 
  actionLabel, 
  onAction 
}: TableEmptyStateProps) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p className="mb-2">{message}</p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction} 
          variant="outline" 
          size="sm"
          className="mt-4"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

