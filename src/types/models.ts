// Type definitions that match backend models

export interface Period {
  periode: string;
  nama_periode: string;
  tahun: number;
  triwulan?: string;
  bulan?: number;
  type: 'bulanan' | 'triwulan' | 'semester' | 'tahunan';
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id_tim: number;
  nama_tim: string;
  nama_ketua?: string;
  id_ketua?: number;
  created_at?: string;
  updated_at?: string;
  users?: User[];
  ikus?: IKU[];
}

export interface User {
  id_user: number;
  username: string;
  nama_user: string;
  email?: string;
  nip?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: 'Laki-laki' | 'Perempuan';
  alamat?: string;
  no_telepon?: string;
  role: 'admin' | 'ketua_tim' | 'staff';
  id_tim?: number;
  status: string;
  foto_profil?: string;
  created_at?: string;
  updated_at?: string;
  tim?: Team;
}

export interface IndikatorKinerja {
  id_indikator_kinerja: number;
  nama_indikator: string;
  jenis: 'iku' | 'proksi';
  id_tim?: number;
  created_at?: string;
  updated_at?: string;
  tim?: Team;
  iku?: IKU;
  ikus?: IKU[];
  proksi?: Proksi;
}

export interface IKU {
  id_iku: number;
  id_indikator_kinerja: number;
  tipe: 'poin' | 'persen';
  target_poin?: number;
  target_persentase?: number;
  target_per_tahun?: number;
  created_at?: string;
  updated_at?: string;
  indikatorKinerja?: IndikatorKinerja;
  targets?: Target[];
  realisasis?: Realisasi[];
}

export interface Proksi {
  id_proksi: number;
  id_indikator_kinerja: number;
  target_per_tahun: number;
  target_persentase?: number;
  created_at?: string;
  updated_at?: string;
  indikatorKinerja?: IndikatorKinerja;
  targets?: Target[];
  realisasis?: Realisasi[];
}

export interface Target {
  id_target: number;
  id_iku?: number;
  id_proksi?: number;
  periode?: string;
  tahun: number;
  persenan_target?: number;
  satuan?: number;
  target_value?: number;
  target_percentage?: number;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  iku?: IKU;
  proksi?: Proksi;
  creator?: User;
  realisasis?: Realisasi[];
}

export interface Realisasi {
  id_realisasi: number;
  id_iku?: number;
  id_proksi?: number;
  id_target?: number;
  periode?: string;
  tahun?: number;
  realisasi: number;
  batas_waktu?: string;
  persenan_tercapai_per_tw?: number;
  persenan_tercapai_target_pertahun?: number;
  solusi?: string;
  kendala?: string;
  link_bdk?: string;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  iku?: IKU;
  proksi?: Proksi;
  targetData?: Target;
  creator?: User;
  persentase?: number;
}

export interface Notification {
  id_notif: number;
  id_user: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at?: string;
  updated_at?: string;
  user?: User;
}

export interface Setting {
  id_setting: number;
  key: string;
  value: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id_audit: number;
  user_id: number;
  action: string;
  table_name: string;
  record_id?: number;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
  user?: User;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

// Form data types for API requests
export interface CreateIKUData {
  nama_iku: string;
  pic: string;
  id_tim: number;
  deskripsi?: string;
  satuan?: string;
  target_type?: 'persentase' | 'jumlah' | 'waktu';
  target_iku?: number;
  persenan_target?: number;
  status?: string;
}

export interface UpdateIKUData {
  nama_iku?: string;
  pic?: string;
  id_tim?: number;
  deskripsi?: string;
  satuan?: string;
  target_type?: 'persentase' | 'jumlah' | 'waktu';
  target_iku?: number;
  persenan_target?: number;
  status?: string;
}

export interface CreateTargetData {
  id_iku: number;
  target_iku: number;
  satuan_target: number;
  persenan_target: number;
  satuan?: number;
  keterangan?: string;
  status?: string;
  created_by: number;
}

export interface UpdateTargetData {
  id_iku?: number;
  id_period?: number;
  target_iku?: number;
  satuan_target?: number;
  persenan_target?: number;
  satuan?: number;
  keterangan?: string;
  status?: string;
}

export interface CreateRealisasiData {
  id_iku: number;
  id_target?: number;
  target: number;
  realisasi: number;
  keterangan?: string;
  batas_waktu?: string;
  realisasi_proxy?: number;
  solusi?: string;
  kendala?: string;
  link_bdk?: string;
  status?: 'on_track' | 'at_risk' | 'behind' | 'completed';
  attachment?: string;
  created_by: number;
}

export interface UpdateRealisasiData {
  id_iku?: number;
  id_period?: number;
  id_target?: number;
  target?: number;
  realisasi?: number;
  keterangan?: string;
  batas_waktu?: string;
  realisasi_proxy?: number;
  solusi?: string;
  kendala?: string;
  link_bdk?: string;
  status?: 'on_track' | 'at_risk' | 'behind' | 'completed';
  attachment?: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}


