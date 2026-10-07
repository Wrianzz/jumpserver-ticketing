import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { IsoScene } from '@/components/IsoScene';
import { Eye, EyeOff, Loader2, ArrowLeft, User, Lock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import JumpServerLogo from '@/components/JumpServerLogo';
import apiClient from '@/lib/axios';

interface LoginProps { onLoginSuccess: () => void; }
interface JumpServerAuthUser { id: string; username: string; name?: string; email?: string; is_superuser?: boolean; is_org_admin?: boolean; }

function authDebug(label: string, details: Record<string, unknown> = {}) {
  console.groupCollapsed(`[Ticketing Auth Debug] ${label}`);
  console.log({ timestamp: new Date().toISOString(), ...details });
  console.groupEnd();
}

function extractAuthData(data: any) {
  const authData = Array.isArray(data) ? data[0] : data;
  return { token: authData?.token || authData?.data?.token, user: authData?.user || authData?.data?.user };
}

async function resolvePortalAccess(): Promise<'admin' | 'approver' | 'user'> {
  authDebug('portal access: request', { tokenPresent: !!sessionStorage.getItem('jumpserver_token'), storedUserPresent: !!sessionStorage.getItem('jumpserver_user') });
  try {
    const response = await apiClient.get('/portal-api/access');
    authDebug('portal access: success', { status: response.status, role: response.data?.role, userIdPresent: !!response.data?.user?.id });
    const role = response.data?.role;
    if (role === 'admin' || role === 'approver' || role === 'user') return role;
    throw new Error('Portal access endpoint returned an invalid role.');
  } catch (error: any) {
    authDebug('portal access: error', { status: error.response?.status, message: error.response?.data?.message, upstreamStatus: error.response?.data?.upstreamStatus, detailCode: error.response?.data?.details?.code, detailMessage: error.response?.data?.details?.detail });
    throw error;
  }
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const authenticate = async () => {
    authDebug('auth request', { username });
    try {
      const response = await apiClient.post('/portal-api/auth/login', { username, password });
      authDebug('auth response', { status: response.status, hasToken: !!extractAuthData(response.data).token, tokenLength: extractAuthData(response.data).token?.length, hasUser: !!extractAuthData(response.data).user, responseError: response.data?.error, responseMsg: response.data?.msg });
      return response;
    } catch (error: any) {
      authDebug('auth error', { status: error.response?.status, responseError: error.response?.data?.error, responseMsg: error.response?.data?.msg, responseDetail: error.response?.data?.detail });
      throw error;
    }
  };

  const completeLogin = async (token: string | undefined, user: JumpServerAuthUser | undefined) => {
    authDebug('complete login', { hasToken: !!token, tokenLength: token?.length, userId: user?.id, username: user?.username, isSuperuser: user?.is_superuser, isOrgAdmin: user?.is_org_admin });
    if (!token || !user) { setError('Login failed: Invalid response from JumpServer.'); return false; }

    sessionStorage.setItem('jumpserver_token', token);
    sessionStorage.setItem('jumpserver_user', JSON.stringify({
      id: user.id, username: user.username, name: user.name, email: user.email,
      is_superuser: user.is_superuser, is_org_admin: user.is_org_admin,
    }));

    try {
      const role = await resolvePortalAccess();
      sessionStorage.setItem('jumpserver_role', role);
      onLoginSuccess();
      return true;
    } catch (error: any) {
      sessionStorage.removeItem('jumpserver_token');
      sessionStorage.removeItem('jumpserver_user');
      sessionStorage.removeItem('jumpserver_role');
      console.error('Portal access resolution error:', error);
      setError(error.response?.data?.message || error.response?.data?.detail || error.message || 'Gagal menentukan role portal. Pastikan backend portal dan JUMPSERVER_SERVICE_TOKEN sudah dikonfigurasi.');
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await authenticate();
      if (response.data?.error === 'mfa_required') { authDebug('MFA required', { username }); setMfaRequired(true); setOtp(''); return; }
      const { token, user } = extractAuthData(response.data);
      await completeLogin(token, user);
    } catch (error: any) {
      console.error('Login Error:', error);
      if (error.response?.status === 401) setError('Username atau password salah!');
      else setError(error.response?.data?.detail || error.response?.data?.msg || 'Gagal terhubung ke server JumpServer.');
    } finally { setLoading(false); }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!/^\d{6}$/.test(otp)) { setError('Masukkan kode OTP 6 digit.'); return; }
    setLoading(true);
    try {
      authDebug('MFA challenge request', { username, otpLength: otp.length, preExistingToken: !!sessionStorage.getItem('jumpserver_token') });
      const mfaResponse = await apiClient.post('/portal-api/auth/mfa/challenge', { type: 'otp', code: otp });
      authDebug('MFA challenge response', { status: mfaResponse.status, responseError: mfaResponse.data?.error, responseMsg: mfaResponse.data?.msg });
      const authResponse = await authenticate();
      const { token, user } = extractAuthData(authResponse.data);
      authDebug('post-MFA auth extracted', { status: authResponse.status, hasToken: !!token, tokenLength: token?.length, userId: user?.id, username: user?.username, responseError: authResponse.data?.error, responseMsg: authResponse.data?.msg });
      if (authResponse.data?.error === 'mfa_required') { setError('MFA sudah diverifikasi, tetapi sesi autentikasi belum selesai. Silakan coba lagi.'); return; }
      await completeLogin(token, user);
    } catch (error: any) {
      console.error('MFA Verification Error:', error);
      authDebug('MFA flow error', { status: error.response?.status, responseError: error.response?.data?.error, responseMsg: error.response?.data?.msg, responseDetail: error.response?.data?.detail, detailCode: error.response?.data?.code, detailMessage: error.response?.data?.message });
      const responseData = error.response?.data;
      if (error.response?.status === 401) setError('Kode OTP salah atau sesi MFA sudah tidak berlaku.');
      else setError(responseData?.detail || responseData?.msg || responseData?.error || 'Gagal memverifikasi MFA.');
    } finally { setLoading(false); }
  };

  const handleBackToLogin = () => { setMfaRequired(false); setOtp(''); setError(''); };

  const inputCls = "h-11 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-3 text-sm text-fg placeholder:text-fg-3 outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/15";
  const [showPw, setShowPw] = useState(false);
  const terminal = [
    { c: '$ sudo rm -rf file.exe', d: 0.4 },
    { c: '→ High-risk command detected, requesting approval', d: 1.5, m: true },
    { c: '→ approved by security-team', d: 2.6, m: true },
    { c: '✓ access granted', d: 3.7, ok: true },
  ];

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.1fr_1fr] bg-background font-sans antialiased text-fg">
      {/* ---------- Left: brand panel ---------- */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 app-bg border-r border-line">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute -top-24 -left-20 h-96 w-96 rounded-full bg-brand/25 blur-[110px] animate-float" />
        <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-[120px] animate-float-slow" />
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative flex items-center gap-3">
          <div className="flex items-center gap-3">
            <JumpServerLogo className="h-9 w-9 shrink-0 text-brand" />
            
            <span className="text-lg font-semibold tracking-tight whitespace-nowrap">
              JumpServer <span className="text-brand">Ticketing</span>
            </span>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="relative my-6 flex min-h-0 flex-1 items-center justify-center">
          <IsoScene />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }} className="relative glass rounded-2xl border border-line p-5 font-mono text-[13px] shadow-2xl">
          <div className="mb-3 flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><i className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /></div>
          <div className="space-y-1.5">
            {terminal.map((l) => <p key={l.c} className={`term-line ${l.ok ? 'text-emerald-400' : l.m ? 'text-fg-3' : 'text-fg-2'}`} style={{ animationDelay: `${l.d}s` }}>{l.c}</p>)}
            <p className="text-brand">$ <span className="caret">▍</span></p>
          </div>
        </motion.div>
      </aside>

      {/* ---------- Right: form ---------- */}
      <main className="relative flex items-center justify-center p-6 sm:p-12 app-bg lg:bg-none lg:bg-background">
        <div className="absolute inset-0 grid-bg opacity-30 lg:hidden" />
        <div className="relative w-full max-w-[400px]">
          <div className="lg:hidden mb-8 flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-brand flex items-center justify-center"><div className="h-3.5 w-3.5 rotate-45 border-2 border-white" /></div><span className="font-semibold">JumpServer <span className="text-brand">Ticketing</span></span></div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={mfaRequired ? 'mfa' : 'login'} initial={{ opacity: 0, x: mfaRequired ? 30 : -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: mfaRequired ? -30 : 30 }} transition={{ duration: 0.28, ease: 'easeOut' }}>
              <h2 className="text-3xl font-semibold tracking-tight">{mfaRequired ? 'Verifikasi MFA' : 'Selamat datang'}</h2>
              <p className="mt-2 text-sm text-fg-3">{mfaRequired ? 'Masukkan 6 digit kode dari aplikasi authenticator kamu.' : 'Masuk dengan akun JumpServer kamu.'}</p>

              {mfaRequired ? (
                <form onSubmit={handleMfaVerify} className="mt-8 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-xs font-medium text-fg-2">Authentication code</Label>
                    <input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6} autoFocus required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="h-14 w-full rounded-xl border border-line bg-surface-2 text-center text-2xl font-semibold tracking-[0.5em] text-fg outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/15" />
                  </div>
                  <ErrorBox error={error} />
                  <SubmitBtn loading={loading} disabled={loading || otp.length !== 6} label="Verify & Sign In" loadingLabel="Verifying..." />
                  <button type="button" onClick={handleBackToLogin} disabled={loading} className="flex w-full items-center justify-center gap-2 text-sm text-fg-3 transition-colors hover:text-fg disabled:opacity-50"><ArrowLeft className="h-4 w-4" />Kembali ke login</button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="mt-8 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-medium text-fg-2">Username</Label>
                    <div className="relative"><User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" /><input id="username" type="text" placeholder="Enter your username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-medium text-fg-2">Password</Label>
                    <div className="relative"><Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3" /><input id="password" type={showPw ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-10`} /><button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-3 transition-colors hover:text-fg">{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  </div>
                  <ErrorBox error={error} />
                  <SubmitBtn loading={loading} disabled={loading} label="Sign In" loadingLabel="Authenticating..." />
                </form>
              )}
            </motion.div>
          </AnimatePresence>
          <p className="mt-10 text-center text-xs text-fg-3">Gunakan kredensial JumpServer. Aktivitas kamu tercatat.</p>
        </div>
      </main>
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div initial={{ opacity: 0, height: 0, x: 0 }} animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -4, 4, 0] }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4 }} className="overflow-hidden">
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-400"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SubmitBtn({ loading, disabled, label, loadingLabel }: { loading: boolean; disabled: boolean; label: string; loadingLabel: string }) {
  return (
    <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={disabled} className="btn-shine relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-brand to-emerald-500 text-sm font-semibold text-[#04110f] shadow-lg shadow-brand/25 transition-all hover:shadow-brand/40 disabled:pointer-events-none disabled:opacity-60">
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? loadingLabel : label}
    </motion.button>
  );
}
