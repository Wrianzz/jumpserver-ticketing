import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiClient from '@/lib/axios';

interface LoginProps {
  onLoginSuccess: () => void;
}

interface JumpServerAuthUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  is_superuser?: boolean;
  is_org_admin?: boolean;
}

function extractAuthData(data: any) {
  const authData = Array.isArray(data) ? data[0] : data;
  return {
    token: authData?.token || authData?.data?.token,
    user: authData?.user || authData?.data?.user,
  };
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('dummy_admin');
  const [password, setPassword] = useState('password123');
  const [otp, setOtp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const authenticate = () =>
    apiClient.post('/api/v1/authentication/auth/', {
      username,
      password,
    });

  const completeLogin = (token: string | undefined, user: JumpServerAuthUser | undefined) => {
    if (!token || !user) {
      setError('Login failed: Invalid response from JumpServer.');
      return false;
    }

    const role =
      user.is_superuser === true ||
      user.is_org_admin === true
        ? 'admin'
        : 'user';

    sessionStorage.setItem('jumpserver_token', token);
    sessionStorage.setItem('jumpserver_role', role);
    sessionStorage.setItem(
      'jumpserver_user',
      JSON.stringify({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        is_superuser: user.is_superuser,
        is_org_admin: user.is_org_admin,
      })
    );

    onLoginSuccess();
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await authenticate();

      if (response.data?.error === 'mfa_required') {
        setMfaRequired(true);
        setOtp('');
        return;
      }

      const { token, user } = extractAuthData(response.data);
      completeLogin(token, user);
    } catch (error: any) {
      console.error('Login Error:', error);

      if (error.response?.status === 401) {
        setError('Username atau password salah!');
      } else {
        setError(
          error.response?.data?.detail ||
          error.response?.data?.msg ||
          'Gagal terhubung ke server JumpServer.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Masukkan kode OTP 6 digit.');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post(
        '/api/v1/authentication/mfa/challenge/',
        {
          type: 'otp',
          code: otp,
        }
      );

      // JumpServer returns "ok" after a valid MFA challenge. The MFA state is
      // stored in the same server-side session, so authenticate again to obtain
      // the API token and user object.
      const authResponse = await authenticate();

      if (authResponse.data?.error === 'mfa_required') {
        setError('MFA sudah diverifikasi, tetapi sesi autentikasi belum selesai. Silakan coba lagi.');
        return;
      }

      const { token, user } = extractAuthData(authResponse.data);
      completeLogin(token, user);
    } catch (error: any) {
      console.error('MFA Verification Error:', error);

      const responseData = error.response?.data;

      if (error.response?.status === 401) {
        setError('Kode OTP salah atau sesi MFA sudah tidak berlaku.');
      } else {
        setError(
          responseData?.detail ||
          responseData?.msg ||
          responseData?.error ||
          'Gagal memverifikasi MFA.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setMfaRequired(false);
    setOtp('');
    setError('');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC] font-sans antialiased">
      <Card className="w-[400px] shadow-sm border border-slate-200 bg-white rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 text-center pt-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-[#009688] rounded-xl flex items-center justify-center shadow-inner">
              <div className="w-5 h-5 border-2 border-white rotate-45"></div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            JumpServer <span className="text-[#009688]">Ticketing Portal</span>
          </CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            {mfaRequired
              ? 'Verify your identity with your authenticator'
              : 'Sign in with your JumpServer credentials'}
          </CardDescription>
        </CardHeader>

        {mfaRequired ? (
          <form onSubmit={handleMfaVerify} className="pb-4">
            <CardContent className="space-y-5 px-8 pt-4">
              <div className="rounded-lg border border-teal-100 bg-teal-50 p-4 text-center">
                <p className="text-sm font-semibold text-slate-800">MFA verification required</p>
                <p className="mt-1 text-xs text-slate-500">
                  Enter the 6-digit OTP from your authenticator app.
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="otp" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Authentication Code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  className="w-full border-slate-200 rounded-lg px-4 py-3 text-center text-lg tracking-[0.4em] font-semibold focus-visible:ring-2 focus-visible:ring-[#009688]/20 focus-visible:border-[#009688] outline-none shadow-none"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  required
                />
              </div>

              {error && (
                <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md border border-red-100">
                  {error}
                </div>
              )}
            </CardContent>

            <CardFooter className="px-8 pb-8 pt-4 flex-col gap-3">
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#009688] text-white hover:bg-[#00796B] shadow-lg shadow-[#009688]/20 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button
                type="button"
                onClick={handleBackToLogin}
                disabled={loading}
                className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
              >
                Back to Sign In
              </button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="pb-4">
            <CardContent className="space-y-5 px-8 pt-4">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="username" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  className="w-full border-slate-200 rounded-lg px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#009688]/20 focus-visible:border-[#009688] outline-none shadow-none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 text-left">
                <Label htmlFor="password" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="w-full border-slate-200 rounded-lg px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#009688]/20 focus-visible:border-[#009688] outline-none shadow-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md border border-red-100">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter className="px-8 pb-8 pt-4">
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#009688] text-white hover:bg-[#00796B] shadow-lg shadow-[#009688]/20 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
