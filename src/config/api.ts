// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  PROFILE: '/auth/profile',
  CHANGE_PASSWORD: '/auth/change-password',
  
  // Users
  USERS: '/users',
  TEAM_MEMBERS: '/users/team-members',
  USER_BY_ID: (id: number) => `/users/${id}`,
  USER_UPLOAD_AVATAR: '/users/upload-avatar',
  
  // Teams
  TEAMS: '/teams',
  
  // Dashboard
  DASHBOARD_ADMIN: '/dashboard/admin',
  DASHBOARD_KETUA: '/dashboard/ketua',
  DASHBOARD_STAFF: '/dashboard/staff',
  
  // Indikator Kinerja
  INDIKATOR_KINERJA: '/indikator-kinerja',
  INDIKATOR_KINERJA_BY_ID: (id: number) => `/indikator-kinerja/${id}`,
  
  // IKU
  IKUS: '/iku',
  IKU_BY_ID: (id: number) => `/iku/${id}`,
  
  // Proksi
  PROKSI: '/proksi',
  PROKSI_BY_ID: (id: number) => `/proksi/${id}`,
  
  // Targets
  TARGETS: '/targets',
  TARGET_BY_ID: (id: number) => `/targets/${id}`,
  
  // Realisasi
  REALISASIS: '/realisasi',
  REALISASI_BY_ID: (id: number) => `/realisasi/${id}`,
  
  // Combined Data Endpoints (NEW)
  DATA_ALL: '/data/all',
  DATA_SUMMARY: '/data/summary',
  DATA_WITH_RELATIONS: '/data/with-relations',
};
