import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { Login } from '@/components/Login';
import { JitForm } from '@/components/JitForm';
import { History } from '@/components/History';
import { CommandFilters } from '@/components/CommandFilters';
import { DataMasking } from '@/components/DataMasking';
import { Approval } from '@/components/Approval';
import { TicketFlows } from '@/components/TicketFlows';
import { UserAccessMatrix } from '@/components/UserAccessMatrix';
import { AnimatePresence, motion } from 'motion/react';
import JumpServerLogo from '@/components/JumpServerLogo';
import { AlertTriangle, LogOut, Filter, CheckCircle, Workflow, ShieldCheck, X, ChevronDown, PlusCircle, History as HistoryIcon, Sun, Moon, Menu, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthUser { id: string; username: string; name: string; email: string; }
type Confirmation = { title: string; message: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void; };
function NavItem({ to, icon: Icon, children, sub, onNavigate }: { to: string; icon: LucideIcon; children: React.ReactNode; sub?: boolean; onNavigate?: () => void }) {
  return (
    <NavLink to={to} onClick={onNavigate} className={({ isActive }) => `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'text-brand' : 'text-fg-3 hover:text-fg'}`}>
      {({ isActive }) => (<>
        {isActive && <motion.span layoutId={sub ? 'nav-pill-sub' : 'nav-pill'} transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-lg bg-brand/10 ring-1 ring-brand/20" />}
        {isActive && !sub && <motion.span layoutId="nav-bar" className="absolute -left-4 top-2 bottom-2 w-[3px] rounded-full bg-brand shadow-[0_0_12px_var(--brand)]" />}
        <Icon className="relative h-4 w-4 transition-transform group-hover:scale-110" /><span className="relative">{children}</span>
      </>)}
    </NavLink>
  );
}

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (document.documentElement.dataset.theme as 'dark' | 'light') || 'dark');
  const toggle = () => { const n = theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('theme', n); } catch {} setTheme(n); };
  return { theme, toggle };
}

function AppLayout({ onLogout, userRole, user }: { onLogout: () => void; userRole: string | null; user: AuthUser | null; }) {
  const location = useLocation();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [aclsExpanded, setAclsExpanded] = useState(() => location.pathname === '/command-filters' || location.pathname === '/data-masking');
  const bypassClickConfirmRef = useRef(false);
  const bypassSubmitConfirmRef = useRef(false);
  const canApprove = userRole === 'admin' || userRole === 'approver';
  const routeFallback = userRole === 'approver' ? '/approval' : '/create';
  const titles: Record<string, string> = { '/create': 'Create JIT Access Request', '/history': 'Request History', '/command-filters': 'Command Filters', '/data-masking': 'Data Masking', '/approval': 'Approvals', '/ticket-flows': 'Ticket Flows', '/uam': 'User Access Matrix' };
  const descriptions: Record<string, string> = { '/create': 'Submit a ticket for temporary privileged access to infrastructure assets.', '/history': 'View and manage your past and current JIT requests.', '/command-filters': 'View and update command filter configurations.', '/data-masking': 'View and update data masking configurations.', '/approval': 'Review and approve pending access requests.', '/ticket-flows': 'Configure approval workflows for JIT requests.', '/uam': 'View current user access permissions across JumpServer assets.' };
  const displayName = user?.name?.trim() || user?.username || 'Unknown User';

  const closeConfirmation = () => setConfirmation(null);
  const confirmAction = () => { const action = confirmation?.onConfirm; setConfirmation(null); action?.(); };
  useEffect(() => { if (!confirmation) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeConfirmation(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [confirmation]);

  const handleFormSubmitCapture = (event: React.FormEvent) => {
    if (bypassSubmitConfirmRef.current) { bypassSubmitConfirmRef.current = false; return; }
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const label = submitter?.textContent?.trim().replace(/\s+/g, ' ') || 'Submit';
    event.preventDefault(); event.stopPropagation();
    setConfirmation({ title: label.toLowerCase() === 'submit' ? 'Submit request?' : 'Confirm action', message: label.toLowerCase() === 'submit' ? 'Are you sure you want to submit this request?' : `Are you sure you want to ${label.toLowerCase()}?`, confirmLabel: label.toLowerCase() === 'submit' ? 'Submit request' : label, onConfirm: () => { bypassSubmitConfirmRef.current = true; const form = event.target as HTMLFormElement; submitter ? form.requestSubmit(submitter) : form.requestSubmit(); } });
  };
  const handleActionClickCapture = (event: React.MouseEvent<HTMLElement>) => {
    if (bypassClickConfirmRef.current) { bypassClickConfirmRef.current = false; return; }
    const button = (event.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!button) return;
    const label = button.textContent?.trim().replace(/\s+/g, ' ') || '';
    if (!['Submit', 'Save', 'Update', 'Reset', 'Discard'].includes(label)) return;
    const destructive = ['Reset', 'Discard'].includes(label);
    const isSubmit = button.type === 'submit' || (button.getAttribute('type') === null && !!button.closest('form'));
    event.preventDefault(); event.stopPropagation();
    setConfirmation({ title: destructive ? 'Discard changes?' : `Confirm ${label.toLowerCase()}`, message: destructive ? 'Any unsaved changes will be discarded. This action cannot be undone.' : `Are you sure you want to ${label.toLowerCase()}?`, confirmLabel: destructive ? 'Discard changes' : label, destructive, onConfirm: () => { if (isSubmit) bypassSubmitConfirmRef.current = true; bypassClickConfirmRef.current = true; button.click(); } });
  };

  const { theme, toggle: toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [location.pathname]);
  const aclsActive = location.pathname === '/command-filters' || location.pathname === '/data-masking';
  const showHeader = !['/history','/command-filters','/data-masking','/approval','/ticket-flows','/uam'].includes(location.pathname);

  const sidebar = (
    <div className="flex h-full flex-col gap-8 p-6">
      <div className="flex items-center gap-3">
        <JumpServerLogo className="h-9 w-9 shrink-0 text-brand" />
        
        <span className="text-lg font-semibold tracking-tight whitespace-nowrap">
          JumpServer <span className="text-brand">Ticketing</span>
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="px-3 text-[11px] font-semibold uppercase tracking-widest text-fg-3">Navigation</h3>
        <nav className="flex flex-col gap-1">
          <NavItem to="/create" icon={PlusCircle}>New JIT Request</NavItem>
          <NavItem to="/history" icon={HistoryIcon}>Request History</NavItem>
          {userRole === 'admin' && <>
            <div>
              <button type="button" onClick={() => setAclsExpanded((v) => !v)} aria-expanded={aclsExpanded} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${aclsActive ? 'text-brand' : 'text-fg-3 hover:text-fg'}`}>
                <Filter className="h-4 w-4" /><span className="flex-1 text-left">ACLs</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${aclsExpanded ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {aclsExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="overflow-hidden">
                    <div className="ml-5 mt-1 flex flex-col gap-1 border-l border-line pl-3">
                      <NavItem sub to="/command-filters" icon={Filter}>Command Filters</NavItem>
                      <NavItem sub to="/data-masking" icon={Filter}>Data Masking</NavItem>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <NavItem to="/approval" icon={CheckCircle}>Approvals</NavItem>
            <NavItem to="/ticket-flows" icon={Workflow}>Ticket Flows</NavItem>
            <NavItem to="/uam" icon={ShieldCheck}>User Access Matrix</NavItem>
          </>}
          {userRole === 'approver' && <NavItem to="/approval" icon={CheckCircle}>Approvals</NavItem>}
        </nav>
      </div>
      <div className="mt-auto -mx-2 space-y-1">
        <button type="button" onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-fg-3 transition-colors hover:bg-surface-3 hover:text-fg">
          <AnimatePresence mode="wait" initial={false}><motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</motion.span></AnimatePresence>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/60 p-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-emerald-500 text-sm font-bold text-[#04110f]">{displayName.substring(0, 2).toUpperCase()}</div>
            <div className="flex flex-col overflow-hidden text-left"><span className="truncate text-sm font-semibold text-fg">{displayName}</span><span className="truncate text-xs text-fg-3">{user?.email || '-'}</span></div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setConfirmation({ title: 'Log out?', message: 'You will need to sign in again to access the portal.', confirmLabel: 'Log out', destructive: true, onConfirm: onLogout })} className="h-8 w-8 text-fg-3 hover:text-rose-400"><LogOut className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-bg flex h-screen w-full flex-col overflow-hidden font-sans text-fg antialiased">
      <div className="flex flex-1 overflow-hidden">
        <aside className="glass hidden w-72 shrink-0 border-r border-line md:block">{sidebar}</aside>
        <AnimatePresence>
          {mobileOpen && (<>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }} className="fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-surface md:hidden">{sidebar}</motion.aside>
          </>)}
        </AnimatePresence>
        <main className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-8" onSubmitCapture={handleFormSubmitCapture} onClickCapture={handleActionClickCapture}>
          <button type="button" onClick={() => setMobileOpen(true)} className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg-2 md:hidden"><Menu className="h-4 w-4" /></button>
          <div key={location.pathname} className="page-enter flex flex-1 flex-col">
            {showHeader && <div className="mb-6 flex shrink-0 items-end justify-between"><div><h2 className="text-2xl font-semibold tracking-tight text-fg">{titles[location.pathname] || 'JumpServer Ticketing Portal'}</h2><p className="mt-1 text-sm text-fg-3">{descriptions[location.pathname] || ''}</p></div></div>}
            <Routes>
              <Route path="/create" element={<JitForm />} />
              <Route path="/history" element={<History />} />
              {userRole === 'admin' && <><Route path="/command-filters" element={<CommandFilters />} /><Route path="/data-masking" element={<DataMasking />} /><Route path="/ticket-flows" element={<TicketFlows />} /><Route path="/uam" element={<UserAccessMatrix />} /></>}
              {canApprove && <Route path="/approval" element={<Approval />} />}
              <Route path="*" element={<Navigate to={routeFallback} replace />} />
            </Routes>
          </div>
        </main>
      </div>
      <AnimatePresence>
        {confirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) closeConfirmation(); }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div role="dialog" aria-modal="true" initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} className="relative w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/50">
              <div className={`h-1 ${confirmation.destructive ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-gradient-to-r from-brand to-emerald-400'}`} />
              <div className="p-7">
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${confirmation.destructive ? 'bg-rose-500/10 text-rose-400' : 'bg-brand/10 text-brand'}`}>{confirmation.destructive ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}</div>
                  <div className="flex-1"><h3 className="text-lg font-semibold text-fg">{confirmation.title}</h3><p className="mt-1.5 text-sm leading-6 text-fg-3">{confirmation.message}</p></div>
                  <button type="button" onClick={closeConfirmation} className="rounded-lg p-1.5 text-fg-3 transition-colors hover:bg-surface-3 hover:text-fg"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-7 flex justify-end gap-2">
                  <Button variant="outline" onClick={closeConfirmation}>Cancel</Button>
                  <Button onClick={confirmAction} className={confirmation.destructive ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-brand text-[#04110f] hover:bg-brand-hover'}>{confirmation.confirmLabel}</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => { const token = sessionStorage.getItem('jumpserver_token'); const role = sessionStorage.getItem('jumpserver_role'); const storedUser = sessionStorage.getItem('jumpserver_user'); if (token) { setIsAuthenticated(true); setUserRole(role); if (storedUser) { try { setUser(JSON.parse(storedUser)); } catch { sessionStorage.removeItem('jumpserver_user'); } } } setIsChecking(false); const handleUnauthorized = () => { sessionStorage.removeItem('jumpserver_token'); sessionStorage.removeItem('jumpserver_role'); sessionStorage.removeItem('jumpserver_user'); setIsAuthenticated(false); setUserRole(null); setUser(null); }; window.addEventListener('auth:unauthorized', handleUnauthorized); return () => window.removeEventListener('auth:unauthorized', handleUnauthorized); }, []);
  const handleLoginSuccess = () => { setIsAuthenticated(true); setUserRole(sessionStorage.getItem('jumpserver_role')); const storedUser = sessionStorage.getItem('jumpserver_user'); if (storedUser) { try { setUser(JSON.parse(storedUser)); } catch {} } };
  const handleLogout = async () => { try { await fetch('/portal-api/logout', { method: 'GET', credentials: 'include' }); } catch {} finally { sessionStorage.removeItem('jumpserver_token'); sessionStorage.removeItem('jumpserver_role'); sessionStorage.removeItem('jumpserver_user'); setIsAuthenticated(false); setUserRole(null); setUser(null); } };
  if (isChecking) return <div className="min-h-screen flex items-center justify-center bg-surface-2">Loading...</div>;
  if (!isAuthenticated) return <Login onLoginSuccess={handleLoginSuccess} />;
  return <BrowserRouter><AppLayout onLogout={handleLogout} userRole={userRole} user={user} /></BrowserRouter>;
}