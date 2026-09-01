import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiClient from '@/lib/axios';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('dummy_admin');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    setLoading(true);
    
    try {
      const response = await apiClient.post(
        '/api/v1/authentication/auth/',
        {
          username,
          password,
        }
      );

      const authData = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

      const token = authData?.token;
      const user = authData?.user;

      if (!token || !user) {
        setError('Login failed: Invalid response from JumpServer.');
        return;
      }

      const role =
        user.is_superuser === true ||
        user.is_org_admin === true
          ? 'admin'
          : 'user';

      sessionStorage.setItem(
        'jumpserver_token',
        token
      );

      sessionStorage.setItem(
        'jumpserver_role',
        role
      );

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

    } catch (error: any) {
      console.error('Login Error:', error);

      if (error.response?.status === 401) {
        setError('Username atau password salah!');
      } else {
        setError('Gagal terhubung ke server JumpServer.');
      }
    } finally {
      setLoading(false);
    }
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
            Sign in with your JumpServer credentials
          </CardDescription>
        </CardHeader>
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
      </Card>
    </div>
  );
}
