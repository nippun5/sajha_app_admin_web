import type { AdminDatabase } from '../types';
import { seedDatabase } from './demoData';

const STORAGE_KEY = 'sajha-admin-demo-v1';

/** Demo state is stored in THIS browser only, not in Spring Boot or Flutter. */
export function loadDemoDatabase(): AdminDatabase {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDatabase();
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return seedDatabase();
    const data = value as Partial<AdminDatabase>;
    if (data.schemaVersion !== 1 || !Array.isArray(data.requests) ||
        !Array.isArray(data.reports) || !Array.isArray(data.activity)) return seedDatabase();
    return data as AdminDatabase;
  } catch {
    return seedDatabase();
  }
}

export function saveDemoDatabase(db: AdminDatabase): void {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* Private browsing / storage blocked */ }
}

export function resetDemoDatabase(): AdminDatabase {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage blocked */ }
  return seedDatabase();
}
