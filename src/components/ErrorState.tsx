import React from 'react';
import { AlertCircle, WifiOff, ServerCrash, ShieldAlert, FileQuestion } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  type?: 'network' | '403' | '404' | '500' | 'timeout' | 'generic';
  showRetry?: boolean;
}

const errorConfig = {
  network: {
    icon: WifiOff,
    title: 'Tidak Ada Koneksi',
    defaultMessage: 'Periksa koneksi internet Anda dan coba lagi',
    color: 'text-orange-500'
  },
  '403': {
    icon: ShieldAlert,
    title: 'Akses Ditolak',
    defaultMessage: 'Anda tidak memiliki izin untuk mengakses data ini',
    color: 'text-red-500'
  },
  '404': {
    icon: FileQuestion,
    title: 'Data Tidak Ditemukan',
    defaultMessage: 'Data yang Anda cari tidak ditemukan',
    color: 'text-yellow-500'
  },
  '500': {
    icon: ServerCrash,
    title: 'Kesalahan Server',
    defaultMessage: 'Terjadi kesalahan pada server. Silakan coba lagi nanti',
    color: 'text-red-500'
  },
  timeout: {
    icon: AlertCircle,
    title: 'Waktu Habis',
    defaultMessage: 'Permintaan memakan waktu terlalu lama. Silakan coba lagi',
    color: 'text-orange-500'
  },
  generic: {
    icon: AlertCircle,
    title: 'Terjadi Kesalahan',
    defaultMessage: 'Gagal memuat data. Silakan coba lagi',
    color: 'text-red-500'
  }
};

export function ErrorState({ 
  message, 
  onRetry, 
  type = 'generic',
  showRetry = true 
}: ErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.icon;
  const displayMessage = message || config.defaultMessage;

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md">
        <CardContent className="text-center py-8 px-6">
          <Icon className={`h-16 w-16 mx-auto mb-4 ${config.color}`} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {config.title}
          </h3>
          <p className="text-muted-foreground mb-6">
            {displayMessage}
          </p>
          {showRetry && onRetry && (
            <Button onClick={onRetry} variant="default">
              Coba Lagi
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface InlineErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function InlineErrorState({ message, onRetry }: InlineErrorStateProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <p className="text-sm text-red-700">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          Retry
        </Button>
      )}
    </div>
  );
}

