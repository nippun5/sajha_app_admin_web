import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from './components/Icon';
import { Badge, EmptyState, Modal, formatDate, formatDateTime } from './components/UI';
import { loadDemoDatabase, resetDemoDatabase, saveDemoDatabase } from './data/store';
import {
  approveRequest, canApprove, declineRequest, isPublicBusiness, moderateReport,
  restoreBusiness, revokePaymentVerification, suspendBusiness, verifyManualPayment,
} from './lib/workflow';
import type { AdminDatabase, BusinessRequest, Section, ApprovalStatus } from './types';
import { adminApi, liveAdminEnabled } from './live/adminApi';

const ADMIN_NAME = 'Demo Admin';
const emptyDatabase = (): AdminDatabase => ({ schemaVersion: 1, requests: [], reports: [], activity: [] });
const navigation: Array<{ id: Section; label: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
  { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
  { id: 'requests', label: 'Business requests', icon: 'requests' },
  { id: 'published', label: 'Published businesses', icon: 'store' },
  { id: 'reports', label: 'Review reports', icon: 'flag' },
  { id: 'activity', label: 'Activity log', icon: 'activity' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const titles: Record<Section, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'An overview of your community business directory.' },
  requests: { title: 'Business requests', subtitle: 'Review owner submissions and make publication decisions.' },
  published: { title: 'Published businesses', subtitle: 'Manage visibility of approved business profiles.' },
  reports: { title: 'Review moderation', subtitle: 'Handle community reports against business reviews.' },
  activity: { title: 'Activity history', subtitle: 'Audit the actions performed in this demo portal.' },
  settings: { title: 'Demo settings', subtitle: 'Understand the limits of this frontend preview.' },
};

type DialogState =
  | { type: 'payment'; id: string }
  | { type: 'revoke'; id: string }
  | { type: 'approve'; id: string }
  | { type: 'decline'; id: string }
  | { type: 'suspend'; id: string }
  | { type: 'restore'; id: string }
  | { type: 'moderate'; id: string; decision: 'dismissed' | 'removed' }
  | { type: 'reset' };

const identity = (id: string) => id.replace(/^demo-/, '');
const phoneHref = (raw: string) => raw.replace(/[^\d+]/g, '');

function App() {
  const [db, setDb] = useState<AdminDatabase>(() => liveAdminEnabled ? emptyDatabase() : loadDemoDatabase());
  const [connected, setConnected] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [working, setWorking] = useState(false);
  const [bannerUrls, setBannerUrls] = useState<Record<string, string>>({});
  const bannerPending = useRef(new Set<string>());
  const [section, setSection] = useState<Section>('dashboard');
  const [filter, setFilter] = useState<'all' | ApprovalStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [paymentAcknowledged, setPaymentAcknowledged] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { if (!liveAdminEnabled) saveDemoDatabase(db); }, [db]);
  useEffect(() => {
    if (!liveAdminEnabled || !connected) return;
    let active = true;
    const fetchSnapshot = async () => {
      try {
        const next = await adminApi.snapshot();
        if (active) setDb(next);
      } catch (e) {
        if (active) setToast(e instanceof Error ? e.message : 'Connection to Spring Boot failed.');
      }
    };
    void fetchSnapshot();
    const timer = window.setInterval(() => void fetchSnapshot(), 20000);
    return () => { active = false; window.clearInterval(timer); };
  }, [connected]);
  useEffect(() => {
    if (!liveAdminEnabled || !connected) return;
    for (const request of db.requests) {
      if (!request.bannerUrl || bannerUrls[request.id] || bannerPending.current.has(request.id)) continue;
      const id = request.id;
      bannerPending.current.add(id);
      void adminApi.imageBlob(request.bannerUrl).then(url => {
        setBannerUrls(prev => ({ ...prev, [id]: url }));
      }).catch(() => {}).finally(() => bannerPending.current.delete(id));
    }
  }, [connected, db.requests, bannerUrls]);

  async function refreshLive() {
    if (liveAdminEnabled && adminApi.signedIn) setDb(await adminApi.snapshot());
  }
  async function signInLive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setAuthError('');
    try {
      await adminApi.login(adminEmail.trim(), adminPassword);
      setAdminPassword('');
      setDb(await adminApi.snapshot());
      setConnected(true);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally { setWorking(false); }
  }
  async function signOutLive() {
    try { await adminApi.logout(); }
    catch { /* Local logout must work even without network. */ }
    finally {
      Object.values(bannerUrls).forEach(url => URL.revokeObjectURL(url));
      bannerPending.current.clear();
      setDb(emptyDatabase()); setConnected(false); setBannerUrls({});
    }
  }
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!selectedId && !dialog) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDialog(null); setSelectedId(null); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, dialog]);

  const count = (status: ApprovalStatus) => db.requests.filter(r => r.status === status).length;
  const pending = db.requests.filter(r => r.status === 'pending');
  const approved = db.requests.filter(r => r.status === 'approved');
  const published = approved.filter(isPublicBusiness);
  const openReports = db.reports.filter(r => r.status === 'open');
  const selected = db.requests.find(r => r.id === selectedId) || null;
  const newestActivity = [...db.activity].sort((a, b) => b.at.localeCompare(a.at));
  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...db.requests].filter(r =>
      (filter === 'all' || r.status === filter) &&
      (!q || [r.businessName, r.id, r.category, r.ownerName, r.phone, r.address].some(v => v.toLowerCase().includes(q))),
    ).sort((a, b) => b.lastSubmittedAt.localeCompare(a.lastSubmittedAt));
  }, [db.requests, filter, search]);

  function go(next: Section) {
    setSection(next); setMobileMenuOpen(false); setSelectedId(null);
  }

  function openDialog(next: DialogState) {
    setDialog(next); setReason(''); setReference(''); setNote(''); setPaymentAcknowledged(false);
  }

  function audit(type: string, detail: string, requestId?: string) {
    return { id: crypto.randomUUID(), at: new Date().toISOString(), actor: ADMIN_NAME, type, detail, requestId };
  }

  function changeRequest(id: string, change: (r: BusinessRequest) => BusinessRequest, type: string, detail: string) {
    const current = db.requests.find(r => r.id === id);
    if (!current) throw new Error('Request not found.');
    const result = change(current);
    setDb(prev => ({ ...prev,
      requests: prev.requests.map(r => r.id === id ? result : r),
      activity: [audit(type, detail, id), ...prev.activity],
    }));
    setToast(detail);
  }

  function changeReport(id: string, decision: 'dismissed' | 'removed', moderationNote: string) {
    const current = db.reports.find(r => r.id === id);
    if (!current) throw new Error('Report not found.');
    const result = moderateReport(current, decision, moderationNote, new Date().toISOString());
    setDb(prev => ({ ...prev,
      reports: prev.reports.map(r => r.id === id ? result : r),
      activity: [audit('report', `Marked review report ${identity(id)} as ${decision}.`), ...prev.activity],
    }));
    setToast(`Demo report ${identity(id)} marked ${decision}.`);
  }

  async function confirmLiveDialog(current: DialogState) {
    if (current.type === 'reset' || current.type === 'moderate') {
      setToast('Demo reset and review moderation are unavailable in live mode.');
      setDialog(null);
      return;
    }
    if (current.type === 'payment' && !paymentAcknowledged) {
      setToast('Confirm that manual payment was verified independently.');
      return;
    }
    setWorking(true);
    try {
      const payload = current.type === 'payment'
        ? { confirmed: true, reference, note }
        : (current.type === 'decline' || current.type === 'suspend')
          ? { reason } : undefined;
      await adminApi.action(current.id, current.type, payload);
      await refreshLive();
      setDialog(null);
      setToast(`Saved ${current.type} action to Spring Boot.`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Admin action failed.');
    } finally { setWorking(false); }
  }

  function confirmDialog() {
    if (!dialog) return;
    if (liveAdminEnabled) { void confirmLiveDialog(dialog); return; }
    try {
      if (dialog.type === 'reset') {
        setDb(resetDemoDatabase()); setSelectedId(null); setToast('Demo data restored to its original sample records.');
      } else if (dialog.type === 'moderate') {
        changeReport(dialog.id, dialog.decision, note);
      } else if (dialog.type === 'payment') {
        if (!paymentAcknowledged) throw new Error('Confirm that payment was verified separately before recording it.');
        changeRequest(dialog.id,
          r => verifyManualPayment(r, { reference, note }, ADMIN_NAME, new Date().toISOString()),
          'payment', `Manual payment verification recorded for ${identity(dialog.id)} (demo only).`);
      } else if (dialog.type === 'revoke') {
        changeRequest(dialog.id, revokePaymentVerification, 'payment', `Manual payment verification cleared for ${identity(dialog.id)}.`);
      } else if (dialog.type === 'approve') {
        changeRequest(dialog.id, r => approveRequest(r, ADMIN_NAME, new Date().toISOString()), 'approve',
          `Approved ${identity(dialog.id)} in the demo portal.`);
      } else if (dialog.type === 'decline') {
        changeRequest(dialog.id, r => declineRequest(r, reason, ADMIN_NAME, new Date().toISOString()), 'decline',
          `Declined ${identity(dialog.id)} and recorded a reason.`);
      } else if (dialog.type === 'suspend') {
        changeRequest(dialog.id, r => suspendBusiness(r, reason), 'suspend',
          `Suspended visibility for ${identity(dialog.id)}.`);
      } else if (dialog.type === 'restore') {
        changeRequest(dialog.id, restoreBusiness, 'restore', `Restored visibility for ${identity(dialog.id)}.`);
      }
      setDialog(null);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Action failed.');
    }
  }

  const openRequest = (id: string) => { setSelectedId(id); setMobileMenuOpen(false); };

  if (liveAdminEnabled && !connected) return <div className="sajha-admin-signin">
    <form className="sajha-admin-login-card" onSubmit={e => void signInLive(e)}>
      <div className="sajha-admin-login-brand">SaJHa <span>ADMIN PORTAL</span></div>
      <h1>Administrator sign in</h1>
      <p>Use an account granted the ADMIN role in your local Spring Boot database.</p>
      <label htmlFor="admin-email">Email</label>
      <input id="admin-email" className="form-control" type="email" autoComplete="username"
        required value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
      <label htmlFor="admin-password">Password</label>
      <input id="admin-password" className="form-control" type="password" autoComplete="current-password"
        required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
      {authError && <p role="alert" className="sajha-admin-login-error">{authError}</p>}
      <button className="btn btn-primary" disabled={working} type="submit">
        {working ? 'Signing in…' : 'Sign in securely'}
      </button>
      <small>Tokens remain in browser memory only. Closing or refreshing this page signs you out.</small>
    </form>
  </div>;

  return <div className="app-shell">
    {mobileMenuOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} />}
    <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-logo"><img src="/sajha-logo.png" alt="" onError={e => { e.currentTarget.style.display = 'none'; }} /><span>S</span></div>
        <div><strong>SaJHa</strong><small>ADMIN PORTAL</small></div></div>
      <div className="side-section-label">WORKSPACE</div>
      <nav aria-label="Admin navigation">
        {navigation.map(item => <button key={item.id} className={`nav-item ${section === item.id ? 'selected' : ''}`} onClick={() => go(item.id)}>
          <Icon name={item.icon} size={19}/><span>{item.label}</span>
          {item.id === 'requests' && pending.length > 0 && <span className="side-count">{pending.length}</span>}
          {item.id === 'reports' && openReports.length > 0 && <span className="side-count">{openReports.length}</span>}
        </button>)}
      </nav>
      <div className="sidebar-bottom"><div className="demo-admin-avatar">{liveAdminEnabled ? 'SA' : 'DA'}</div><div><strong>{liveAdminEnabled ? adminApi.name : 'Demo Administrator'}</strong><small>{liveAdminEnabled ? 'Authenticated admin · Spring Boot' : 'Frontend preview · No login'}</small></div></div>
    </aside>

    <div className="main-column">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button menu-toggle" aria-label="Open menu" onClick={() => setMobileMenuOpen(true)}><Icon name="menu" /></button><div className="breadcrumb">SaJHa <span>/</span> <strong>{titles[section].title}</strong></div></div>
        <div className="topbar-right"><span className="demo-pill"><span/> {liveAdminEnabled ? 'Connected' : 'Demo mode'}</span>{liveAdminEnabled && <button className="btn btn-outline btn-sm" onClick={() => void signOutLive()}>Sign out</button>}<div className="avatar-mini">{liveAdminEnabled ? 'SA' : 'DA'}</div></div>
      </header>
      <main className="page">
        <div className="demo-notice"><Icon name="info" size={19}/><span>{liveAdminEnabled ? <><strong>Connected to Spring Boot.</strong> Business submissions and decisions are stored in MySQL. Manual payment confirmation is an administrative record, not a transaction. Review moderation is not yet connected.</> : <><strong>Local frontend preview.</strong> Data is sample-only and saved in this browser. No Flutter app, backend, payment system, or real administrator is connected.</>}</span></div>
        <div className="page-heading"><div><h1>{titles[section].title}</h1><p>{titles[section].subtitle}</p></div>
          {section === 'dashboard' && <button className="btn btn-primary" onClick={() => go('requests')}><Icon name="requests" size={17}/> Review requests</button>}
        </div>

        {section === 'dashboard' && <>
          <div className="stats-grid">
            <Stat title="Total requests" value={db.requests.length} icon="requests" tone="navy" caption={liveAdminEnabled ? 'Stored requests' : 'All submitted previews'}/>
            <Stat title="Pending review" value={pending.length} icon="clock" tone="orange" caption="Need admin action"/>
            <Stat title="Approved" value={approved.length} icon="check" tone="green" caption={`${published.length} currently visible`}/>
            <Stat title="Open reports" value={openReports.length} icon="flag" tone="purple" caption="Need moderation"/>
          </div>
          <div className="dashboard-grid">
            <section className="panel"><div className="panel-header"><div><h2>Awaiting your review</h2><p>Recent Pending business submissions</p></div><button className="text-button" onClick={() => { setFilter('pending'); go('requests'); }}>See all <Icon name="arrow" size={15}/></button></div>
              {pending.length ? <div className="request-stack">{pending.slice(0, 5).map(r => <button className="queue-row" key={r.id} onClick={() => openRequest(r.id)}><BusinessGlyph name={r.businessName} category={r.category}/><span className="queue-info"><strong>{r.businessName}</strong><small>{r.category} · {formatDate(r.lastSubmittedAt)}</small></span><Badge status={r.status}/><Icon name="chevron" size={18}/></button>)}</div>
                : <EmptyState icon="requests" title="All caught up" description="There are no Pending sample requests."/>}
            </section>
            <section className="panel dashboard-side"><div className="panel-header"><div><h2>Approval pipeline</h2><p>Current request distribution</p></div></div>
              <div className="pipeline-list">{(['pending', 'approved', 'declined'] as ApprovalStatus[]).map(s => <div key={s} className="pipeline-item"><div><span className="pipeline-name">{s.charAt(0).toUpperCase()+s.slice(1)}</span><strong>{count(s)}</strong></div><div className="progress-track"><span className={`progress-fill ${s}`} style={{ width: `${db.requests.length ? count(s)/db.requests.length*100 : 0}%` }}/></div></div>)}</div>
              <div className="small-callout"><Icon name="card" size={20}/><div><strong>Payments stay manual</strong><p>Record confirmation only after contacting the owner and verifying payment outside SaJHa.</p></div></div>
            </section>
          </div>
          <section className="panel"><div className="panel-header"><div><h2>Recent activity</h2><p>{liveAdminEnabled ? 'Backend audit history' : 'Actions recorded in this browser'}</p></div><button className="text-button" onClick={() => go('activity')}>View history <Icon name="arrow" size={15}/></button></div>
            <div className="activity-list">{newestActivity.slice(0, 4).map(a => <ActivityRow key={a.id} event={a}/>)}</div></section>
        </>}

        {section === 'requests' && <section className="panel">
          <div className="panel-header panel-header-responsive"><div><h2>All business submissions</h2><p>Approval requires manually confirmed payment.</p></div><span className="subtle-count">{filteredRequests.length} results</span></div>
          <div className="table-toolbar"><div className="search-input"><Icon name="search" size={18}/><input aria-label="Search business requests" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, owner, phone, category..." /></div><div className="filter-icon"><Icon name="filter" size={18}/><span>Filter</span></div></div>
          <div className="tabs" role="group" aria-label="Request status filter">{(['all', 'pending', 'approved', 'declined'] as const).map(s => <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase()+s.slice(1)} <span>{s === 'all' ? db.requests.length : count(s)}</span></button>)}</div>
          {filteredRequests.length ? <div className="table-scroll"><table><thead><tr><th>Business</th><th>Owner / Contact</th><th>Submitted</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>{filteredRequests.map(r => <tr key={r.id} onClick={() => openRequest(r.id)} className="click-row"><td><div className="business-cell"><BusinessGlyph name={r.businessName} category={r.category}/><div><strong>{r.businessName}</strong><small>{r.category} · {identity(r.id)}</small></div></div></td><td><strong className="cell-normal">{r.ownerName}</strong><small>{r.phone}</small></td><td>{formatDate(r.lastSubmittedAt)}<small>Rev. {r.revision}</small></td><td><span className={`payment-state ${r.payment.confirmed ? 'confirmed' : 'unconfirmed'}`}>{r.payment.confirmed ? 'Confirmed' : 'Not recorded'}</span></td><td><Badge status={r.status} visibility={r.visibility}/></td><td><button className="icon-button" aria-label={`View ${r.businessName}`} onClick={e => { e.stopPropagation(); openRequest(r.id); }}><Icon name="chevron" size={19}/></button></td></tr>)}</tbody></table></div>
            : <EmptyState icon="requests" title="No matches" description="Try another search or status filter."/>}
        </section>}

        {section === 'published' && <section className="panel">
          <div className="panel-header"><div><h2>Approved business listings</h2><p>Permanent publication, subject to moderation.</p></div><span className="subtle-count">{published.length} visible / {approved.length} approved</span></div>
          {approved.length ? <div className="published-grid">{approved.map(r => <div className="published-card" key={r.id}><div className="published-banner">{r.bannerUrl && (!liveAdminEnabled || bannerUrls[r.id]) && <img className="cover-image" src={liveAdminEnabled ? bannerUrls[r.id] : r.bannerUrl} alt="Business banner" />}<BusinessGlyph name={r.businessName} category={r.category}/><Badge status={r.status} visibility={r.visibility}/></div><div className="published-body"><strong>{r.businessName}</strong><p>{r.category}</p><div className="published-meta"><Icon name="pin" size={15}/>{r.onlineOnly ? 'Online only' : r.city || r.address}</div><div className="published-actions"><button className="btn btn-outline btn-sm" onClick={() => openRequest(r.id)}>View details</button>{r.visibility === 'active' ? <button className="btn btn-subtle btn-sm" onClick={() => openDialog({ type: 'suspend', id: r.id })}>Suspend</button> : <button className="btn btn-outline btn-sm" onClick={() => openDialog({ type: 'restore', id: r.id })}>Restore</button>}</div></div></div>)}</div>
            : <EmptyState icon="store" title="No approved businesses" description="Approve a Pending request after recording manual payment verification."/>}
        </section>}

        {section === 'reports' && <section className="panel"><div className="panel-header"><div><h2>Reported reviews</h2><p>Inspect and resolve community-submitted reports.</p></div><span className="subtle-count">{openReports.length} open</span></div>
          {db.reports.length ? <div className="report-list">{[...db.reports].sort((a,b) => a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === 'open' ? -1 : 1).map(r => <div className="report-card" key={r.id}>
            <div className="report-card-top"><div><strong>{r.businessName}</strong><span className="report-id">{identity(r.id)} · {formatDate(r.createdAt)}</span></div><span className={`report-status ${r.status}`}>{r.status === 'open' ? 'Needs review' : r.status === 'dismissed' ? 'Dismissed' : 'Removed (demo)'}</span></div>
            <div className="review-quote"><div className="stars">{'★'.repeat(r.stars)}{'☆'.repeat(5-r.stars)}</div><p>“{r.reviewText}”</p><small>By {r.reviewer}</small></div>
            <div className="report-reason"><Icon name="flag" size={16}/><span>Reported: <strong>{r.reason}</strong></span></div>
            {r.status === 'open' ? <div className="report-actions"><button className="btn btn-outline btn-sm" onClick={() => openDialog({ type: 'moderate', id: r.id, decision: 'dismissed' })}>Dismiss report</button><button className="btn btn-danger btn-sm" onClick={() => openDialog({ type: 'moderate', id: r.id, decision: 'removed' })}>Mark review removed</button></div>
              : <p className="moderator-note">Admin note: {r.moderatorNote || '—'}</p>}
          </div>)}</div> : <EmptyState icon="flag" title="No reports" description="Reported reviews will appear here once backend-connected."/>}
        </section>}

        {section === 'activity' && <section className="panel"><div className="panel-header"><div><h2>Admin activity log</h2><p>Frontend-only audit events; not tamper-proof.</p></div><span className="subtle-count">{db.activity.length} events</span></div><div className="activity-list">{newestActivity.map(a => <ActivityRow key={a.id} event={a}/>)}</div></section>}

        {section === 'settings' && <div className="settings-grid"><section className="panel"><div className="panel-header"><div><h2>Frontend preview settings</h2><p>Data and permissions in this prototype</p></div></div><div className="settings-content"><div className="settings-line"><Icon name="shield"/><div><strong>Demo-only administration</strong><p>No authentication is configured. Never deploy this preview as a real admin portal.</p></div></div><div className="settings-line"><Icon name="card"/><div><strong>No payment processing</strong><p>Verification is a manual checkbox and note. No bank, payment processor or payment API is connected.</p></div></div><div className="settings-line"><Icon name="store"/><div><strong>No public publication</strong><p>Approved records appear only in this browser, not in Flutter or a public business directory.</p></div></div></div></section>
          <section className="panel"><div className="panel-header"><div><h2>Reset sample data</h2><p>Start the demo from scratch.</p></div></div><div className="settings-content"><p className="muted">This clears local preview changes and restores the example business requests, manual payment flags, activity log and reports.</p><button className="btn btn-danger" disabled={liveAdminEnabled} onClick={() => openDialog({ type: 'reset' })}><Icon name="refresh" size={18}/> Reset demo data</button></div></section>
          <section className="panel"><div className="panel-header"><div><h2>Backend integration</h2><p>Required before production deployment</p></div></div><div className="settings-content"><p className="muted">{liveAdminEnabled ? 'Business requests, approval history, and access controls are backed by Spring Boot. Customer review moderation is not connected in this milestone.' : 'Spring Boot must authenticate admins, enforce role checks, store submissions and audit logs, verify object permissions, and publish only approved active businesses.'}</p><p className="muted">API contracts and security requirements are documented in the included <code>API_CONTRACT.md</code>.</p></div></section>
        </div>}
      </main>
      <footer className="footer">{liveAdminEnabled ? 'SaJHa Admin · Spring Boot (local testing)' : 'SaJHa Admin · Local preview only'} <span>Community marketplace · 2026</span></footer>
    </div>

    {selected && <div className="drawer-overlay" onMouseDown={() => setSelectedId(null)} role="presentation"><aside className="detail-drawer" role="dialog" aria-modal="true" aria-label={`${selected.businessName} request details`} onMouseDown={e => e.stopPropagation()}>
      <div className="drawer-header"><div><span className="eyebrow">BUSINESS REQUEST · {identity(selected.id)}</span><h2>{selected.businessName}</h2></div><button className="icon-button" onClick={() => setSelectedId(null)} aria-label="Close request details"><Icon name="close"/></button></div>
      <div className="drawer-scroll">
        <div className="detail-hero">{selected.bannerUrl && (!liveAdminEnabled || bannerUrls[selected.id]) && <img className="cover-image" src={liveAdminEnabled ? bannerUrls[selected.id] : selected.bannerUrl} alt="Submitted business banner" />}<div className="detail-hero-symbol"><Icon name="store" size={38}/></div><Badge status={selected.status} visibility={selected.visibility}/></div>
        <div className="detail-summary"><p>{selected.category}</p><h3>{selected.businessName}</h3><p>{selected.description}</p></div>
        <div className="detail-section"><h4>Contact information</h4><DetailLine icon="user" title="Owner" value={selected.ownerName}/><DetailLine icon="phone" title="Phone" value={selected.phone}/>{selected.ownerEmail && <DetailLine icon="message" title="Email" value={selected.ownerEmail}/>}{selected.website && <DetailLine icon="globe" title="Website" value={selected.website}/>}<div className="contact-actions"><a className="btn btn-outline btn-sm" href={`tel:${phoneHref(selected.phone)}`}><Icon name="phone" size={16}/> Call owner</a><a className="btn btn-outline btn-sm" href={`sms:${phoneHref(selected.phone)}`}><Icon name="message" size={16}/> Send SMS</a></div></div>
        <div className="detail-section"><h4>Location</h4><DetailLine icon="pin" title="Business location" value={selected.onlineOnly ? 'Online-only business' : selected.address || 'Address not supplied'}/>{selected.latitude != null && selected.longitude != null && <a className="text-link" href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=17/${selected.latitude}/${selected.longitude}`} target="_blank" rel="noopener noreferrer">View coordinates on map <Icon name="external" size={14}/></a>}</div>
        <div className="detail-section"><h4>Opening hours</h4><div className="hours-list">{Object.entries(selected.openingHours).map(([day, h]) => <div key={day}><span>{day}</span><strong>{h}</strong></div>)}</div></div>
        <div className="detail-section"><h4>Submission history</h4><DetailLine icon="calendar" title="Submitted" value={formatDateTime(selected.submittedAt)}/><DetailLine icon="refresh" title="Revision" value={String(selected.revision)}/>{selected.reviewedAt && <DetailLine icon="shield" title="Reviewed" value={`${formatDateTime(selected.reviewedAt)} · ${selected.reviewedBy || 'Admin'}`}/>}{selected.declineReason && <div className="reason-panel"><strong>Decline reason</strong><p>{selected.declineReason}</p></div>}{selected.suspensionReason && <div className="reason-panel"><strong>Suspension reason</strong><p>{selected.suspensionReason}</p></div>}</div>
        <div className="detail-section payment-section"><h4>Manual payment record</h4><div className={`payment-confirmation ${selected.payment.confirmed ? 'yes' : 'no'}`}><Icon name={selected.payment.confirmed ? 'check' : 'clock'} size={19}/><div><strong>{selected.payment.confirmed ? (liveAdminEnabled ? 'Verified by admin' : 'Verified by admin (demo)') : 'Not verified'}</strong><p>{selected.payment.confirmed ? `Recorded ${formatDateTime(selected.payment.checkedAt)}` : 'No external payment confirmation has been recorded.'}</p></div></div>{selected.payment.confirmed && <><DetailLine icon="user" title="Verified by" value={selected.payment.verifiedBy || '—'}/>{selected.payment.reference && <DetailLine icon="file" title="Reference" value={selected.payment.reference}/>}{selected.payment.note && <p className="payment-note">{selected.payment.note}</p>}</>}</div>
      </div>
      <div className="drawer-actions">
        {selected.status === 'pending' && <>
          <button className="btn btn-outline" onClick={() => openDialog({ type: selected.payment.confirmed ? 'revoke' : 'payment', id: selected.id })}><Icon name="card" size={17}/>{selected.payment.confirmed ? 'Clear payment verification' : 'Record manual payment'}</button>
          <div className="drawer-action-row"><button className="btn btn-danger" onClick={() => openDialog({ type: 'decline', id: selected.id })}>Decline</button><button className="btn btn-primary" disabled={!canApprove(selected)} title={canApprove(selected) ? '' : 'Record manual payment confirmation first'} onClick={() => openDialog({ type: 'approve', id: selected.id })}><Icon name="check" size={16}/> Approve</button></div>
          {!canApprove(selected) && <p className="drawer-hint"><Icon name="info" size={14}/> Approval unlocks after payment confirmation.</p>}
        </>}
        {selected.status === 'approved' && <button className="btn btn-outline" onClick={() => openDialog({ type: selected.visibility === 'active' ? 'suspend' : 'restore', id: selected.id })}>{selected.visibility === 'active' ? 'Suspend publication' : 'Restore publication'}</button>}
        {selected.status === 'declined' && <p className="drawer-hint">The business owner can correct and resubmit from Flutter after backend integration. Admins cannot approve a declined request directly.</p>}
      </div>
    </aside></div>}

    {dialog && <Modal title={dialogTitle(dialog)} description={dialogDescription(dialog)} onClose={() => setDialog(null)}>
      <div className="modal-body">
        {dialog.type === 'payment' && <><label className="form-label" htmlFor="payment-reference">Optional payment reference</label><input id="payment-reference" className="form-control" maxLength={100} placeholder="e.g., manual invoice reference" value={reference} onChange={e => setReference(e.target.value)} /><label className="form-label" htmlFor="payment-note">Private admin note (optional)</label><textarea id="payment-note" className="form-control" rows={3} maxLength={400} placeholder="No banking details, passwords or card numbers" value={note} onChange={e => setNote(e.target.value)}/><label className="confirm-box"><input type="checkbox" checked={paymentAcknowledged} onChange={e => setPaymentAcknowledged(e.target.checked)}/><span>I personally verified payment outside SaJHa. This is an admin record, not a charge or gateway confirmation.</span></label></>}
        {(dialog.type === 'decline' || dialog.type === 'suspend') && <><label className="form-label" htmlFor="reason">{dialog.type === 'decline' ? 'Reason shown to business owner (required)' : 'Internal suspension reason (required)'}</label><textarea id="reason" className="form-control" rows={4} maxLength={800} value={reason} onChange={e => setReason(e.target.value)} placeholder={dialog.type === 'decline' ? 'Explain what needs correcting...' : 'Why is this business being suspended?'}/><small className="muted">{reason.trim().length} characters</small></>}
        {dialog.type === 'moderate' && <><div className="small-callout"><Icon name="info"/><p>{dialog.decision === 'removed' ? 'This marks the review as removed in the demo report. It does not delete a real Flutter review.' : 'Dismissal closes the demo report without hiding its review.'}</p></div><label className="form-label" htmlFor="moderation-note">Moderation note (required)</label><textarea id="moderation-note" className="form-control" rows={3} maxLength={800} value={note} onChange={e => setNote(e.target.value)} placeholder="Explain your decision..." /></>}
        {(dialog.type === 'approve' || dialog.type === 'revoke' || dialog.type === 'restore' || dialog.type === 'reset') && <div className="small-callout"><Icon name="alert" size={20}/><p>{dialog.type === 'approve' ? liveAdminEnabled ? 'This will approve and publish the business in MySQL.' : 'This will make the example business Approved and active in this browser only.' : dialog.type === 'revoke' ? 'This will clear the manual payment verification for this Pending request.' : dialog.type === 'restore' ? 'This will restore the example business visibility in this browser.' : 'This will discard all changes saved in this browser and restore sample data.'}</p></div>}
      </div>
      <div className="modal-actions"><button className="btn btn-outline" onClick={() => setDialog(null)}>Cancel</button><button className={`btn ${['decline','suspend','reset'].includes(dialog.type) ? 'btn-danger' : 'btn-primary'}`} onClick={confirmDialog} disabled={working || (dialog.type === 'payment' && !paymentAcknowledged)}>{dialogConfirmLabel(dialog)}</button></div>
    </Modal>}

    {toast && <div className="toast" role="status"><Icon name="info" size={17}/>{toast}<button aria-label="Dismiss notification" onClick={() => setToast(null)}><Icon name="close" size={15}/></button></div>}
  </div>;
}

function Stat({ title, value, icon, tone, caption }: { title: string; value: number; icon: Parameters<typeof Icon>[0]['name']; tone: string; caption: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon name={icon} size={23}/></div><p>{title}</p><strong>{value}</strong><small>{caption}</small></div>;
}

function BusinessGlyph({ name, category }: { name: string; category: string }) {
  const abbr = name.replace(/^Demo /,'').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const tone = category.includes('Restaurant') ? 'coral' : category.includes('Grocery') ? 'purple' : category.includes('Education') ? 'blue' : 'navy';
  return <span className={`business-glyph ${tone}`} aria-hidden="true">{abbr}</span>;
}

function ActivityRow({ event }: { event: AdminDatabase['activity'][number] }) {
  return <div className="activity-row"><span className="activity-circle"><Icon name={event.type === 'payment' ? 'card' : event.type === 'approve' ? 'check' : event.type === 'decline' ? 'ban' : event.type === 'report' ? 'flag' : 'activity'} size={17}/></span><div><strong>{event.detail}</strong><small>{event.actor} · {formatDateTime(event.at)}</small></div></div>;
}

function DetailLine({ icon, title, value }: { icon: Parameters<typeof Icon>[0]['name']; title: string; value: string }) {
  return <div className="detail-line"><Icon name={icon} size={17}/><div><small>{title}</small><span>{value}</span></div></div>;
}

function dialogTitle(d: DialogState): string {
  switch (d.type) {
    case 'payment': return 'Record manual payment';
    case 'revoke': return 'Clear payment verification?';
    case 'approve': return 'Approve business request?';
    case 'decline': return 'Decline business request';
    case 'suspend': return 'Suspend business visibility';
    case 'restore': return 'Restore publication?';
    case 'moderate': return d.decision === 'removed' ? 'Mark review removed' : 'Dismiss report';
    case 'reset': return 'Reset all demo changes?';
  }
}
function dialogDescription(d: DialogState): string {
  if (d.type === 'payment') return 'Only record this after independently confirming the off-app payment.';
  if (d.type === 'decline') return 'The reason will be visible to the business owner once backend-connected.';
  if (d.type === 'suspend') return 'Suspension changes visibility; it does not create another approval status.';
  return liveAdminEnabled ? 'This administrative decision will be recorded in MySQL.' : 'This action affects demonstration data in this browser only.';
}
function dialogConfirmLabel(d: DialogState): string {
  switch (d.type) {
    case 'payment': return 'Save verification';
    case 'revoke': return 'Clear verification';
    case 'approve': return 'Approve (demo)';
    case 'decline': return 'Decline request';
    case 'suspend': return 'Suspend business';
    case 'restore': return 'Restore business';
    case 'moderate': return d.decision === 'removed' ? 'Mark removed' : 'Dismiss report';
    case 'reset': return 'Reset demo';
  }
}

export default App;
