import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Receipt,
  CalendarCheck,
  Settings,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  RefreshCw,
  LogOut,
  Sparkles,
  Search,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { AdminStats, KycApplicant, PaymentSlipItem, BookingRecord, SystemSettings } from './types';

export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('admin_token') || '');
  const [phone, setPhone] = useState('02099999999');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'kyc' | 'slips' | 'bookings' | 'settings'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingKyc, setPendingKyc] = useState<KycApplicant[]>([]);
  const [pendingSlips, setPendingSlips] = useState<PaymentSlipItem[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({});
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Rejection modal
  const [rejectModal, setRejectModal] = useState<{
    type: 'kyc' | 'slip';
    id: string;
    targetName: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Selected image zoom modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Settings form state
  const [feePercent, setFeePercent] = useState('15');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error('Session expired');
    }
    return res.json();
  };

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsData, kycData, slipsData, bookingsData, settingsData] = await Promise.all([
        fetchWithAuth('/api/admin/stats'),
        fetchWithAuth('/api/admin/kyc/pending'),
        fetchWithAuth('/api/admin/slips/pending'),
        fetchWithAuth('/api/admin/bookings'),
        fetchWithAuth('/api/admin/settings'),
      ]);

      setStats(statsData);
      setPendingKyc(kycData.pending || []);
      setPendingSlips(slipsData.pendingSlips || []);
      setBookings(bookingsData.bookings || []);
      if (settingsData.settings) {
        setSettings(settingsData.settings);
        setFeePercent(settingsData.settings.PLATFORM_FEE_PERCENT || '15');
        setBankName(settingsData.settings.COMPANY_BANK_NAME || '');
        setAccountNumber(settingsData.settings.COMPANY_BANK_ACCOUNT || '');
        setAccountName(settingsData.settings.COMPANY_ACCOUNT_NAME || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.user.role !== 'ADMIN') {
        throw new Error('Access denied. Administrator privileges required.');
      }
      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
    } catch (err: any) {
      setLoginError(err.message || 'Login error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
  };

  const handleKycReview = async (companionId: string, action: 'APPROVE' | 'REJECT', note?: string) => {
    try {
      await fetchWithAuth(`/api/admin/kyc/${companionId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, note }),
      });
      setActionSuccess(`KYC ${action.toLowerCase()}d successfully`);
      setTimeout(() => setActionSuccess(null), 3000);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSlipReview = async (slipId: string, action: 'APPROVE' | 'REJECT', note?: string) => {
    try {
      await fetchWithAuth(`/api/admin/slips/${slipId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, adminNote: note }),
      });
      setActionSuccess(`Payment slip ${action.toLowerCase()}d. Booking escrow updated!`);
      setTimeout(() => setActionSuccess(null), 3000);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all([
        fetchWithAuth('/api/admin/settings', {
          method: 'POST',
          body: JSON.stringify({ key: 'PLATFORM_FEE_PERCENT', value: feePercent }),
        }),
        fetchWithAuth('/api/admin/settings', {
          method: 'POST',
          body: JSON.stringify({ key: 'COMPANY_BANK_NAME', value: bankName }),
        }),
        fetchWithAuth('/api/admin/settings', {
          method: 'POST',
          body: JSON.stringify({ key: 'COMPANY_BANK_ACCOUNT', value: accountNumber }),
        }),
        fetchWithAuth('/api/admin/settings', {
          method: 'POST',
          body: JSON.stringify({ key: 'COMPANY_ACCOUNT_NAME', value: accountName }),
        }),
      ]);
      setActionSuccess('System settings updated successfully!');
      setTimeout(() => setActionSuccess(null), 3000);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // If not logged in, show Admin Login Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Admin & Manager Web</h1>
              <p className="text-xs text-slate-400">Companion & Social Booking Platform</p>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number (Admin)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                placeholder="02099999999"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-rose-600/25 transition-all text-sm"
            >
              Sign In to Management Portal
            </button>
          </form>

          <div className="mt-6 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">Default Demo Credentials:</p>
            <p>Admin: <span className="text-rose-400 font-mono">02099999999</span> / <span className="text-rose-400 font-mono">admin123</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500/90 backdrop-blur border border-emerald-400/40 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-600/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">COMPANION BACKOFFICE</h2>
            <p className="text-[11px] text-slate-400">Admin & Operations</p>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('kyc')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'kyc'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4" />
              <span>KYC Verification</span>
            </div>
            {pendingKyc.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full font-bold">
                {pendingKyc.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('slips')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'slips'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Receipt className="w-4 h-4" />
              <span>Payment Slips</span>
            </div>
            {pendingSlips.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-full font-bold">
                {pendingSlips.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'bookings'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Bookings & Escrow</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings & Rules</span>
          </button>
        </nav>

        {/* User profile / Logout */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-rose-400">
              AD
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Admin User</p>
              <p className="text-[10px] text-slate-400">02099999999</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/40 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white capitalize">
              {activeTab === 'dashboard' && 'Operations Dashboard'}
              {activeTab === 'kyc' && 'Companion KYC Approval Queue'}
              {activeTab === 'slips' && 'Bank Transfer Slip Verification'}
              {activeTab === 'bookings' && 'Bookings & Escrow Management'}
              {activeTab === 'settings' && 'Platform Settings & Anti-Leak Rules'}
            </h1>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </header>

        <div className="p-6 flex-1 space-y-6">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Booking Volume</p>
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-2">
                    {stats.totalGrossVolume.toLocaleString()} <span className="text-xs font-normal text-slate-400">LAK</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Platform Revenue: {stats.totalRevenue.toLocaleString()} LAK</p>
                </div>

                <div
                  onClick={() => setActiveTab('slips')}
                  className="p-5 bg-slate-900 border border-slate-800 hover:border-rose-500/40 rounded-2xl cursor-pointer transition-all relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Bank Slips</p>
                    <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 group-hover:scale-110 transition-transform">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-2 flex items-center gap-2">
                    {stats.pendingSlipCount}
                    {stats.pendingSlipCount > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded-full font-normal">
                        Action Required
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Awaiting bank transfer verification</p>
                </div>

                <div
                  onClick={() => setActiveTab('kyc')}
                  className="p-5 bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl cursor-pointer transition-all relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending KYC</p>
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-2 flex items-center gap-2">
                    {stats.pendingKycCount}
                    {stats.pendingKycCount > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-normal">
                        Needs Review
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Companions awaiting ID & selfie check</p>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Bookings</p>
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-2">
                    {stats.activeBookings} <span className="text-xs font-normal text-slate-400">in Escrow</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{stats.totalBookings} total bookings recorded</p>
                </div>
              </div>

              {/* Quick Actions & Workflow Guide */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    <span>How the Platform Security Pipeline Works</span>
                  </h4>
                  <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0">1</span>
                      <div>
                        <strong className="text-white">Anti-Leak Chat Protection:</strong> The system automatically blocks phone numbers, bank accounts, and keywords (BCEL, QR, WhatsApp) in private chats to prevent bypassing platform fees.
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0">2</span>
                      <div>
                        <strong className="text-white">Official Offer Agreement:</strong> Parties agree on rate, venue, and duration via formal in-app Offer Cards.
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0">3</span>
                      <div>
                        <strong className="text-white">Escrow Holding via Slip Verification:</strong> Clients upload BCEL One payment slips. Once Admin clicks "Approve", the funds are secured in escrow until the date finishes safely.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2">Member Summary</h4>
                    <p className="text-xs text-slate-400 mb-4">Current registered community size</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                        <p className="text-xs text-slate-400">Total Clients</p>
                        <p className="text-xl font-bold text-white mt-1">{stats.totalUsers}</p>
                      </div>
                      <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                        <p className="text-xs text-slate-400">Total Companions</p>
                        <p className="text-xl font-bold text-white mt-1">{stats.totalCompanions}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Platform Commission rate:</span>
                    <span className="text-xs font-bold text-rose-400">{feePercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KYC VERIFICATION QUEUE */}
          {activeTab === 'kyc' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">
                  Verify companion identities against their live selfie to prevent catfishing and fraudulent accounts.
                </p>
                <span className="text-xs font-semibold text-slate-300">
                  {pendingKyc.length} Applications Waiting
                </span>
              </div>

              {pendingKyc.length === 0 ? (
                <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-white">All Caught Up!</h4>
                  <p className="text-xs text-slate-400 mt-1">There are no pending companion KYC applications.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {pendingKyc.map((app) => (
                    <div key={app.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <img
                            src={app.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                            alt={app.user.name}
                            className="w-12 h-12 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              {app.user.name}
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                                {app.user.gender || 'Not specified'}
                              </span>
                            </h4>
                            <p className="text-xs text-slate-400">Phone: {app.user.phone} • City: {app.user.city}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleKycReview(app.id, 'APPROVE')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve & Verify</span>
                          </button>
                          <button
                            onClick={() => {
                              setRejectModal({ type: 'kyc', id: app.id, targetName: app.user.name });
                              setRejectReason('');
                            }}
                            className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-xl text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>

                      {/* Document Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-slate-400">1. National ID / Passport</p>
                          <div className="h-56 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative group">
                            {app.kycIdCardUrl ? (
                              <>
                                <img
                                  src={app.kycIdCardUrl}
                                  alt="ID Card"
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() => setPreviewImage(app.kycIdCardUrl)}
                                />
                                <div
                                  onClick={() => setPreviewImage(app.kycIdCardUrl)}
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white gap-1 cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" /> Click to enlarge
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                                No ID image attached
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-slate-400">2. Live Verification Selfie</p>
                          <div className="h-56 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative group">
                            {app.kycSelfieUrl ? (
                              <>
                                <img
                                  src={app.kycSelfieUrl}
                                  alt="Live Selfie"
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() => setPreviewImage(app.kycSelfieUrl)}
                                />
                                <div
                                  onClick={() => setPreviewImage(app.kycSelfieUrl)}
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white gap-1 cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" /> Click to enlarge
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                                No selfie attached
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400 flex flex-wrap gap-4">
                        <span>Services: <strong className="text-slate-200">{app.services}</strong></span>
                        <span>Rate: <strong className="text-rose-400">{app.hourlyRate.toLocaleString()} LAK/hr</strong></span>
                        <span>Submitted on: {new Date(app.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENT SLIPS VERIFICATION */}
          {activeTab === 'slips' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">
                  Inspect bank transfer receipts uploaded by clients, verify the amount matches the booking, and approve into Escrow.
                </p>
                <span className="text-xs font-semibold text-slate-300">
                  {pendingSlips.length} Slips Pending
                </span>
              </div>

              {pendingSlips.length === 0 ? (
                <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-white">No Slips Pending Approval</h4>
                  <p className="text-xs text-slate-400 mt-1">All booking payments have been processed.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {pendingSlips.map((item) => (
                    <div key={item.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-6">
                      {/* Slip Image */}
                      <div className="w-full md:w-56 shrink-0 space-y-1">
                        <p className="text-xs font-semibold text-slate-400">Bank Transfer Slip</p>
                        <div className="h-64 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative group">
                          <img
                            src={item.slipUrl}
                            alt="Bank Slip"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setPreviewImage(item.slipUrl)}
                          />
                          <div
                            onClick={() => setPreviewImage(item.slipUrl)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white gap-1 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" /> Click to inspect
                          </div>
                        </div>
                      </div>

                      {/* Booking Details Comparison */}
                      <div className="flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                                {item.booking.refCode}
                              </span>
                              <h4 className="text-base font-bold text-white mt-1">
                                {item.booking.activityType} at {item.booking.venueName}
                              </h4>
                              <p className="text-xs text-slate-400">
                                Date: {item.booking.eventDate} @ {item.booking.startTime} ({item.booking.durationHours} hrs)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-400">Required Amount</p>
                              <p className="text-lg font-bold text-white">{item.booking.totalAmount.toLocaleString()} LAK</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                              <p className="text-[11px] text-slate-500 uppercase font-semibold">Client (Sender)</p>
                              <p className="text-xs font-bold text-white mt-0.5">{item.booking.client.name}</p>
                              <p className="text-xs text-slate-400">{item.booking.client.phone}</p>
                            </div>
                            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                              <p className="text-[11px] text-slate-500 uppercase font-semibold">Companion (Talent)</p>
                              <p className="text-xs font-bold text-white mt-0.5">{item.booking.companion.name}</p>
                              <p className="text-xs text-slate-400">{item.booking.companion.phone}</p>
                            </div>
                          </div>

                          <div className="mt-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
                            <span className="text-slate-400">Transfer Slip Amount Reported:</span>
                            <span className="font-bold text-emerald-400 text-sm">
                              {item.amount.toLocaleString()} LAK {item.bankRef ? `(Ref: ${item.bankRef})` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                          <button
                            onClick={() => handleSlipReview(item.id, 'APPROVE')}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve & Move to Escrow</span>
                          </button>
                          <button
                            onClick={() => {
                              setRejectModal({ type: 'slip', id: item.id, targetName: item.booking.refCode });
                              setRejectReason('');
                            }}
                            className="px-5 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-xl text-xs font-bold border border-rose-500/30 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject Slip</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BOOKINGS & ESCROW MONITOR */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Complete record of companion bookings and their escrow status.</p>
                <span className="text-xs font-semibold text-slate-300">{bookings.length} Bookings Total</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">Ref Code</th>
                        <th className="py-3 px-4">Client</th>
                        <th className="py-3 px-4">Companion</th>
                        <th className="py-3 px-4">Activity & Venue</th>
                        <th className="py-3 px-4">Schedule</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {bookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-rose-400">{b.refCode}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-white">{b.client.name}</p>
                            <p className="text-[11px] text-slate-500">{b.client.phone}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-white">{b.companion.name}</p>
                            <p className="text-[11px] text-slate-500">{b.companion.phone}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                              {b.activityType}
                            </span>
                            <p className="text-[11px] text-slate-400 mt-1">{b.venueName}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="text-slate-300">{b.eventDate}</p>
                            <p className="text-[11px] text-slate-500">{b.startTime} ({b.durationHours}h)</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-white">{b.totalAmount.toLocaleString()} LAK</p>
                            <p className="text-[10px] text-slate-500">Fee: {b.platformFee.toLocaleString()} LAK</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                b.status === 'CONFIRMED_ESCROW'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : b.status === 'PENDING_PAYMENT_VERIFICATION'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : b.status === 'COMPLETED'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <form onSubmit={handleSaveSettings} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
                  Financial & Banking Configurations
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Platform Commission Fee (%)
                  </label>
                  <input
                    type="number"
                    value={feePercent}
                    onChange={(e) => setFeePercent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                    min="0"
                    max="50"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Deducted automatically from total booking amount before companion payout.</p>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Company Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Company Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Account Beneficiary Name
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-rose-600/20"
                >
                  Save Settings
                </button>
              </form>

              {/* Active Anti-leak Filter Rules info */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Active Anti-Leak Filter Keywords (Built-in)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Messages containing these terms or phone numbers (020..., 030...) are automatically intercepted and flagged in real-time:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['bcel', 'onepay', 'lapnet', 'ໂອນ', 'ບັນຊີ', 'ເລກບັນຊີ', 'ທະນາຄານ', 'QR Code', 'whatsapp', 'wechat', 'line id', '020...', '030...'].map((rule) => (
                    <span key={rule} className="px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-rose-300">
                      {rule}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h4 className="text-base font-bold text-white">
              Reject {rejectModal.type === 'kyc' ? 'KYC Application' : 'Payment Slip'}
            </h4>
            <p className="text-xs text-slate-400">
              Target: <strong className="text-white">{rejectModal.targetName}</strong>. Specify a rejection reason to notify the user.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. ID photo is blurry / Transfer amount does not match booking total"
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectModal.type === 'kyc') {
                    handleKycReview(rejectModal.id, 'REJECT', rejectReason);
                  } else {
                    handleSlipReview(rejectModal.id, 'REJECT', rejectReason);
                  }
                  setRejectModal(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-slate-700"
          />
        </div>
      )}
    </div>
  );
}
