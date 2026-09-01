/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { Login } from '@/components/Login';
import { JitForm } from '@/components/JitForm';
import { History } from '@/components/History';
import { CommandFilters } from '@/components/CommandFilters';
import { Approval } from '@/components/Approval';
import { TicketFlows } from '@/components/TicketFlows';
import { LogOut, Filter, CheckCircle, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
}

function AppLayout({
  onLogout,
  userRole,
  user,
}: {
  onLogout: () => void;
  userRole: string | null;
  user: AuthUser | null;
}) {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/create':
        return 'Create JIT Access Request';
      case '/history':
        return 'Request History';
      case '/command-filters':
        return 'Command Filters';
      case '/approval':
        return 'Approvals';
      case '/ticket-flows':
        return 'Ticket Flows';
      default:
        return 'JumpServer Ticketing Portal';
    }
  };

  const getPageDescription = () => {
    switch (location.pathname) {
      case '/create':
        return 'Submit a ticket for temporary privileged access to infrastructure assets.';
      case '/history':
        return 'View and manage your past and current JIT requests.';
      case '/command-filters':
        return 'View and update command filter configurations.';
      case '/approval':
        return 'Review and approve pending access requests.';
      case '/ticket-flows':
        return 'Configure approval workflows for JIT requests.';
      default:
        return '';
    }
  };

  return (
    <div className="h-screen w-full bg-[#F8FAFC] flex flex-col overflow-hidden font-sans antialiased text-slate-900">
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 border-r border-slate-200 bg-white p-6 flex flex-col gap-8 shrink-0 hidden md:flex">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 bg-[#009688] rounded-md flex items-center justify-center shrink-0">
              <div className="w-4 h-4 border-2 border-white rotate-45"></div>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-800">JumpServer <br></br><span className="text-[#009688]">Ticketing Portal</span></span>
          </div>
          
          <div className="flex flex-col gap-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Navigation</h3>
            <nav className="flex flex-col gap-1">
              <NavLink 
                to="/create" 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    isActive ? "bg-[#009688]/10 text-[#009688] translate-x-1" : "text-slate-600 hover:bg-slate-50 hover:translate-x-1"
                  }`
                }
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                New JIT Request
              </NavLink>
              <NavLink 
                to="/history" 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    isActive ? "bg-[#009688]/10 text-[#009688] translate-x-1" : "text-slate-600 hover:bg-slate-50 hover:translate-x-1"
                  }`
                }
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                Request History
              </NavLink>
              {userRole === 'admin' && (
                <>
                  <NavLink 
                    to="/command-filters" 
                    className={({ isActive }) => 
                      `flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        isActive ? "bg-[#009688]/10 text-[#009688] translate-x-1" : "text-slate-600 hover:bg-slate-50 hover:translate-x-1"
                      }`
                    }
                  >
                    <Filter className="w-4 h-4" />
                    Command Filters
                  </NavLink>
                  <NavLink 
                    to="/approval" 
                    className={({ isActive }) => 
                      `flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        isActive ? "bg-[#009688]/10 text-[#009688] translate-x-1" : "text-slate-600 hover:bg-slate-50 hover:translate-x-1"
                      }`
                    }
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approvals
                  </NavLink>
                  <NavLink 
                    to="/ticket-flows" 
                    className={({ isActive }) => 
                      `flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        isActive ? "bg-[#009688]/10 text-[#009688] translate-x-1" : "text-slate-600 hover:bg-slate-50 hover:translate-x-1"
                      }`
                    }
                  >
                    <Workflow className="w-4 h-4" />
                    Ticket Flows
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          <div className="mt-auto -mx-2">
            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 shrink-0 rounded-full bg-[#009688] text-white flex items-center justify-center font-bold shadow-inner text-sm">
                  {user?.username
                    ? user.username.substring(0, 2).toUpperCase()
                    : 'US'}
                </div>
                  
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {user?.username || 'Unknown User'}
                  </span>
                  
                  <span className="text-xs text-slate-500 truncate">
                    {user?.email || '-'}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onLogout} className="text-slate-400 hover:text-slate-900 hover:bg-slate-200 shrink-0 h-8 w-8 ml-2">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-8 bg-slate-50 overflow-y-auto flex flex-col">
          {location.pathname !== '/history' && location.pathname !== '/command-filters' && location.pathname !== '/approval' && location.pathname !== '/ticket-flows' && (
            <div className="flex items-end justify-between mb-6 shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{getPageTitle()}</h2>
                <p className="text-slate-500 text-sm">{getPageDescription()}</p>
              </div>
            </div>
          )}
          
          <Routes>
            <Route path="/create" element={<JitForm />} />
            <Route path="/history" element={<History />} />
            {userRole === 'admin' && (
              <>
                <Route path="/command-filters" element={<CommandFilters />} />
                <Route path="/approval" element={<Approval />} />
                <Route path="/ticket-flows" element={<TicketFlows />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/create" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(
      'jumpserver_token'
    );

    const role = sessionStorage.getItem(
      'jumpserver_role'
    );

    const storedUser = sessionStorage.getItem(
      'jumpserver_user'
    );

    if (token) {
      setIsAuthenticated(true);
      setUserRole(role);

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error(
            'Failed to parse stored user:',
            error
          );

          sessionStorage.removeItem(
            'jumpserver_user'
          );
        }
      }
    }

    setIsChecking(false);

    const handleUnauthorized = () => {
      sessionStorage.removeItem(
        'jumpserver_token'
      );

      sessionStorage.removeItem(
        'jumpserver_role'
      );

      sessionStorage.removeItem(
        'jumpserver_user'
      );

      setIsAuthenticated(false);
      setUserRole(null);
      setUser(null);
    };

    window.addEventListener(
      'auth:unauthorized',
      handleUnauthorized
    );

    return () => {
      window.removeEventListener(
        'auth:unauthorized',
        handleUnauthorized
      );
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);

    setUserRole(
      sessionStorage.getItem('jumpserver_role')
    );

    const storedUser = sessionStorage.getItem(
      'jumpserver_user'
    );

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error(
          'Failed to parse stored user:',
          error
        );
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(
      'jumpserver_token'
    );

    sessionStorage.removeItem(
      'jumpserver_role'
    );

    sessionStorage.removeItem(
      'jumpserver_user'
    );

    setIsAuthenticated(false);
    setUserRole(null);
    setUser(null);
  };

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <BrowserRouter>
      <AppLayout
        onLogout={handleLogout}
        userRole={userRole}
        user={user}
      />
    </BrowserRouter>
  );
}

