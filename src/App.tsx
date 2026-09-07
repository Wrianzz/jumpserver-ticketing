import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { Login } from '@/components/Login';
import { JitForm } from '@/components/JitForm';
import { History } from '@/components/History';
import { CommandFilters } from '@/components/CommandFilters';
import { Approval } from '@/components/Approval';
import { TicketFlows } from '@/components/TicketFlows';
import { AlertTriangle, LogOut, Filter, CheckCircle, Workflow, X, PlusCircle, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthUser { id: string; username: string; name: string; email: string; }
type Confirmation = { title: string; message: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void; };
const navClass = ({ isActive }: { isActive: boolean }) => `flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 cursor-pointer active:scale-[0.98] ${isActive ? 'bg-[#009688]/10 text-[#009688] translate-x-1' : 'text-slate-600 hover:bg-slate-50 hover:translate-x-1'}`;

function AppLayout({ onLogout, userRole, user }: { onLogout: () => void; userRole: string | null; user: AuthUser | null; }) {
  const location = useLocation();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const bypassClickConfirmRef = useRef(false);
  const bypassSubmitConfirmRef = useRef(false);
  const canApprove = userRole === 'admin' || userRole === 'approver';
  const routeFallback = userRole === 'approver' ? '/approval' : '/create';
  const titles: Record<string, string> = { '/create': 'Create JIT Access Request', '/history': 'Request History', '/command-filters': 'Command Filters', '/approval': 'Approvals', '/ticket-flows': 'Ticket Flows' };
  const descriptions: Record<string, string> = { '/create': 'Submit a ticket for temporary privileged access to infrastructure assets.', '/history': 'View and manage your past and current JIT requests.', '/command-filters': 'View and update command filter configurations.', '/approval': 'Review and approve pending access requests.', '/ticket-flows': 'Configure approval workflows for JIT requests.' };
  const displayName = user?.name?.trim() || user?.username || 'Unknown User';

  useEffect(() => { if (!confirmation) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmation(null); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [confirmation]);

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

  return <div className="h-screen w-full bg-[#F8FAFC] flex flex-col overflow-hidden font-sans antialiased text-slate-900"><div className="flex-1 flex overflow-hidden">
    <aside className="w-72 border-r border-slate-200 bg-white p-6 flex flex-col gap-8 shrink-0 hidden md:flex">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-100"><div className="w-8 h-8 bg-[#009688] rounded-md flex items-center justify-center shrink-0"><div className="w-4 h-4 border-2 border-white rotate-45" /></div><span className="text-lg font-bold tracking-tight text-slate-800">JumpServer <br /><span className="text-[#009688]">Ticketing Portal</span></span></div>
      <div className="flex flex-col gap-4"><h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Navigation</h3><nav className="flex flex-col gap-1">
        {userRole !== 'approver' && <><NavLink to="/create" className={navClass}><PlusCircle className="w-4 h-4" />New JIT Request</NavLink><NavLink to="/history" className={navClass}><ClipboardList className="w-4 h-4" />Request History</NavLink></>}
        {userRole === 'admin' && <><NavLink to="/command-filters" className={navClass}><Filter className="w-4 h-4" />Command Filters</NavLink><NavLink to="/approval" className={navClass}><CheckCircle className="w-4 h-4" />Approvals</NavLink><NavLink to="/ticket-flows" className={navClass}><Workflow className="w-4 h-4" />Ticket Flows</NavLink></>}
        {userRole === 'approver' && <NavLink to="/approval" className={navClass}><CheckCircle className="w-4 h-4" />Approvals</NavLink>}
      </nav></div>
      <div className="mt-auto -mx-2"><div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50"><div className="flex items-center gap-3 overflow-hidden"><div className="w-10 h-10 shrink-0 rounded-full bg-[#009688] text-white flex items-center justify-center font-bold text-sm">{displayName.substring(0, 2).toUpperCase()}</div><div className="flex flex-col overflow-hidden text-left"><span className="text-sm font-semibold text-slate-900 truncate">{displayName}</span><span className="text-xs text-slate-500 truncate">{user?.email || '-'}</span></div></div><Button variant="ghost" size="icon" onClick={() => setConfirmation({ title: 'Log out?', message: 'You will need to sign in again to access the portal.', confirmLabel: 'Log out', destructive: true, onConfirm: onLogout })} className="text-slate-400 hover:text-slate-900 h-8 w-8"><LogOut className="h-4 w-4" /></Button></div></div>
    </aside>
    <main className="flex-1 p-4 sm:p-8 bg-slate-50 overflow-y-auto flex flex-col" onSubmitCapture={handleFormSubmitCapture} onClickCapture={handleActionClickCapture}>
      {!['/history','/command-filters','/approval','/ticket-flows'].includes(location.pathname) && <div className="flex items-end justify-between mb-6 shrink-0"><div><h2 className="text-2xl font-bold text-slate-900">{titles[location.pathname] || 'JumpServer Ticketing Portal'}</h2><p className="text-slate-500 text-sm">{descriptions[location.pathname] || ''}</p></div></div>}
      <Routes>
        {userRole !== 'approver' && <><Route path="/create" element={<JitForm />} /><Route path="/history" element={<History />} /></>}
        {userRole === 'admin' && <><Route path="/command-filters" element={<CommandFilters />} /><Route path="/ticket-flows" element={<TicketFlows />} /></>}
        {canApprove && <Route path="/approval" element={<Approval />} />}
        <Route path="*" element={<Navigate to={routeFallback} replace />} />
      </Routes>
    </main>
  </div>{confirmation && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmation(null); }}><div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[3px]" /><div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="h-1.5 bg-[#009688]" /><div className="p-7"><div className="flex items-start gap-4"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${confirmation.destructive ? 'bg-rose-50 text-rose-600' : 'bg-[#009688]/10 text-[#009688]'}`}>{confirmation.destructive ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}</div><div className="flex-1"><h3 className="text-lg font-semibold text-slate-900">{confirmation.title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500">{confirmation.message}</p></div><button type="button" onClick={() => setConfirmation(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="mt-7 flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmation(null)}>Cancel</Button><Button onClick={() => { const action = confirmation.onConfirm; setConfirmation(null); action(); }} className={confirmation.destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#009688] hover:bg-[#007f73]'}>{confirmation.confirmLabel}</Button></div></div></div></div>}</div>;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    const token = sessionStorage.getItem('jumpserver_token'); const role = sessionStorage.getItem('jumpserver_role'); const storedUser = sessionStorage.getItem('jumpserver_user');
    if (token) { setIsAuthenticated(true); setUserRole(role); if (storedUser) { try { setUser(JSON.parse(storedUser)); } catch { sessionStorage.removeItem('jumpserver_user'); } } }
    setIsChecking(false);
    const handleUnauthorized = () => { sessionStorage.removeItem('jumpserver_token'); sessionStorage.removeItem('jumpserver_role'); sessionStorage.removeItem('jumpserver_user'); setIsAuthenticated(false); setUserRole(null); setUser(null); };
    window.addEventListener('auth:unauthorized', handleUnauthorized); return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);
  const handleLoginSuccess = () => { setIsAuthenticated(true); setUserRole(sessionStorage.getItem('jumpserver_role')); const storedUser = sessionStorage.getItem('jumpserver_user'); if (storedUser) { try { setUser(JSON.parse(storedUser)); } catch {} } };
  const handleLogout = async () => { try { await fetch('/portal-api/logout', { method: 'GET', credentials: 'include' }); } catch {} finally { sessionStorage.removeItem('jumpserver_token'); sessionStorage.removeItem('jumpserver_role'); sessionStorage.removeItem('jumpserver_user'); setIsAuthenticated(false); setUserRole(null); setUser(null); } };
  if (isChecking) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  if (!isAuthenticated) return <Login onLoginSuccess={handleLoginSuccess} />;
  return <BrowserRouter><AppLayout onLogout={handleLogout} userRole={userRole} user={user} /></BrowserRouter>;
}
