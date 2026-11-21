import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { ApprovalStatus, Visibility } from '../types';

export function Badge({ status, visibility }: { status: ApprovalStatus; visibility?: Visibility }) {
  const label = status === 'approved' && visibility === 'suspended' ? 'Suspended' :
    status.charAt(0).toUpperCase() + status.slice(1);
  const style = status === 'approved' && visibility === 'suspended' ? 'suspended' : status;
  return <span className={`status-badge ${style}`}><span className="badge-dot" />{label}</span>;
}

export function EmptyState({ icon, title, description }: { icon: 'requests' | 'store' | 'flag' | 'activity'; title: string; description: string }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={27} /></span><h3>{title}</h3><p>{description}</p></div>;
}

export function Modal({ title, description, children, onClose }: {
  title: string; description?: string; children: ReactNode; onClose: () => void;
}) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}>
      <div className="modal-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
      {children}
    </div>
  </div>;
}

export const formatDate = (iso?: string) => iso ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso)) : '—';
export const formatDateTime = (iso?: string) => iso ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '—';
