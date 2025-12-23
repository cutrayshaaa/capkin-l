import { API_CONFIG, API_ENDPOINTS } from '../config/api';

// Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id_user: number;
    username: string;
    nama_user: string;
    email: string;
    role: string;
    id_tim: number;
    tim?: {
      id_tim: number;
      nama_tim: string;
      ketua?: {
        id_user: number;
        nama_user: string;
      };
    };
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers,
    };

    // if (API_CONFIG.DEBUG_MODE) {
    //   if (options.body) {
    //   }
    // }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, { 
        ...options, 
        headers,
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      // if (API_CONFIG.DEBUG_MODE) {
      // }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle authentication errors
        if (response.status === 401) {

          this.token = null;
          localStorage.removeItem('iku_token');
          localStorage.removeItem('iku_user');
          throw new Error('Unauthenticated');
        }
        
        // Handle rate limiting (429)
        if (response.status === 429) {
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.request<T>(endpoint, options, retryCount + 1);
          }
          throw new Error('Terlalu banyak permintaan. Silakan coba lagi nanti.');
        }
        
        // Handle specific error types
        if (response.status === 403) {
          throw new Error('Akses ditolak. Anda tidak memiliki izin untuk mengakses data ini.');
        }
        
        if (response.status === 404) {
          throw new Error('Data tidak ditemukan.');
        }
        
        if (response.status === 422) {
          // Handle validation errors - show detailed messages
          let errorMessage = 'Validasi gagal. ';
          if (errorData.errors) {
            // Laravel validation errors format
            const errorMessages = Object.values(errorData.errors).flat();
            errorMessage += errorMessages.join(', ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else {
            errorMessage += 'Periksa kembali data yang diinput.';
          }
          throw new Error(errorMessage);
        }
        
        if (response.status === 500) {
          throw new Error('Terjadi kesalahan pada server. Silakan coba lagi nanti.');
        }
        
        // Retry on server errors (5xx) or network issues
        if ((response.status >= 500 || response.status === 0) && retryCount < 2) {
          // if (API_CONFIG.DEBUG_MODE) {
          // }
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return this.request<T>(endpoint, options, retryCount + 1);
        }
        
        throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // if (API_CONFIG.DEBUG_MODE) {
      // }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - server tidak merespons');
        }
        
        // Retry on network errors
        if (retryCount < 2 && (
          error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('timeout')
        )) {
          // if (API_CONFIG.DEBUG_MODE) {
          // }
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return this.request<T>(endpoint, options, retryCount + 1);
        }
        
        throw error;
      }
      throw new Error('Terjadi kesalahan pada koneksi');
    }
  }

  // Auth methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return response as unknown as LoginResponse;
  }

  async logout(): Promise<void> {
    await this.request(API_ENDPOINTS.LOGOUT, {
      method: 'POST',
    });
  }

  async getProfile(): Promise<any> {
    const response = await this.request(API_ENDPOINTS.ME);
    // Backend returns { user: {...} }, not { data: {...} }
    return (response as any).user || (response as any).data || response;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<any> {
    const response = await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
    return response.data;
  }

  // User methods
  async getUsers(include?: string, perPage?: number, page?: number): Promise<any> {
    const params = new URLSearchParams();
    if (include) params.append('include', include);
    if (perPage) params.append('per_page', perPage.toString());
    if (page) params.append('page', page.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `${API_ENDPOINTS.USERS}?${queryString}` : API_ENDPOINTS.USERS;
    const response = await this.request<any>(endpoint);
    
    // Handle different response structures
    if (Array.isArray(response)) {
      // Response is direct array
      return response;
    } else if (response?.data && Array.isArray(response.data)) {
      // Response has data property
      return response;
    } else {
      // Fallback
      return response.data || response;
    }
  }

  async getTeamMembers(): Promise<any[]> {
    const response = await this.request<any[]>(API_ENDPOINTS.TEAM_MEMBERS);
    return response.data || response;
  }

  async getUser(id: number): Promise<any> {
    const response = await this.request(API_ENDPOINTS.USER_BY_ID(id));
    return response.data;
  }

  async createUser(data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.USERS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateUser(id: number, data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.USER_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteUser(id: number): Promise<void> {
    await this.request(API_ENDPOINTS.USER_BY_ID(id), {
      method: 'DELETE',
    });
  }

  // Team methods
  async getTeams(include?: string, perPage?: number, page?: number): Promise<any> {
    const params = new URLSearchParams();
    if (include) params.append('include', include);
    if (perPage) params.append('per_page', perPage.toString());
    if (page) params.append('page', page.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `${API_ENDPOINTS.TEAMS}?${queryString}` : API_ENDPOINTS.TEAMS;
    const response = await this.request<any>(endpoint);
    return response.data || response;
  }

  async createTeam(data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.TEAMS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateTeam(id: number, data: any): Promise<any> {
    const response = await this.request(`${API_ENDPOINTS.TEAMS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteTeam(id: number): Promise<void> {
    await this.request(`${API_ENDPOINTS.TEAMS}/${id}`, {
      method: 'DELETE',
    });
  }

  // Dashboard methods
  async getAdminDashboard(): Promise<any> {
    const response = await this.request(API_ENDPOINTS.DASHBOARD_ADMIN);
    return response.data;
  }

  async getKetuaDashboard(): Promise<any> {
    const response = await this.request(API_ENDPOINTS.DASHBOARD_KETUA);
    return response.data;
  }

  async getStaffDashboard(): Promise<any> {
    const response = await this.request(API_ENDPOINTS.DASHBOARD_STAFF);
    return response.data;
  }

  // Indikator Kinerja methods
  async getIndikatorKinerjas(include?: string, perPage?: number, page?: number): Promise<any> {
    const params = new URLSearchParams();
    if (include) params.append('include', include);
    if (perPage) params.append('per_page', perPage.toString());
    if (page) params.append('page', page.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `${API_ENDPOINTS.INDIKATOR_KINERJA}?${queryString}` : API_ENDPOINTS.INDIKATOR_KINERJA;
    
    const response = await this.request<any>(endpoint);
    return response.data || response;
  }

  // Staff Indikator Kinerja methods (read-only)
  async getStaffIndikatorKinerjas(include?: string, perPage?: number, page?: number): Promise<any> {
    const params = new URLSearchParams();
    if (include) params.append('include', include);
    if (perPage) params.append('per_page', perPage.toString());
    if (page) params.append('page', page.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/staff/indikator-kinerja?${queryString}` : '/staff/indikator-kinerja';
    
    const response = await this.request<any>(endpoint);
    return response.data || response;
  }

  async createIndikatorKinerja(data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.INDIKATOR_KINERJA, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateIndikatorKinerja(id: number, data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.INDIKATOR_KINERJA_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteIndikatorKinerja(id: number, force: boolean = false): Promise<void> {
    const url = force 
      ? `${API_ENDPOINTS.INDIKATOR_KINERJA_BY_ID(id)}?force=true`
      : API_ENDPOINTS.INDIKATOR_KINERJA_BY_ID(id);
    await this.request(url, {
      method: 'DELETE',
    });
  }

  // IKU methods
  async getIKUs(include?: string, perPage?: number, page?: number): Promise<any> {
    const params = new URLSearchParams();
    if (include) params.append('include', include);
    if (perPage) params.append('per_page', perPage.toString());
    if (page) params.append('page', page.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `${API_ENDPOINTS.IKUS}?${queryString}` : API_ENDPOINTS.IKUS;
    
    const response = await this.request<any>(endpoint);
    return response.data || response;
  }

  // Staff IKU methods (read-only)
  async getStaffIKUs(include?: string, perPage?: number, page?: number): Promise<any> {
    const params = new URLSearchParams();
    if (include) params.append('include', include);
    if (perPage) params.append('per_page', perPage.toString());
    if (page) params.append('page', page.toString());
    
    const queryString = params.toString();
    // Use original staff endpoint
    const endpoint = queryString ? `/staff/iku?${queryString}` : '/staff/iku';
    
    
    const response = await this.request<any>(endpoint);
    return response.data || response;
  }

  async createIKU(data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.IKUS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateIKU(id: number, data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.IKU_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteIKU(id: number, force: boolean = false): Promise<void> {
    const url = force 
      ? `${API_ENDPOINTS.IKU_BY_ID(id)}?force=true`
      : API_ENDPOINTS.IKU_BY_ID(id);
    await this.request(url, {
      method: 'DELETE',
    });
  }

  // Proksi methods
  async getProksis(include?: string, perPage?: number, page?: number): Promise<any> {
    const params = new URLSearchParams();
    if (include) params.append('include', include);
    if (perPage) params.append('per_page', perPage.toString());
    if (page) params.append('page', page.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `${API_ENDPOINTS.PROKSI}?${queryString}` : API_ENDPOINTS.PROKSI;
    
    const response = await this.request<any>(endpoint);
    return response.data || response;
  }

  // Staff Proksi methods (read-only)
  async getStaffProksis(include?: string, perPage?: number, page?: number): Promise<any> {
    const params = new URLSearchParams();
    if (include) params.append('include', include);
    if (perPage) params.append('per_page', perPage.toString());
    if (page) params.append('page', page.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/staff/proksi?${queryString}` : '/staff/proksi';
    
    const response = await this.request<any>(endpoint);
    return response.data || response;
  }

  async createProksi(data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.PROKSI, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateProksi(id: number, data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.PROKSI_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteProksi(id: number, force: boolean = false): Promise<void> {
    const url = force 
      ? `${API_ENDPOINTS.PROKSI_BY_ID(id)}?force=true`
      : API_ENDPOINTS.PROKSI_BY_ID(id);
    await this.request(url, {
      method: 'DELETE',
    });
  }

  // Target methods
  async getTargets(): Promise<any[]> {
    const response = await this.request<any[]>(API_ENDPOINTS.TARGETS);
    return response.data || response;
  }

  // Staff Targets methods (read-only)
  async getStaffTargets(): Promise<any[]> {
    const response = await this.request<any[]>('/staff/targets');
    return response.data || response;
  }

  async createTarget(data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.TARGETS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateTarget(id: number, data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.TARGET_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteTarget(id: number): Promise<void> {
    await this.request(API_ENDPOINTS.TARGET_BY_ID(id), {
      method: 'DELETE',
    });
  }

  // Realisasi methods
  async getRealisasis(): Promise<any[]> {
    const response = await this.request<any[]>(API_ENDPOINTS.REALISASIS);
    return response.data || response;
  }

  // Staff Realisasi methods (read-only)
  async getStaffRealisasis(): Promise<any[]> {
    const response = await this.request<any[]>('/staff/realisasi');
    return response.data || response;
  }

  // Staff Teams methods (read-only)
  async getStaffTeams(): Promise<any[]> {
    const response = await this.request<any[]>('/staff/teams');
    return response.data || response;
  }

  async createRealisasi(data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.REALISASIS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateRealisasi(id: number, data: any): Promise<any> {
    const response = await this.request(API_ENDPOINTS.REALISASI_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteRealisasi(id: number): Promise<void> {
    await this.request(API_ENDPOINTS.REALISASI_BY_ID(id), {
      method: 'DELETE',
    });
  }

  async upsertRealisasi(data: any): Promise<any> {
    const response = await this.request('/realisasi/upsert', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data || response;
  }

  // Period methods
  async getPeriods(): Promise<any[]> {
    // Return static periods since periods table is deleted
    const currentYear = new Date().getFullYear();
    return [
      {
        periode: 'TW 1',
        nama_periode: 'TW 1',
        tahun: currentYear,
        triwulan: 'TW 1',
        type: 'triwulan',
        status: 'aktif'
      },
      {
        periode: 'TW 2',
        nama_periode: 'TW 2',
        tahun: currentYear,
        triwulan: 'TW 2',
        type: 'triwulan',
        status: 'aktif'
      },
      {
        periode: 'TW 3',
        nama_periode: 'TW 3',
        tahun: currentYear,
        triwulan: 'TW 3',
        type: 'triwulan',
        status: 'aktif'
      },
      {
        periode: 'TW 4',
        nama_periode: 'TW 4',
        tahun: currentYear,
        triwulan: 'TW 4',
        type: 'triwulan',
        status: 'aktif'
      }
    ];
  }

  async getActivePeriods(): Promise<any[]> {
    // Return static periods since periods table is deleted
    const currentYear = new Date().getFullYear();
    return [
      {
        periode: 'TW 1',
        nama_periode: 'TW 1',
        tahun: currentYear,
        triwulan: 'TW 1',
        type: 'triwulan',
        status: 'aktif'
      },
      {
        periode: 'TW 2',
        nama_periode: 'TW 2',
        tahun: currentYear,
        triwulan: 'TW 2',
        type: 'triwulan',
        status: 'aktif'
      },
      {
        periode: 'TW 3',
        nama_periode: 'TW 3',
        tahun: currentYear,
        triwulan: 'TW 3',
        type: 'triwulan',
        status: 'aktif'
      },
      {
        periode: 'TW 4',
        nama_periode: 'TW 4',
        tahun: currentYear,
        triwulan: 'TW 4',
        type: 'triwulan',
        status: 'aktif'
      }
    ];
  }

  async getCurrentPeriod(): Promise<any> {
    // Return current period since periods table is deleted
    const currentYear = new Date().getFullYear();
    return {
      id_period: 1,
      nama_periode: 'TW 1',
      tahun: currentYear,
      triwulan: 'TW 1',
      type: 'triwulan',
      status: 'aktif'
    };
  }

  async getPeriodsByYear(year: number): Promise<any[]> {
    // Return static periods for the given year since periods table is deleted
    return [
      {
        periode: 'TW 1',
        nama_periode: 'TW 1',
        tahun: year,
        triwulan: 'TW 1',
        type: 'triwulan',
        status: 'aktif'
      },
      {
        periode: 'TW 2',
        nama_periode: 'TW 2',
        tahun: year,
        triwulan: 'TW 2',
        type: 'triwulan',
        status: 'aktif'
      },
      {
        periode: 'TW 3',
        nama_periode: 'TW 3',
        tahun: year,
        triwulan: 'TW 3',
        type: 'triwulan',
        status: 'aktif'
      },
      {
        periode: 'TW 4',
        nama_periode: 'TW 4',
        tahun: year,
        triwulan: 'TW 4',
        type: 'triwulan',
        status: 'aktif'
      }
    ];
  }

  // IKU detail with relationships
  async getIkuDetail(id: number): Promise<any> {
    const response = await this.request(`/iku/${id}`);
    return response.data || response;
  }

  // Combined Data Endpoints (NEW)
  async getAllData(): Promise<any> {

    const response = await this.request(API_ENDPOINTS.DATA_ALL);

    return response.data || response;
  }

  async getDashboardSummary(): Promise<any> {
    const response = await this.request(API_ENDPOINTS.DATA_SUMMARY);
    return response.data || response;
  }

  async getDataWithRelations(include?: string[]): Promise<any> {
    const params = include ? `?include=${include.join(',')}` : '';
    const endpoint = `${API_ENDPOINTS.DATA_WITH_RELATIONS}${params}`;
    const response = await this.request(endpoint);
    return response.data || response;
  }

  // CRUD operations
  async post(endpoint: string, data: any): Promise<any> {
    const response = await this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response;
  }

  async put(endpoint: string, data: any): Promise<any> {
    const response = await this.request(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response;
  }

  async delete(endpoint: string): Promise<any> {
    const response = await this.request(endpoint, {
      method: 'DELETE',
    });
    return response;
  }

  // File upload method
  async uploadFile(endpoint: string, formData: FormData): Promise<any> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Accept': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
    };

    // if (API_CONFIG.DEBUG_MODE) {
    // }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, { 
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      // if (API_CONFIG.DEBUG_MODE) {
      // }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle authentication errors
        if (response.status === 401) {

          this.token = null;
          localStorage.removeItem('iku_token');
          localStorage.removeItem('iku_user');
          throw new Error('Unauthenticated');
        }
        
        throw new Error(errorData.message || `Upload Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // if (API_CONFIG.DEBUG_MODE) {
      // }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Upload timeout - server tidak merespons');
        }
        throw error;
      }
      throw new Error('Terjadi kesalahan pada upload');
    }
  }
}

export const apiService = new ApiService();