import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Compass,
  Image as ImageIcon,
  MessageCircle,
  Calendar,
  User as UserIcon,
  Heart,
  Send,
  PlusCircle,
  ShieldCheck,
  MapPin,
  Clock,
  Star,
  Upload,
  AlertTriangle,
  CheckCircle,
  X,
  CreditCard,
  QrCode,
  DollarSign,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { User, CompanionCard, PostItem, Booking, ChatMsg } from './types';

export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('mobile_token') || '');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Navigation
  const [activeTab, setActiveTab] = useState<'explore' | 'feed' | 'chat' | 'bookings' | 'profile'>('explore');

  // Explore tab states
  const [companions, setCompanions] = useState<CompanionCard[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('ALL');
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionCard | null>(null);

  // Feed tab states
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPostModal, setNewPostModal] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [postFile, setPostFile] = useState<File | null>(null);

  // Chat tab states
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<{ id: string; name: string; avatar: string | null } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Booking Offer modal
  const [offerModal, setOfferModal] = useState(false);
  const [offerVenue, setOfferVenue] = useState('Senglao Lounge & Bar');
  const [offerActivity, setOfferActivity] = useState('DRINK');
  const [offerDate, setOfferDate] = useState('2026-11-05');
  const [offerTime, setOfferTime] = useState('19:30');
  const [offerDuration, setOfferDuration] = useState('3');
  const [offerPrice, setOfferPrice] = useState('1050000');

  // Bookings tab states
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [selectedBookingForPay, setSelectedBookingForPay] = useState<Booking | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<any>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipUploadLoading, setSlipUploadLoading] = useState(false);

  // KYC modal
  const [kycModal, setKycModal] = useState(false);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [kycSuccess, setKycSuccess] = useState('');

  // Switch Account fast selector
  const switchAccount = async (targetPhone: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone, password: pass }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('mobile_token', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        setActiveChatUser(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auth fetch helper
  const authFetch = async (url: string, opts: RequestInit = {}) => {
    const headers = {
      ...(opts.headers || {}),
      Authorization: `Bearer ${token}`,
    };
    const res = await fetch(url, { ...opts, headers });
    return res.json();
  };

  // Load current user
  useEffect(() => {
    if (token) {
      authFetch('/api/auth/me')
        .then((data) => {
          if (data.user) setCurrentUser(data.user);
        })
        .catch(() => setToken(''));
    } else {
      // Default auto-login as Somphone (Client) for instant demo
      switchAccount('02088888888', 'pass123');
    }
  }, [token]);

  // Load Companions & Feed
  useEffect(() => {
    const loadCompanions = async () => {
      const query = selectedActivity !== 'ALL' ? `?activity=${selectedActivity}` : '';
      const data = await authFetch(`/api/companions${query}`);
      if (data.companions) setCompanions(data.companions);
    };

    const loadPosts = async () => {
      const data = await authFetch('/api/posts');
      if (data.posts) setPosts(data.posts);
    };

    loadCompanions();
    loadPosts();
  }, [selectedActivity]);

  // Load Bookings
  const loadMyBookings = async () => {
    if (!token) return;
    const data = await authFetch('/api/bookings/my');
    if (data.bookings) setMyBookings(data.bookings);
  };

  useEffect(() => {
    if (token) loadMyBookings();
  }, [token, activeTab]);

  // Socket.io connection & chat loading
  useEffect(() => {
    if (!currentUser) return;

    const socket = io('/', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('join_user', currentUser.id);

    socket.on('new_message', (msg: ChatMsg) => {
      setChatMessages((prev) => [...prev, msg]);
      loadMyBookings();
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    socket.on('message_sent', (data: { message: ChatMsg; securityWarning?: string }) => {
      setChatMessages((prev) => [...prev, data.message]);
      if (data.securityWarning) {
        setSecurityWarning(data.securityWarning);
        setTimeout(() => setSecurityWarning(null), 5000);
      }
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  // Load conversation list
  useEffect(() => {
    if (activeTab === 'chat' && token) {
      authFetch('/api/chat/conversations').then((data) => {
        if (data.conversations) setConversations(data.conversations);
      });
    }
  }, [activeTab, token]);

  // Load specific chat messages
  useEffect(() => {
    if (activeChatUser && token) {
      authFetch(`/api/chat/messages/${activeChatUser.id}`).then((data) => {
        if (data.messages) {
          setChatMessages(data.messages);
          setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      });
    }
  }, [activeChatUser, token]);

  // Send Chat message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!msgInput.trim() || !activeChatUser || !currentUser) return;

    const content = msgInput.trim();
    setMsgInput('');

    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        senderId: currentUser.id,
        receiverId: activeChatUser.id,
        content,
      });
    } else {
      const res = await authFetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: activeChatUser.id, content }),
      });
      if (res.message) setChatMessages((prev) => [...prev, res.message]);
      if (res.securityWarning) {
        setSecurityWarning(res.securityWarning);
        setTimeout(() => setSecurityWarning(null), 5000);
      }
    }
  };

  // Submit Booking Offer from Chat
  const handleSendOffer = async () => {
    if (!activeChatUser) return;
    try {
      const res = await authFetch('/api/bookings/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companionId: activeChatUser.id,
          activityType: offerActivity,
          venueName: offerVenue,
          eventDate: offerDate,
          startTime: offerTime,
          durationHours: Number(offerDuration),
          totalAmount: Number(offerPrice),
        }),
      });

      if (res.booking) {
        setOfferModal(false);
        // Refresh messages
        const msgs = await authFetch(`/api/chat/messages/${activeChatUser.id}`);
        if (msgs.messages) setChatMessages(msgs.messages);
        loadMyBookings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Accept Booking Offer
  const handleAcceptBooking = async (bookingId: string) => {
    try {
      await authFetch(`/api/bookings/${bookingId}/accept`, { method: 'POST' });
      if (activeChatUser) {
        const msgs = await authFetch(`/api/chat/messages/${activeChatUser.id}`);
        if (msgs.messages) setChatMessages(msgs.messages);
      }
      loadMyBookings();
    } catch (err) {
      console.error(err);
    }
  };

  // Open Payment Modal
  const handleOpenPayment = async (booking: Booking) => {
    setSelectedBookingForPay(booking);
    try {
      const data = await authFetch(`/api/payments/instructions/${booking.id}`);
      setPaymentInstructions(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Upload Bank Transfer Slip
  const handleUploadSlip = async () => {
    if (!selectedBookingForPay || !slipFile) return;
    setSlipUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('bookingId', selectedBookingForPay.id);
      formData.append('amount', String(selectedBookingForPay.totalAmount));
      formData.append('slip', slipFile);

      const res = await fetch('/api/payments/upload-slip', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedBookingForPay(null);
        setSlipFile(null);
        loadMyBookings();
        setActiveTab('bookings');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSlipUploadLoading(false);
    }
  };

  // Create Media Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postFile) return;

    try {
      const formData = new FormData();
      formData.append('caption', postCaption);
      formData.append('media', postFile);
      formData.append('mediaType', 'IMAGE');

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setNewPostModal(false);
        setPostCaption('');
        setPostFile(null);
        // Refresh feed
        const data = await authFetch('/api/posts');
        if (data.posts) setPosts(data.posts);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Companion KYC
  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCardFile || !selfieFile) return;

    try {
      const formData = new FormData();
      formData.append('idCard', idCardFile);
      formData.append('selfie', selfieFile);

      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setKycSuccess('KYC documents submitted for review! Admin will verify soon.');
        setTimeout(() => {
          setKycModal(false);
          setKycSuccess('');
        }, 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center selection:bg-rose-500 selection:text-white">
      {/* Mobile Device Frame Container (Max width 440px for true mobile app feel) */}
      <div className="w-full max-w-md bg-slate-900 border-x border-slate-800 flex flex-col min-h-screen shadow-2xl relative overflow-hidden">
        {/* Top Demo User Switcher Bar */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Role: <strong className="text-rose-400">{currentUser?.role || 'CLIENT'}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 mr-1">Switch:</span>
            <button
              onClick={() => switchAccount('02088888888', 'pass123')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                currentUser?.phone === '02088888888' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Client (Somphone)
            </button>
            <button
              onClick={() => switchAccount('02077777777', 'pass123')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                currentUser?.phone === '02077777777' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Companion (Mina)
            </button>
          </div>
        </div>

        {/* Security Warning Toast */}
        {securityWarning && (
          <div className="absolute top-12 left-4 right-4 z-50 bg-rose-600/95 backdrop-blur text-white p-3 rounded-xl shadow-xl flex items-start gap-2.5 text-xs animate-in slide-in-from-top-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300 mt-0.5" />
            <div className="flex-1 leading-snug">
              <p className="font-bold">Security Alert</p>
              <p>{securityWarning}</p>
            </div>
            <button onClick={() => setSecurityWarning(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dynamic App Content Body */}
        <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
          {/* TAB 1: EXPLORE COMPANIONS */}
          {activeTab === 'explore' && (
            <div>
              {/* Header */}
              <div className="p-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Find Companion</h2>
                    <p className="text-xs text-slate-400">Book friendly partners for drinks, party & dinners</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800 text-rose-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'DRINK', label: '🍸 Drinks' },
                    { id: 'PARTY', label: '🎉 Party' },
                    { id: 'DINNER', label: '🍽️ Dinner' },
                    { id: 'MOVIE', label: '🎬 Movie' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      onClick={() => setSelectedActivity(act.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                        selectedActivity === act.id
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Companion Cards List */}
              <div className="px-4 space-y-4">
                {companions.map((comp) => (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedCompanion(comp)}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all cursor-pointer shadow-lg group"
                  >
                    <div className="h-56 w-full relative overflow-hidden bg-slate-950">
                      <img
                        src={comp.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500'}
                        alt={comp.user.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        {comp.user.isVerified && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                            <ShieldCheck className="w-3 h-3" /> VERIFIED
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-amber-400 text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{comp.rating.toFixed(1)}</span>
                      </div>

                      {/* Bottom Image Info */}
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <div className="flex justify-between items-end">
                          <div>
                            <h3 className="text-lg font-bold drop-shadow-sm flex items-center gap-1.5">
                              {comp.user.name}
                            </h3>
                            <p className="text-xs text-slate-300 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-400" />
                              <span>{comp.user.city}</span>
                              <span className="mx-1">•</span>
                              <span>{comp.languages}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-300 uppercase">Rate</p>
                            <p className="text-sm font-extrabold text-rose-400">
                              {comp.hourlyRate.toLocaleString()} <span className="text-[10px] font-normal text-white">LAK/h</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 flex items-center justify-between text-xs text-slate-400 bg-slate-900/90">
                      <div className="flex gap-1.5 flex-wrap">
                        {comp.services.split(',').map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-slate-800 rounded-md text-[10px] font-medium text-slate-300">
                            {s}
                          </span>
                        ))}
                      </div>
                      <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                        View Profile <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SOCIAL MEDIA FEED */}
          {activeTab === 'feed' && (
            <div>
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40 sticky top-0 backdrop-blur z-10">
                <div>
                  <h2 className="text-lg font-bold text-white">Companion Stories & Feed</h2>
                  <p className="text-xs text-slate-400">Latest lifestyle photos & event videos</p>
                </div>
                <button
                  onClick={() => setNewPostModal(true)}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md shadow-rose-500/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post Media</span>
                </button>
              </div>

              <div className="divide-y divide-slate-800">
                {posts.map((post) => (
                  <div key={post.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                        alt={post.user.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          {post.user.name}
                          {post.user.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                        </h4>
                        <p className="text-[10px] text-slate-500">{post.user.city} • {new Date(post.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {post.caption && <p className="text-xs text-slate-200">{post.caption}</p>}

                    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black max-h-96">
                      <img src={post.mediaUrl} alt="Post media" className="w-full object-cover" />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <button
                        onClick={async () => {
                          await authFetch(`/api/posts/${post.id}/like`, { method: 'POST' });
                          const refreshed = await authFetch('/api/posts');
                          if (refreshed.posts) setPosts(refreshed.posts);
                        }}
                        className="flex items-center gap-1.5 hover:text-rose-400 transition-colors"
                      >
                        <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                        <span>{post.likesCount}</span>
                      </button>
                      <span className="text-[11px] text-slate-500">
                        {post.comments.length} comments
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CHAT LIST & MESSAGES */}
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col">
              {!activeChatUser ? (
                <div>
                  <div className="p-4 border-b border-slate-800">
                    <h2 className="text-lg font-bold text-white">Messages</h2>
                    <p className="text-xs text-slate-400">Direct chat with verified companions & clients</p>
                  </div>

                  <div className="divide-y divide-slate-800/60">
                    {conversations.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 text-xs">
                        No conversations yet. Go to <strong className="text-rose-400">Explore</strong> to start chatting!
                      </div>
                    ) : (
                      conversations.map((c) => (
                        <div
                          key={c.partner.id}
                          onClick={() => setActiveChatUser(c.partner)}
                          className="p-4 flex items-center gap-3 hover:bg-slate-800/40 transition-colors cursor-pointer"
                        >
                          <img
                            src={c.partner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                            alt={c.partner.name}
                            className="w-12 h-12 rounded-full object-cover border border-slate-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                              <h4 className="text-xs font-bold text-white truncate flex items-center gap-1">
                                {c.partner.name}
                                {c.partner.isVerified && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                              </h4>
                              {c.lastMessage && (
                                <span className="text-[10px] text-slate-500">
                                  {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              {c.lastMessage?.content || 'Started a conversation'}
                            </p>
                          </div>
                          {c.unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* Active Chat Room View */
                <div className="flex flex-col h-[calc(100vh-140px)]">
                  {/* Chat Top Bar */}
                  <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setActiveChatUser(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <img
                        src={activeChatUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                        alt={activeChatUser.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white">{activeChatUser.name}</h4>
                        <span className="text-[10px] text-emerald-400">● Online</span>
                      </div>
                    </div>

                    {/* Button to Create Booking Offer directly from chat */}
                    <button
                      onClick={() => setOfferModal(true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 flex items-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Offer</span>
                    </button>
                  </div>

                  {/* Anti-Leak Safety Banner */}
                  <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-1.5 justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Transfers outside via QR/Phone are blocked. Booking via platform is insured.</span>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                    {chatMessages.map((msg) => {
                      const isMe = msg.senderId === currentUser?.id;

                      if (msg.messageType === 'OFFER_CARD') {
                        return (
                          <div key={msg.id} className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-rose-500/30 rounded-2xl shadow-xl space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> Official Date Agreement Offer
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                                Pending Agreement
                              </span>
                            </div>
                            <p className="text-xs text-white leading-relaxed">{msg.content}</p>

                            <div className="flex gap-2 pt-1">
                              {msg.bookingId && !isMe && (
                                <button
                                  onClick={() => handleAcceptBooking(msg.bookingId!)}
                                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Accept Agreement</span>
                                </button>
                              )}
                              {msg.bookingId && (
                                <button
                                  onClick={() => {
                                    const found = myBookings.find((b) => b.id === msg.bookingId);
                                    if (found) handleOpenPayment(found);
                                    else {
                                      loadMyBookings();
                                      setActiveTab('bookings');
                                    }
                                  }}
                                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                                >
                                  View / Pay QR
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (msg.messageType === 'SYSTEM_ALERT') {
                        return (
                          <div key={msg.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-amber-300">
                            {msg.content}
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs ${
                              isMe
                                ? 'bg-rose-600 text-white rounded-tr-none'
                                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                            }`}
                          >
                            <p>{msg.content}</p>
                            {msg.isBlocked && (
                              <p className="text-[10px] text-amber-300 font-semibold mt-1">
                                ⚠️ Contact info or payment keywords blocked
                              </p>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                    <input
                      type="text"
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      placeholder="Type message... (e.g. meet at rooftop?)"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="submit"
                      disabled={!msgInput.trim()}
                      className="p-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl shadow-md transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MY BOOKINGS & ESCROW */}
          {activeTab === 'bookings' && (
            <div className="p-4 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">My Bookings & Escrow</h2>
                <p className="text-xs text-slate-400">Track date confirmations, pay QR, and check-in at venue</p>
              </div>

              {myBookings.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/60 border border-slate-800 rounded-2xl">
                  No bookings yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {myBookings.map((bk) => (
                    <div key={bk.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-rose-400 font-bold">
                            {bk.refCode}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1">
                            {bk.activityType} with {currentUser?.id === bk.clientId ? bk.companion.name : bk.client.name}
                          </h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-rose-400" />
                            <span>{bk.venueName}</span>
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            bk.status === 'CONFIRMED_ESCROW'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : bk.status === 'PENDING_PAYMENT_VERIFICATION'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : bk.status === 'COMPLETED'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {bk.status}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-300 flex justify-between items-center">
                        <div>
                          <p className="text-slate-500 text-[10px]">Date & Time</p>
                          <p className="font-semibold">{bk.eventDate} @ {bk.startTime}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-500 text-[10px]">Total Amount</p>
                          <p className="font-extrabold text-rose-400">{bk.totalAmount.toLocaleString()} LAK</p>
                        </div>
                      </div>

                      {/* Action buttons based on status */}
                      <div className="flex gap-2 pt-1">
                        {bk.status === 'OFFER_ACCEPTED' && (
                          <button
                            onClick={() => handleOpenPayment(bk)}
                            className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/25"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>Pay via Bank QR & Upload Slip</span>
                          </button>
                        )}

                        {bk.status === 'PENDING_PAYMENT_VERIFICATION' && (
                          <div className="w-full py-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs text-center">
                            ⏳ Slip uploaded. Waiting for Admin verification...
                          </div>
                        )}

                        {bk.status === 'CONFIRMED_ESCROW' && (
                          <div className="w-full flex gap-2">
                            <button
                              onClick={async () => {
                                await authFetch(`/api/bookings/${bk.id}/checkin`, { method: 'POST' });
                                loadMyBookings();
                              }}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <MapPin className="w-4 h-4" />
                              <span>Venue GPS Check-In</span>
                            </button>
                            <button
                              onClick={async () => {
                                await authFetch(`/api/bookings/${bk.id}/complete`, { method: 'POST' });
                                loadMyBookings();
                              }}
                              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                            >
                              Complete Date
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PROFILE & WALLET */}
          {activeTab === 'profile' && currentUser && (
            <div className="p-4 space-y-5">
              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                    alt={currentUser.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-rose-500 shadow-lg"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      {currentUser.name}
                      {currentUser.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    </h3>
                    <p className="text-xs text-slate-400">{currentUser.phone}</p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                      Role: {currentUser.role}
                    </span>
                  </div>
                </div>

                {/* Wallet Balance Card */}
                <div className="mt-5 p-4 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">In-App Wallet Balance</p>
                    <p className="text-xl font-extrabold text-white mt-0.5">
                      {currentUser.walletBalance.toLocaleString()} <span className="text-xs font-normal text-rose-400">LAK</span>
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Companion KYC Submission Trigger */}
              {currentUser.role === 'COMPANION' && (
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-rose-400" />
                      <span>ID & Identity Verification</span>
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                      {currentUser.companion?.kycStatus || 'NOT_SUBMITTED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Upload your National ID Card and a live selfie to get verified and accept bookings.
                  </p>
                  <button
                    onClick={() => setKycModal(true)}
                    className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl text-xs font-bold border border-rose-500/20"
                  >
                    Submit ID & Selfie for Approval
                  </button>
                </div>
              )}

              {/* Safety & App Guidelines */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400 space-y-2">
                <p className="font-semibold text-slate-300">Safety Rules:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>Meetings are strictly in public places (bars, restaurants, cafes, events).</li>
                  <li>All payments must go through system Escrow to protect both sides.</li>
                  <li>Attempting to exchange bank details outside will lead to account suspension.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Tab Navigation Bar */}
        <div className="h-16 bg-slate-950 border-t border-slate-800 px-6 flex items-center justify-between shrink-0 absolute bottom-0 left-0 right-0 z-20">
          <button
            onClick={() => setActiveTab('explore')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'explore' ? 'text-rose-500 font-bold' : 'text-slate-400'}`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px]">Explore</span>
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'feed' ? 'text-rose-500 font-bold' : 'text-slate-400'}`}
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-[10px]">Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'chat' ? 'text-rose-500 font-bold' : 'text-slate-400'}`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px]">Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'bookings' ? 'text-rose-500 font-bold' : 'text-slate-400'}`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">Bookings</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-rose-500 font-bold' : 'text-slate-400'}`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>

        {/* MODAL 1: COMPANION PROFILE DETAIL */}
        {selectedCompanion && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 relative">
              <button
                onClick={() => setSelectedCompanion(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex gap-4 items-center">
                <img
                  src={selectedCompanion.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}
                  alt={selectedCompanion.user.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-rose-500"
                />
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                    {selectedCompanion.user.name}
                    {selectedCompanion.user.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedCompanion.user.city} • {selectedCompanion.languages}</p>
                  <p className="text-xs font-bold text-rose-400 mt-1">
                    {selectedCompanion.hourlyRate.toLocaleString()} LAK/hour
                  </p>
                </div>
              </div>

              {selectedCompanion.user.bio && (
                <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-300 leading-relaxed">
                  "{selectedCompanion.user.bio}"
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-400">Available Services</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCompanion.services.split(',').map((s) => (
                    <span key={s} className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-semibold text-slate-200">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setActiveChatUser(selectedCompanion.user);
                    setSelectedCompanion(null);
                    setActiveTab('chat');
                  }}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/25"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat & Make Offer</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: CREATE BOOKING OFFER */}
        {offerModal && activeChatUser && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-400" />
                  <span>Send Booking Offer to {activeChatUser.name}</span>
                </h3>
                <button onClick={() => setOfferModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Activity Type</label>
                  <select
                    value={offerActivity}
                    onChange={(e) => setOfferActivity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="DRINK">🍸 Drinking / Bar Lounge</option>
                    <option value="PARTY">🎉 Party / Clubbing</option>
                    <option value="DINNER">🍽️ Dinner / Restaurant</option>
                    <option value="EVENT">👔 Business Event / Plus-One</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Public Venue Name</label>
                  <input
                    type="text"
                    value={offerVenue}
                    onChange={(e) => setOfferVenue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    placeholder="e.g. Landmark Mekong Rooftop"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Event Date</label>
                    <input
                      type="date"
                      value={offerDate}
                      onChange={(e) => setOfferDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Start Time</label>
                    <input
                      type="time"
                      value={offerTime}
                      onChange={(e) => setOfferTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Duration (Hours)</label>
                    <input
                      type="number"
                      value={offerDuration}
                      onChange={(e) => setOfferDuration(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Agreed Price (LAK)</label>
                    <input
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSendOffer}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/25"
              >
                Send Formal Agreement Card
              </button>
            </div>
          </div>
        )}

        {/* MODAL 3: PAYMENT QR & SLIP UPLOAD */}
        {selectedBookingForPay && paymentInstructions && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-rose-400" />
                  <span>Official System Payment QR</span>
                </h3>
                <button onClick={() => setSelectedBookingForPay(null)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="text-center p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <p className="text-[11px] text-slate-400">
                  Scan via BCEL One / Mobile Banking to transfer into Escrow:
                </p>
                <img
                  src={paymentInstructions.bankDetails.qrImageUrl}
                  alt="Company QR"
                  className="w-44 h-44 mx-auto rounded-xl object-cover border border-slate-700"
                />
                <div className="text-xs">
                  <p className="font-bold text-white">{paymentInstructions.bankDetails.bankName}</p>
                  <p className="font-mono text-rose-400 text-sm mt-0.5">{paymentInstructions.bankDetails.accountNumber}</p>
                  <p className="text-[10px] text-slate-400">{paymentInstructions.bankDetails.accountName}</p>
                </div>
                <div className="p-2 bg-slate-900 rounded-xl text-xs font-mono font-bold text-amber-300">
                  Ref Code: {paymentInstructions.refCode}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">
                  Attach Transfer Slip (ໃບບິນໂອນເງິນ)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-rose-300"
                />
              </div>

              <button
                onClick={handleUploadSlip}
                disabled={!slipFile || slipUploadLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25"
              >
                {slipUploadLoading ? 'Uploading Slip...' : 'Upload Slip & Submit to Admin'}
              </button>
            </div>
          </div>
        )}

        {/* MODAL 4: NEW MEDIA POST */}
        {newPostModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={handleCreatePost} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Create New Post</h3>
                <button type="button" onClick={() => setNewPostModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Caption</label>
                <textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Share what you are up to tonight..."
                  className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Photo / Video</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  required
                  onChange={(e) => setPostFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-rose-300"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
              >
                Publish Post
              </button>
            </form>
          </div>
        )}

        {/* MODAL 5: SUBMIT COMPANION KYC */}
        {kycModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={handleSubmitKyc} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  <span>Companion ID Verification</span>
                </h3>
                <button type="button" onClick={() => setKycModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {kycSuccess && (
                <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs">
                  {kycSuccess}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">1. National ID Card or Passport</label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setIdCardFile(e.target.files?.[0] || null)}
                    className="w-full text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:bg-slate-800 file:text-rose-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">2. Live Selfie Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                    className="w-full text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:bg-slate-800 file:text-rose-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
              >
                Submit for Admin Approval
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
