import type { AdminDatabase } from '../types';

const base = (import.meta.env.VITE_SAJHA_API_BASE_URL || '').replace(/\/+$/, '');
export const liveAdminEnabled = Boolean(base);

interface Tokens {
  accessToken: string;
  refreshToken: string;
  user: { name: string; roles: string[] };
}

export class AdminApi {
  private access: string | null = null;
  private refresh: string | null = null;
  private displayName = 'Administrator';
  get signedIn() { return this.access !== null; }
  get name() { return this.displayName; }

  private async response(path: string, method: string, body?: unknown, token?: string): Promise<Response> {
    return fetch(`${base}/api/v1${path}`, {
      method,
      headers: {
        'Accept': 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }
  private async checked<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = await response.json() as { error?: { message?: string } };
        if (body?.error?.message) message = body.error.message;
      } catch { /* Avoid showing unknown HTML error bodies. */ }
      throw new Error(message);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
  async login(email: string, password: string): Promise<void> {
    const result = await this.checked<Tokens>(await this.response('/auth/login', 'POST', { email, password }));
if (!result.user?.roles?.includes('ADMIN')) {
      // This is only a UI guard. Spring Boot must still reject non-admin requests.
      this.access = null;
      this.refresh = null;
      throw new Error('This account is not an authorized SaJHa administrator.');
    }
    this.access = result.accessToken;
    this.refresh = result.refreshToken;
   this.displayName = result.user.name;
  }
  private async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    if (!this.access) throw new Error('Sign in as an administrator first.');
    let res = await this.response(path, method, body, this.access);
    if (res.status === 401 && this.refresh) {
      try {
        const tokens = await this.checked<Tokens>(await this.response('/auth/refresh', 'POST', { refreshToken: this.refresh }));
        if (!tokens.user?.roles?.includes('ADMIN')) throw new Error('Administrator permission revoked.');
        this.access = tokens.accessToken;
        this.refresh = tokens.refreshToken;
        res = await this.response(path, method, body, this.access);
      } catch (error) {
        this.access = null;
        this.refresh = null;
        throw error;
      }
    }
    return this.checked<T>(res);
  }
  async snapshot(): Promise<AdminDatabase> {
    const result = await this.request<Omit<AdminDatabase, 'schemaVersion'>>('/admin/business-requests', 'GET');
    return { ...result, schemaVersion: 1 };
  }
  async action(id: string, kind: string, payload?: unknown): Promise<void> {
    const suffix: Record<string, string> = {
      payment: 'payment', revoke: 'payment', approve: 'approve',
      decline: 'decline', suspend: 'suspend', restore: 'restore',
    };
    const endpoint = suffix[kind];
    if (!endpoint) throw new Error('Action is unavailable in live mode.');
    await this.request(`/admin/business-requests/${encodeURIComponent(id)}/${endpoint}`,
      kind === 'revoke' ? 'DELETE' : 'POST', payload);
  }
  async moderate(reportId: string, decision: 'dismissed' | 'removed', note: string): Promise<void> {
    await this.request(`/admin/review-reports/${encodeURIComponent(reportId)}/moderate`,
      'POST', { decision, note });
  }
  async imageBlob(path: string): Promise<string> {
    if (!path.startsWith('/api/v1/admin/business-requests/') || !path.endsWith('/banner')) {
      throw new Error('Invalid private image path.');
    }
    if (!this.access) throw new Error('Sign in as an administrator first.');
    const response = await this.response(path.replace(/^\/api\/v1/, ''), 'GET', undefined, this.access);
    if (!response.ok) throw new Error('Private banner could not be loaded.');
    return URL.createObjectURL(await response.blob());
  }
  async logout(): Promise<void> {
    try {
      if (this.access && this.refresh) {
        await this.response('/auth/logout', 'POST', { refreshToken: this.refresh }, this.access);
      }
    } finally {
      this.access = null;
      this.refresh = null;
    }
  }
}
export const adminApi = new AdminApi();
