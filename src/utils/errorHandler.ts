// Error handling utilities
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class ApiError extends Error {
  public code?: string;
  public status?: number;
  public details?: any;

  constructor(message: string, code?: string, status?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function handleApiError(error: any): AppError {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details
    };
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('Failed to fetch')) {
      return {
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        code: 'NETWORK_ERROR'
      };
    }

    // Timeout errors
    if (error.message.includes('timeout')) {
      return {
        message: 'Server tidak merespons. Silakan coba lagi.',
        code: 'TIMEOUT_ERROR'
      };
    }

    // Other errors
    return {
      message: error.message || 'Terjadi kesalahan yang tidak diketahui.',
      code: 'UNKNOWN_ERROR'
    };
  }

  return {
    message: 'Terjadi kesalahan yang tidak diketahui.',
    code: 'UNKNOWN_ERROR'
  };
}

export function getErrorMessage(error: AppError): string {
  const errorMessages: Record<string, string> = {
    NETWORK_ERROR: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
    TIMEOUT_ERROR: 'Server tidak merespons. Silakan coba lagi.',
    UNAUTHORIZED: 'Sesi Anda telah berakhir. Silakan login kembali.',
    FORBIDDEN: 'Anda tidak memiliki izin untuk melakukan aksi ini.',
    NOT_FOUND: 'Data yang diminta tidak ditemukan.',
    VALIDATION_ERROR: 'Data yang dimasukkan tidak valid.',
    SERVER_ERROR: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
    UNKNOWN_ERROR: 'Terjadi kesalahan yang tidak diketahui.'
  };

  return errorMessages[error.code || 'UNKNOWN_ERROR'] || error.message;
}

export function logError(error: AppError, context?: string): void {
  if (process.env.NODE_ENV === 'development') {
  }
}
