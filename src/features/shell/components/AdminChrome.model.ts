export interface AdminUserRow { id: string; name: string; email: string; status: 'ACTIVE' | 'LOCKED'; trips: number; joined: string; protected?: boolean }
export interface AdminProviderRow { name: string; purpose: string; health: 'Healthy' | 'Degraded' | 'Đã tắt'; quota: number | null; updated: string; enabled: boolean; icon: 'map' | 'weather' | 'price' | 'email' | 'push' | 'geocoding'; tone: string }
export interface AdminJobRow { id: string; description: string; type: string; status: 'FAILED' | 'RETRYING' | 'SUCCESS' | 'RUNNING'; time: string; log?: readonly string[] }
export interface AdminCatalogRow { name: string; detail?: string; tag?: string; enabled?: boolean; palette?: 'sea' | 'nature' | 'city' }
export interface AdminViewModel {
  accounts: number | null; lockedAccounts: number | null; activeTrips: number | null; availableProviders: number | null; providerCount: number | null; attentionJobs: number | null;
  tripCounts: readonly [number | null, number | null, number | null];
  alerts: readonly { level: 'Cảnh báo' | 'Lỗi' | 'Thông tin'; source: string; detail: string; message: string; time: string }[];
  users: readonly AdminUserRow[];
  providers: readonly AdminProviderRow[];
  catalogs: readonly (readonly AdminCatalogRow[])[];
  jobs: readonly AdminJobRow[];
  audit: readonly { title: string; time: string }[];
}
export const unavailableAdminModel: AdminViewModel = {
  accounts:null,lockedAccounts:null,activeTrips:null,availableProviders:null,providerCount:null,attentionJobs:null,
  tripCounts:[null,null,null],alerts:[],users:[],providers:[],catalogs:[[],[],[]],jobs:[],audit:[],
};
