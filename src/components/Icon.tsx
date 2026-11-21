import type { ReactNode } from 'react';

type IconName = 'dashboard' | 'requests' | 'store' | 'flag' | 'activity' | 'settings' |
  'search' | 'menu' | 'close' | 'check' | 'clock' | 'ban' | 'phone' | 'message' |
  'globe' | 'pin' | 'calendar' | 'user' | 'arrow' | 'chevron' | 'shield' |
  'card' | 'alert' | 'refresh' | 'star' | 'eye' | 'info' | 'copy' | 'external' | 'filter' | 'file';

const paths: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  requests: <><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4"/></>,
  store: <><path d="M3 10h18l-2-6H5l-2 6ZM5 10v11h14V10M9 21v-8h6v8"/><path d="M3 10c0 2 3 2 4 0 1 2 4 2 5 0 1 2 4 2 5 0 1 2 4 2 4 0"/></>,
  flag: <><path d="M5 21V4M5 5c5-3 9 3 15 0v11c-6 3-10-3-15 0"/></>,
  activity: <><path d="M3 12h4l3-7 4 14 3-7h4"/></>,
  settings: <><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="4"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 5 5"/></>,
  menu: <><path d="M3 6h18M3 12h18M3 18h18"/></>,
  close: <><path d="m5 5 14 14M19 5 5 19"/></>,
  check: <><path d="m4 12 5 5L20 6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,
  ban: <><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5 18.5 18.5"/></>,
  phone: <><path d="M6 3 3 7c-.8 7 7 15 14 14l4-3-5-5-3 2c-3-1-5-3-6-6l2-2-3-4Z"/></>,
  message: <><path d="M21 11.5c0 5-4 9-9 9-1.5 0-3-.4-4.1-1L3 21l1.5-4.9A9 9 0 1 1 21 11.5Z"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c6 6 6 12 0 18M12 3c-6 6-6 12 0 18"/></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.7"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-7 8-7s8 2 8 7"/></>,
  arrow: <><path d="M4 12h16m-7-7 7 7-7 7"/></>,
  chevron: <><path d="m9 5 7 7-7 7"/></>,
  shield: <><path d="m12 2 9 4v6c0 6-5 9-9 10-4-1-9-4-9-10V6l9-4Z"/><path d="m8 12 3 3 5-6"/></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></>,
  alert: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v1"/></>,
  refresh: <><path d="M20 7V3l-4 4M4 17v4l4-4"/><path d="M5 9a7 7 0 0 1 12-3l3 1M19 15a7 7 0 0 1-12 3l-3-1"/></>,
  star: <><path d="m12 2 3 6.5 7 1-5 5 1.2 7-6.2-3.4-6.2 3.4L7 14.5l-5-5 7-1L12 2Z"/></>,
  eye: <><path d="M2 12c2.5-5 6-7 10-7s7.5 2 10 7c-2.5 5-6 7-10 7s-7.5-2-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></>,
  external: <><path d="M13 4h7v7M20 4 11 13"/><path d="M20 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"/></>,
  filter: <><path d="M3 5h18l-7 8v7l-4-2v-5L3 5Z"/></>,
  file: <><path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h5M8 13h8M8 17h8"/></>,
};

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
