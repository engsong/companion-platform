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
  Sparkles,
  LogOut,
  Paperclip,
  Mic,
  Volume2,
  FileText,
  Camera,
  Navigation,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Copy,
  Check,
  Download,
  ScanLine,
  CheckCircle2,
  RefreshCw,
  Search,
  Info,
  UserPlus,
  UserCheck,
  Users
} from 'lucide-react';
import jsQR from 'jsqr';
import { User, CompanionCard, PostItem, Booking, ChatMsg, WalletTx, WalletRecipient, WalletTransferEslip, ChatContact, UserProfileData } from './types';

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Online status & Chat Contacts
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [chatContacts, setChatContacts] = useState<ChatContact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactFilter, setContactFilter] = useState<'ALL' | 'ONLINE' | 'COMPANION' | 'CLIENT'>('ALL');

  // Facebook-style Profile modal & Photo Lightbox
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfileData | null>(null);
  const [loadingUserProfile, setLoadingUserProfile] = useState(false);
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const profileAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const profileCoverInputRef = useRef<HTMLInputElement | null>(null);

  // In-App Wallet states & modals
  const [walletTransactions, setWalletTransactions] = useState<WalletTx[]>([]);
  const [topupModal, setTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('500000');
  const [topupSlipFile, setTopupSlipFile] = useState<File | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupInstructions, setTopupInstructions] = useState<any>(null);

  const [transferModal, setTransferModal] = useState(false);
  const [transferTab, setTransferTab] = useState<'send' | 'myqr'>('send');
  const [transferStep, setTransferStep] = useState<'scan' | 'amount'>('scan');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('200000');
  const [transferNote, setTransferNote] = useState('');
  const [recipientInfo, setRecipientInfo] = useState<WalletRecipient | null>(null);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [eslipModal, setEslipModal] = useState<WalletTransferEslip | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [eslipSavedToast, setEslipSavedToast] = useState(false);
  const [appToast, setAppToast] = useState<{ type: 'success' | 'error' | 'info'; title?: string; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', title?: string) => {
    setAppToast({ type, message, title });
    setTimeout(() => {
      setAppToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scannerAnimRef = useRef<number | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('10000');
  const [withdrawBank, setWithdrawBank] = useState('Banque Pour Le Commerce Exterieur Lao (BCEL)');
  const [withdrawAccountNo, setWithdrawAccountNo] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawQrFile, setWithdrawQrFile] = useState<File | null>(null);
  const [withdrawQrPreview, setWithdrawQrPreview] = useState<string | null>(null);
  const withdrawQrInputRef = useRef<HTMLInputElement | null>(null);

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

  // Auth Screen states (Login & Register)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authPhone, setAuthPhone] = useState('02088888888');
  const [authPassword, setAuthPassword] = useState('pass123');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState<'CLIENT' | 'COMPANION'>('CLIENT');
  const [authGender, setAuthGender] = useState('Female');
  const [authCity, setAuthCity] = useState('Vientiane');
  const [authBankQrFile, setAuthBankQrFile] = useState<File | null>(null);
  const [authBankQrPreview, setAuthBankQrPreview] = useState<string | null>(null);
  const authBankQrInputRef = useRef<HTMLInputElement | null>(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: authPhone, password: authPassword }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(res.status === 502 ? 'Backend service is starting up (502). Please wait a moment and try again.' : `Server error (${res.status})`);
      }
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('mobile_token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
    } catch (err: any) {
      setAuthError(err.message || 'Login error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!authBankQrFile) {
      setAuthError('Please upload your Bank QR Code (ກະລຸນາອັບໂຫຼດ QR ບັນຊີທະນາຄານຂອງທ່ານ)');
      return;
    }

    setAuthLoading(true);
    try {
      const formData = new FormData();
      formData.append('phone', authPhone);
      formData.append('password', authPassword);
      formData.append('name', authName);
      formData.append('role', authRole);
      formData.append('gender', authGender);
      formData.append('city', authCity);
      formData.append('bankQr', authBankQrFile);

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData,
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(res.status === 502 ? 'Backend service is starting up (502). Please wait a moment and try again.' : `Server error (${res.status})`);
      }
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      localStorage.setItem('mobile_token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
    } catch (err: any) {
      setAuthError(err.message || 'Registration error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mobile_token');
    setToken('');
    setCurrentUser(null);
    setActiveChatUser(null);
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
          else {
            setToken('');
            setCurrentUser(null);
          }
        })
        .catch(() => {
          setToken('');
          setCurrentUser(null);
        });
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

  // Load Wallet Info
  const loadWalletInfo = async () => {
    if (!token) return;
    try {
      const data = await authFetch('/api/wallet/me');
      if (data.balance !== undefined) {
        setCurrentUser((prev) => (prev ? {
          ...prev,
          walletBalance: data.balance,
          walletId: data.walletId || prev.walletId
        } : null));
        setWalletTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error('Failed to load wallet:', e);
    }
  };

  const loadTopupInstructions = async () => {
    try {
      const data = await authFetch('/api/wallet/instructions');
      setTopupInstructions(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token && activeTab === 'profile') {
      loadWalletInfo();
    }
  }, [token, activeTab]);

  // Socket.io connection & chat loading
  useEffect(() => {
    if (!currentUser) return;

    const socket = io('/', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('join_user', currentUser.id);

    socket.on('new_message', (msg: ChatMsg) => {
      setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      loadMyBookings();
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    socket.on('message_sent', (data: { message: ChatMsg; securityWarning?: string }) => {
      setChatMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      if (data.securityWarning) {
        setSecurityWarning(data.securityWarning);
        setTimeout(() => setSecurityWarning(null), 5000);
      }
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    socket.on('wallet_updated', (data: any) => {
      loadWalletInfo();
      if (data?.type === 'TRANSFER_IN') {
        setSecurityWarning(`🎉 You received a real-time transfer of ${data.amount?.toLocaleString()} LAK from ${data.fromName || 'another user'}!`);
        setTimeout(() => setSecurityWarning(null), 8000);
      } else if (data?.status === 'APPROVED' && data?.type === 'TOPUP') {
        setSecurityWarning(`✅ Your wallet top-up of ${data.amount?.toLocaleString()} LAK has been approved by Admin!`);
        setTimeout(() => setSecurityWarning(null), 8000);
      } else if (data?.status === 'COMPLETED' && data?.type === 'WITHDRAW') {
        setSecurityWarning(`✅ Your withdrawal of ${data.amount?.toLocaleString()} LAK has been completed and sent to your bank!`);
        setTimeout(() => setSecurityWarning(null), 8000);
      }
    });

    // Real-time online users updates
    socket.on('online_users_update', (ids: string[]) => {
      setOnlineUserIds(ids);
      setChatContacts((prev) => prev.map((c) => ({ ...c, isOnline: ids.includes(c.id) })));
      setSelectedUserProfile((prev) => (prev ? { ...prev, isOnline: ids.includes(prev.id) } : null));
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  // Load chat contacts (all friends/companions/clients)
  const loadChatContacts = async () => {
    if (!token) return;
    try {
      const data = await authFetch('/api/chat/contacts');
      if (data.contacts) setChatContacts(data.contacts);
      if (data.onlineUserIds) setOnlineUserIds(data.onlineUserIds);
    } catch (e) {
      console.error('Failed to load chat contacts:', e);
    }
  };

  // Open any user's Facebook-style profile modal
  const handleOpenUserProfile = async (userId: string) => {
    setLoadingUserProfile(true);
    try {
      const res = await authFetch(`/api/auth/profile/${userId}`);
      if (res.profile) {
        setSelectedUserProfile(res.profile);
      } else {
        showToast('Unable to load user profile.', 'error');
      }
    } catch (e) {
      console.error('Failed to load user profile:', e);
      showToast('Error loading profile.', 'error');
    } finally {
      setLoadingUserProfile(false);
    }
  };

  // Start chat with user from Online Bar, Contacts directory, or Profile modal
  const handleStartChatWithUser = (user: { id: string; name: string; avatar: string | null }) => {
    setSelectedUserProfile(null);
    setActiveChatUser({ id: user.id, name: user.name, avatar: user.avatar });
    setActiveTab('chat');
  };

  // Upload & update user profile picture
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setSelectedUserProfile((prev) => (prev && prev.id === data.user.id ? { ...prev, avatar: data.user.avatar } : prev));
        showToast('Profile picture updated successfully! (ປ່ຽນຮູບໂປຣໄຟລ໌ສຳເລັດແລ້ວ)', 'success');
      } else {
        showToast(data.error || 'Failed to update profile picture', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to upload profile picture', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Upload & update user cover photo (Facebook style)
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('cover', file);
      const res = await fetch('/api/auth/cover', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.coverImage) {
        setSelectedUserProfile((prev) => (prev ? { ...prev, coverImage: data.coverImage } : null));
        setCurrentUser((prev) => (prev ? { ...prev, coverImage: data.coverImage } : null));
        showToast('Cover photo updated! (ປ່ຽນຮູບໜ້າປົກສຳເລັດແລ້ວ)', 'success');
      } else {
        showToast(data.error || 'Failed to update cover photo', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to upload cover photo', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  // Add / Remove Friend (Facebook style)
  const handleToggleFriend = async (targetUserId: string) => {
    try {
      const res = await authFetch(`/api/auth/friends/${targetUserId}`, { method: 'POST' });
      if (res.isFriend !== undefined) {
        setSelectedUserProfile((prev) =>
          prev && prev.id === targetUserId
            ? { ...prev, isFriend: res.isFriend, friendCount: res.friendCount }
            : prev
        );
        if (res.isFriend) {
          showToast(`Friend added! You are now friends with ${selectedUserProfile?.name || 'this user'}. (ເພີ່ມໝູ່ສຳເລັດແລ້ວ)`, 'success');
        } else {
          showToast(`Unfriended successfully. (ຍົກເລີກການເປັນໝູ່ແລ້ວ)`, 'info');
        }
      }
    } catch (err: any) {
      console.error('Failed to toggle friend:', err);
      showToast('Failed to update friendship', 'error');
    }
  };

  // Load conversation list and contacts
  useEffect(() => {
    if (activeTab === 'chat' && token) {
      authFetch('/api/chat/conversations').then((data) => {
        if (data.conversations) setConversations(data.conversations);
      });
      loadChatContacts();
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
      if (res.message) {
        setChatMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
      }
      if (res.securityWarning) {
        setSecurityWarning(res.securityWarning);
        setTimeout(() => setSecurityWarning(null), 5000);
      }
    }
  };

  // Send picture or file in chat
  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatUser) return;

    const isAudio = file.type.startsWith('audio');
    const isImage = file.type.startsWith('image');
    const messageType = isAudio ? 'AUDIO' : (isImage ? 'IMAGE' : 'FILE');

    const formData = new FormData();
    formData.append('receiverId', activeChatUser.id);
    formData.append('messageType', messageType);
    formData.append('file', file);

    try {
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || data.error === 'SECURITY_BLOCKED') {
        const warningText =
          data.message ||
          (data.reasons && data.reasons.join(' • ')) ||
          'Payment QR codes, bank transfer slips, and contact numbers (020/030) are strictly prohibited.';
        setSecurityWarning(warningText);
        setTimeout(() => setSecurityWarning(null), 8000);
        return;
      }

      if (data.message) {
        setChatMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      console.error('Chat file upload failed:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  // Send Location Message (Google Maps Link & Venue Name)
  const handleSendLocation = (mapsUrl: string, title: string) => {
    if (!activeChatUser || !currentUser) return;
    const content = `${title}\n${mapsUrl}`;

    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        senderId: currentUser.id,
        receiverId: activeChatUser.id,
        content,
        messageType: 'LOCATION',
      });
    } else {
      authFetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activeChatUser.id,
          content,
          messageType: 'LOCATION',
        }),
      }).then((res) => {
        if (res.message) {
          setChatMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
          setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      });
    }
    setLocationModalOpen(false);
    setAttachMenuOpen(false);
  };

  // Get Live Geolocation
  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      handleSendLocation('https://www.google.com/maps?q=17.9757,102.6331', '📍 Meetup Location (Vientiane)');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const url = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        handleSendLocation(url, `📍 Live GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      },
      (err) => {
        console.warn('Geolocation access failed or denied:', err);
        handleSendLocation('https://www.google.com/maps?q=17.9757,102.6331', '📍 Senglao Lounge & Bar (Vientiane)');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0 && activeChatUser) {
          const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('receiverId', activeChatUser.id);
          formData.append('messageType', 'AUDIO');
          formData.append('file', audioFile);

          try {
            const res = await fetch('/api/chat/upload', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });
            const data = await res.json();
            if (data.message) {
              setChatMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
              setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
          } catch (err) {
            console.error('Failed to send voice message:', err);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      showToast('Microphone access is required to record voice notes.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
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

  // Submit Top-up Slip
  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupSlipFile) {
      showToast('Please select and attach your payment transfer slip.', 'error');
      return;
    }
    setTopupLoading(true);
    const formData = new FormData();
    formData.append('amount', topupAmount);
    formData.append('bankName', 'BCEL One');
    formData.append('slip', topupSlipFile);

    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit top-up');
      showToast('Top-up slip submitted! Admin will verify and deposit funds within 1-3 minutes.', 'success', 'ຕື່ມເງິນສຳເລັດ / Top-Up Submitted');
      setTopupModal(false);
      setTopupSlipFile(null);
      loadWalletInfo();
    } catch (err: any) {
      showToast(err.message || 'Error submitting top-up', 'error');
    } finally {
      setTopupLoading(false);
    }
  };

  // Camera scanner handlers
  const startCameraScanner = async () => {
    setInquiryError(null);
    setIsScanningCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      scannerStreamRef.current = stream;
      if (scannerVideoRef.current) {
        scannerVideoRef.current.srcObject = stream;
        scannerVideoRef.current.setAttribute('playsinline', 'true');
        await scannerVideoRef.current.play();
        scannerAnimRef.current = requestAnimationFrame(tickScanner);
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setIsScanningCamera(false);
      setInquiryError('Camera permission required to scan QR code. You can upload a QR image or enter phone number.');
    }
  };

  const stopCameraScanner = () => {
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    }
    if (scannerAnimRef.current) {
      cancelAnimationFrame(scannerAnimRef.current);
      scannerAnimRef.current = null;
    }
    setIsScanningCamera(false);
  };

  const tickScanner = () => {
    if (!scannerVideoRef.current || scannerVideoRef.current.readyState !== scannerVideoRef.current.HAVE_ENOUGH_DATA) {
      scannerAnimRef.current = requestAnimationFrame(tickScanner);
      return;
    }

    const video = scannerVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code && code.data) {
        stopCameraScanner();
        handleSendInquiry(code.data);
        return;
      }
    }
    scannerAnimRef.current = requestAnimationFrame(tickScanner);
  };

  // QR Image File upload scanner
  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInquiryError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleSendInquiry(code.data);
          } else {
            setInquiryError('No valid QR code found in selected image. Please try another image.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (qrFileInputRef.current) qrFileInputRef.current.value = '';
  };

  // Send Inquiry to verify recipient
  const handleSendInquiry = async (targetPayload: string) => {
    const clean = targetPayload.trim();
    if (!clean) {
      setInquiryError('Please enter recipient phone number or scan QR code');
      return;
    }
    setInquiryLoading(true);
    setInquiryError(null);
    try {
      const res = await fetch('/api/wallet/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetIdentifier: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Recipient not found');

      setRecipientInfo(data.recipient);
      setTransferTarget(data.recipient.walletId);
      setTransferStep('amount');
    } catch (err: any) {
      setInquiryError(err.message || 'Error finding recipient wallet');
    } finally {
      setInquiryLoading(false);
    }
  };

  // Submit Real-time Wallet Transfer
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientInfo) {
      showToast('Recipient information missing. Please scan QR or verify Wallet ID.', 'error');
      return;
    }
    const num = parseFloat(transferAmount);
    if (isNaN(num) || num <= 0) {
      showToast('Please enter a valid transfer amount.', 'error');
      return;
    }
    if ((currentUser?.walletBalance || 0) < num) {
      showToast(`Insufficient balance. You have ${(currentUser?.walletBalance || 0).toLocaleString()} LAK available.`, 'error');
      return;
    }

    setTransferLoading(true);
    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetIdentifier: recipientInfo.walletId || recipientInfo.id,
          amount: num,
          note: transferNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');

      // Success: open e-slip!
      if (data.eslip) {
        setEslipModal(data.eslip);
      }
      setTransferModal(false);
      setTransferStep('scan');
      setRecipientInfo(null);
      setTransferTarget('');
      setTransferNote('');
      if (currentUser) {
        setCurrentUser({ ...currentUser, walletBalance: data.balance });
      }
      loadWalletInfo();
    } catch (err: any) {
      showToast(err.message || 'Error processing transfer', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  // Generate & Save e-Slip as PNG Image into Phone Gallery
  const handleSaveEslip = (eslip: WalletTransferEslip) => {
    const canvas = document.createElement('canvas');
    canvas.width = 650;
    canvas.height = 920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative Card Border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    // Header gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 180);
    grad.addColorStop(0, '#e11d48');
    grad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = grad;
    ctx.fillRect(20, 20, canvas.width - 40, 160);

    // App title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COMPANION PLATFORM', canvas.width / 2, 75);

    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#fecdd3';
    ctx.fillText('REAL-TIME WALLET TRANSFER E-SLIP (ໃບຮັບເງິນ)', canvas.width / 2, 110);

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText('✓ TRANSFER SUCCESSFUL (ໂອນເງິນສຳເລັດ)', canvas.width / 2, 150);

    // Amount Box
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(50, 210, canvas.width - 100, 110);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 210, canvas.width - 100, 110);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('TRANSFER AMOUNT (ຈຳນວນເງິນໂອນ)', canvas.width / 2, 245);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(`${eslip.amount.toLocaleString()} LAK`, canvas.width / 2, 295);

    // Transaction Details Table
    const startY = 360;
    const lineSpacing = 42;
    ctx.textAlign = 'left';

    const drawDetailRow = (y: number, label: string, value: string, isBold: boolean = false, color: string = '#f8fafc') => {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText(label, 60, y);

      ctx.fillStyle = color;
      ctx.font = isBold ? 'bold 18px sans-serif' : '17px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value, canvas.width - 60, y);
      ctx.textAlign = 'left';

      // subtle separator line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, y + 15);
      ctx.lineTo(canvas.width - 60, y + 15);
      ctx.stroke();
    };

    const formattedDate = new Date(eslip.dateTime).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    drawDetailRow(startY, 'Reference ID (ເລກອ້າງອີງ):', eslip.referenceId, true, '#38bdf8');
    drawDetailRow(startY + lineSpacing, 'Date & Time (ວັນທີ/ເວລາ):', formattedDate);
    drawDetailRow(startY + lineSpacing * 2, 'Sender / Debit (ຜູ້ໂອນ):', `${eslip.debit.name} (${eslip.debit.walletId})`, true);
    drawDetailRow(startY + lineSpacing * 3, 'Receiver / Credit (ຜູ້ຮັບ):', `${eslip.credit.name} (${eslip.credit.walletId})`, true, '#4ade80');
    drawDetailRow(startY + lineSpacing * 4, 'Transfer Fee (ຄ່າທຳນຽມ):', '0 LAK (Free)', false, '#94a3b8');

    // Bottom Security Notice & QR
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('This e-Slip is an official proof of electronic fund transfer verified by Companion App.', canvas.width / 2, startY + lineSpacing * 5 + 40);
    ctx.fillText('www.companion-platform.la • Real-time Escrow & Wallet', canvas.width / 2, startY + lineSpacing * 5 + 65);

    // Generate Download link
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `eslip-${eslip.referenceId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setEslipSavedToast(true);
    setTimeout(() => setEslipSavedToast(false), 3000);
  };


  // Submit Withdrawal Request (Direct to Bank QR)
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(withdrawAmount);
    if (isNaN(num) || num <= 0) {
      showToast('Please enter a valid withdrawal amount.', 'error');
      return;
    }
    if ((currentUser?.walletBalance || 0) < num) {
      showToast(`Insufficient balance. You have ${(currentUser?.walletBalance || 0).toLocaleString()} LAK available.`, 'error');
      return;
    }

    let targetBankQr = currentUser?.bankQrUrl;

    setWithdrawLoading(true);
    try {
      // If user uploaded a new Bank QR in the withdrawal modal, upload it first
      if (withdrawQrFile) {
        const qrFormData = new FormData();
        qrFormData.append('bankQr', withdrawQrFile);
        const qrRes = await fetch('/api/auth/bank-qr', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: qrFormData,
        });
        const qrData = await qrRes.json();
        if (qrData.bankQrUrl) {
          targetBankQr = qrData.bankQrUrl;
          if (currentUser) {
            setCurrentUser({ ...currentUser, bankQrUrl: qrData.bankQrUrl });
          }
        }
      }

      if (!targetBankQr) {
        showToast('Please attach or upload your Bank QR Code (BCEL One / Lao QR) so admin can transfer funds.', 'error');
        setWithdrawLoading(false);
        return;
      }

      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: num,
          bankQrUrl: targetBankQr
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdrawal request failed');
      showToast('Withdrawal request submitted! Admin will scan your Bank QR and transfer funds within 5-15 minutes.', 'success', 'ຖອນເງິນສຳເລັດ / Request Sent');
      setWithdrawModal(false);
      setWithdrawQrFile(null);
      setWithdrawQrPreview(null);
      loadWalletInfo();
    } catch (err: any) {
      showToast(err.message || 'Error submitting withdrawal', 'error');
    } finally {
      setWithdrawLoading(false);
    }
  };

  // If not logged in, render Mobile Login & Register Screen
  if (!token || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center p-0 selection:bg-rose-500 selection:text-white">
        <div className="w-full max-w-md bg-slate-900 border-x border-slate-800 flex flex-col min-h-screen shadow-2xl relative overflow-y-auto p-6 justify-center">
          {/* Sleek App Toast Notification */}
          {appToast && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
              <div
                className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-md border flex items-start gap-3 ${
                  appToast.type === 'success'
                    ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-950/60'
                    : appToast.type === 'error'
                    ? 'bg-slate-900/95 border-rose-500/50 text-white shadow-rose-950/60'
                    : 'bg-slate-900/95 border-sky-500/50 text-white shadow-sky-950/60'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    appToast.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : appToast.type === 'error'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-sky-500/20 text-sky-400'
                  }`}
                >
                  {appToast.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : appToast.type === 'error' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  {appToast.title && (
                    <h4 className="text-xs font-bold text-white tracking-wide mb-0.5">
                      {appToast.title}
                    </h4>
                  )}
                  <p className="text-xs text-slate-200 leading-relaxed break-words font-medium">
                    {appToast.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAppToast(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 shrink-0 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-rose-600/30 mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Companion Social App</h1>
            <p className="text-xs text-slate-400 mt-1">Dating & Party Companion Platform</p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'register' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  placeholder="020xxxxxxxx"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/25 transition-all mt-2"
              >
                {authLoading ? 'Signing In...' : 'Log In to App'}
              </button>

              {/* Demo Accounts Quick Login */}
              <div className="pt-4 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-400 mb-2 font-medium">Quick Demo One-Click Login:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => switchAccount('02088888888', 'pass123')}
                    className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors"
                  >
                    <p className="text-xs font-bold text-white">Somphone</p>
                    <p className="text-[10px] text-rose-400">Client Role</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchAccount('02077777777', 'pass123')}
                    className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-colors"
                  >
                    <p className="text-xs font-bold text-white">Mina Keomany</p>
                    <p className="text-[10px] text-amber-400">Companion Role</p>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">I want to register as:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthRole('CLIENT')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      authRole === 'CLIENT'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Client (Booker)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthRole('COMPANION')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      authRole === 'COMPANION'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Companion (Talent)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="e.g. Alouny"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  placeholder="020xxxxxxxx"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Gender</label>
                  <select
                    value={authGender}
                    onChange={(e) => setAuthGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">City</label>
                  <select
                    value={authCity}
                    onChange={(e) => setAuthCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Vientiane">Vientiane</option>
                    <option value="Luang Prabang">Luang Prabang</option>
                    <option value="Pakse">Pakse</option>
                    <option value="Savannakhet">Savannakhet</option>
                  </select>
                </div>
              </div>

              {/* Bank QR Code Upload (Required) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Receiving Bank QR (QR ບັນຊີທະນາຄານຮັບເງິນ) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="file"
                  ref={authBankQrInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAuthBankQrFile(file);
                      setAuthBankQrPreview(URL.createObjectURL(file));
                    }
                  }}
                />

                {authBankQrPreview ? (
                  <div className="p-3 bg-slate-950 border border-emerald-500/50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={authBankQrPreview}
                        alt="Bank QR Preview"
                        className="w-14 h-14 object-contain rounded-lg bg-white p-1 shadow-sm shrink-0"
                      />
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Bank QR Attached</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">BCEL One / Lao QR</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => authBankQrInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition-colors shrink-0"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => authBankQrInputRef.current?.click()}
                    className="w-full p-4 bg-slate-950 hover:bg-slate-800/80 border-2 border-dashed border-slate-800 hover:border-rose-500/50 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer"
                  >
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 group-hover:scale-105 transition-all">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white">Upload Bank QR (BCEL One / Lao QR)</span>
                    <span className="text-[10px] text-slate-400">Required: Admin will scan this QR to pay out your funds when you withdraw</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/25 transition-all mt-3"
              >
                {authLoading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center selection:bg-rose-500 selection:text-white">
      {/* Mobile Device Frame Container (Max width 440px for true mobile app feel) */}
      <div className="w-full max-w-md bg-slate-900 border-x border-slate-800 flex flex-col min-h-screen shadow-2xl relative overflow-hidden">

        {/* Sleek App Toast Notification (Replaces Browser alert) */}
        {appToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
            <div
              className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-md border flex items-start gap-3 ${
                appToast.type === 'success'
                  ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-950/60'
                  : appToast.type === 'error'
                  ? 'bg-slate-900/95 border-rose-500/50 text-white shadow-rose-950/60'
                  : 'bg-slate-900/95 border-sky-500/50 text-white shadow-sky-950/60'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  appToast.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : appToast.type === 'error'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-sky-500/20 text-sky-400'
                }`}
              >
                {appToast.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : appToast.type === 'error' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {appToast.title && (
                  <h4 className="text-xs font-bold text-white tracking-wide mb-0.5">
                    {appToast.title}
                  </h4>
                )}
                <p className="text-xs text-slate-200 leading-relaxed break-words font-medium">
                  {appToast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAppToast(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

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
                    <div
                      onClick={() => handleOpenUserProfile(post.user.id)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={post.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                          alt={post.user.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700 group-hover:ring-2 group-hover:ring-rose-500 transition-all"
                        />
                        {onlineUserIds.includes(post.user.id) && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors flex items-center gap-1.5">
                          {post.user.name}
                          {post.user.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          {post.user.city} • {new Date(post.createdAt).toLocaleDateString()} • <span className="text-rose-400/90 font-semibold group-hover:underline">View Profile</span>
                        </p>
                      </div>
                    </div>

                    {post.caption && <p className="text-xs text-slate-200">{post.caption}</p>}

                    <div
                      onClick={() => setPhotoViewerUrl(post.mediaUrl)}
                      className="rounded-2xl overflow-hidden border border-slate-800 bg-black max-h-96 cursor-pointer group relative"
                    >
                      <img src={post.mediaUrl} alt="Post media" className="w-full object-cover group-hover:opacity-95 transition-opacity" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] font-semibold backdrop-blur">
                          Click to view photo
                        </span>
                      </div>
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
                <div className="h-[calc(100vh-140px)] overflow-y-auto no-scrollbar divide-y divide-slate-800/60">
                  {/* Header */}
                  <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex justify-between items-center sticky top-0 backdrop-blur z-10">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-rose-500" />
                        Messages
                      </h2>
                      <p className="text-xs text-slate-400">Direct chat with verified companions & clients</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{onlineUserIds.length} Online</span>
                    </div>
                  </div>

                  {/* 1. HORIZONTAL ONLINE FRIENDS / ACTIVE NOW STORY BAR */}
                  <div className="p-3.5 bg-slate-950/40">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Active Now ({chatContacts.filter((c) => c.isOnline).length})
                      </span>
                      <span className="text-[10px] text-slate-500">Tap to chat</span>
                    </div>
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                      {chatContacts.filter((c) => c.isOnline).length === 0 ? (
                        <div className="p-2.5 text-[11px] text-slate-500 italic bg-slate-900/30 rounded-xl w-full text-center">
                          No other users online right now. They will appear here when active!
                        </div>
                      ) : (
                        chatContacts.filter((c) => c.isOnline).map((user) => (
                          <div
                            key={user.id}
                            onClick={() => handleStartChatWithUser(user)}
                            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                          >
                            <div className="relative">
                              <img
                                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                                alt={user.name}
                                className="w-13 h-13 rounded-full object-cover border-2 border-emerald-500 p-0.5 group-hover:scale-105 transition-all shadow-md shadow-emerald-500/20"
                              />
                              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow" />
                            </div>
                            <span className="text-[10px] text-slate-300 font-semibold max-w-[56px] truncate group-hover:text-rose-400 text-center">
                              {user.name.split(' ')[0]}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 2. ALL FRIENDS & CLIENTS DIRECTORY */}
                  <div className="p-4 space-y-3 bg-slate-900/20">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-rose-400" />
                        All Friends & Contacts (ລາຍຊື່ທັງໝົດ)
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        {chatContacts.length} people
                      </span>
                    </div>

                    {/* Search & Filter Tabs */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search friends or clients by name, city..."
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                        />
                        {contactSearch && (
                          <button
                            type="button"
                            onClick={() => setContactSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {[
                          { id: 'ALL', label: `All (${chatContacts.length})` },
                          { id: 'ONLINE', label: `Online 🟢 (${chatContacts.filter((c) => c.isOnline).length})` },
                          { id: 'COMPANION', label: 'Companions 🌸' },
                          { id: 'CLIENT', label: 'Clients 💼' }
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setContactFilter(tab.id as any)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors shrink-0 ${
                              contactFilter === tab.id
                                ? 'bg-rose-500 border-rose-500 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contact Cards List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                      {chatContacts
                        .filter((c) => {
                          if (contactFilter === 'ONLINE' && !c.isOnline) return false;
                          if (contactFilter === 'COMPANION' && c.role !== 'COMPANION') return false;
                          if (contactFilter === 'CLIENT' && c.role !== 'CLIENT') return false;
                          if (contactSearch.trim()) {
                            const q = contactSearch.toLowerCase();
                            return c.name.toLowerCase().includes(q) || (c.city && c.city.toLowerCase().includes(q));
                          }
                          return true;
                        })
                        .length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-xs">
                          No users found matching your search.
                        </div>
                      ) : (
                        chatContacts
                          .filter((c) => {
                            if (contactFilter === 'ONLINE' && !c.isOnline) return false;
                            if (contactFilter === 'COMPANION' && c.role !== 'COMPANION') return false;
                            if (contactFilter === 'CLIENT' && c.role !== 'CLIENT') return false;
                            if (contactSearch.trim()) {
                              const q = contactSearch.toLowerCase();
                              return c.name.toLowerCase().includes(q) || (c.city && c.city.toLowerCase().includes(q));
                            }
                            return true;
                          })
                          .map((contact) => (
                            <div
                              key={contact.id}
                              className="p-2.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between gap-2.5 transition-all"
                            >
                              <div
                                onClick={() => handleOpenUserProfile(contact.id)}
                                className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                              >
                                <div className="relative shrink-0">
                                  <img
                                    src={contact.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                                    alt={contact.name}
                                    className="w-10 h-10 rounded-full object-cover border border-slate-800"
                                  />
                                  {contact.isOnline ? (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
                                  ) : (
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-900" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5 hover:text-rose-400">
                                    {contact.name}
                                    {contact.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                      contact.role === 'COMPANION'
                                        ? 'bg-rose-500/20 text-rose-300'
                                        : 'bg-blue-500/20 text-blue-300'
                                    }`}>
                                      {contact.role}
                                    </span>
                                    <span>{contact.city}</span>
                                    {contact.isOnline && (
                                      <span className="text-emerald-400 font-bold">Online</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenUserProfile(contact.id)}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
                                  title="View Facebook Profile"
                                >
                                  <UserIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartChatWithUser(contact)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-rose-500/20"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Chat</span>
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* 3. RECENT CONVERSATIONS */}
                  <div className="p-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                      Recent Conversations (ການສົນທະນາ)
                    </h3>
                    <div className="divide-y divide-slate-800/60">
                      {conversations.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-xs bg-slate-900/30 rounded-xl">
                          No previous chats yet. Click "Chat" on any friend above to start!
                        </div>
                      ) : (
                        conversations.map((c) => {
                          const isPartnerOnline = onlineUserIds.includes(c.partner.id);
                          return (
                            <div
                              key={c.partner.id}
                              onClick={() => setActiveChatUser(c.partner)}
                              className="py-3 flex items-center gap-3 hover:bg-slate-800/40 transition-colors cursor-pointer"
                            >
                              <div className="relative shrink-0">
                                <img
                                  src={c.partner.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                                  alt={c.partner.name}
                                  className="w-12 h-12 rounded-full object-cover border border-slate-700"
                                />
                                {isPartnerOnline && (
                                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
                                )}
                              </div>
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
                          );
                        })
                      )}
                    </div>
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
                        <ChevronRight className="w-5 h-5 rotate-180" />
                      </button>
                      <div
                        onClick={() => handleOpenUserProfile(activeChatUser.id)}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <div className="relative">
                          <img
                            src={activeChatUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                            alt={activeChatUser.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700 group-hover:ring-2 group-hover:ring-rose-500 transition-all"
                          />
                          {onlineUserIds.includes(activeChatUser.id) ? (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                          ) : (
                            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-slate-600 border border-slate-900" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors flex items-center gap-1">
                            {activeChatUser.name}
                          </h4>
                          <span className="text-[10px] flex items-center gap-1 font-semibold">
                            {onlineUserIds.includes(activeChatUser.id) ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Online now
                              </span>
                            ) : (
                              <span className="text-slate-500">Offline</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenUserProfile(activeChatUser.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1"
                        title="View Facebook Profile"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] hidden sm:inline">Profile</span>
                      </button>

                    {/* Button to Create Booking Offer directly from chat */}
                    <button
                      onClick={() => setOfferModal(true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 flex items-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Offer</span>
                    </button>
                  </div>
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

                      if (msg.messageType === 'IMAGE') {
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div
                              onClick={() => setPreviewImage(msg.content)}
                              className={`max-w-[75%] p-1.5 rounded-2xl overflow-hidden cursor-pointer shadow-md transition-transform hover:scale-[1.02] ${
                                isMe
                                  ? 'bg-rose-600 rounded-tr-none'
                                  : 'bg-slate-800 rounded-tl-none border border-slate-700'
                              }`}
                            >
                              <img
                                src={msg.content}
                                alt="Chat attachment"
                                className="rounded-xl max-h-56 max-w-full object-cover"
                              />
                            </div>
                            <span className="text-[9px] text-slate-500 mt-1 px-1">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      }

                      if (msg.messageType === 'AUDIO') {
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs ${
                                isMe
                                  ? 'bg-rose-600 text-white rounded-tr-none'
                                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1.5 opacity-90">
                                <Volume2 className="w-3.5 h-3.5 text-rose-200" />
                                <span className="font-semibold text-[11px]">Voice Note</span>
                              </div>
                              <audio
                                controls
                                src={msg.content}
                                className="w-48 h-8 rounded-lg"
                              />
                            </div>
                            <span className="text-[9px] text-slate-500 mt-1 px-1">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      }

                      if (msg.messageType === 'FILE') {
                        const filename = msg.content.split('/').pop() || 'Attachment';
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs ${
                                isMe
                                  ? 'bg-rose-600 text-white rounded-tr-none'
                                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                              }`}
                            >
                              <a
                                href={msg.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:underline text-white font-medium break-all"
                              >
                                <FileText className="w-4 h-4 shrink-0 text-amber-300" />
                                <span>{filename}</span>
                              </a>
                            </div>
                            <span className="text-[9px] text-slate-500 mt-1 px-1">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      }

                      if (msg.messageType === 'LOCATION') {
                        const lines = msg.content.split('\n');
                        const locationTitle = lines.length > 1 ? lines[0] : 'Shared Location';
                        const mapsUrl = lines.length > 1 ? lines[1] : lines[0];

                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-2.5 shadow-md ${
                                isMe
                                  ? 'bg-rose-600 text-white rounded-tr-none'
                                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-white/10 text-emerald-300 shrink-0">
                                  <MapPin className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-xs">{locationTitle}</div>
                                  <div className="text-[10px] opacity-80">Meetup location coordinates</div>
                                </div>
                              </div>
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold text-white transition-colors"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>Open Google Maps</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </a>
                            </div>
                            <span className="text-[9px] text-slate-500 mt-1 px-1">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
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
                  <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 relative">
                    {/* Hidden input for Image Gallery */}
                    <input
                      type="file"
                      ref={photoInputRef}
                      onChange={handleChatFileUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Hidden input for Camera */}
                    <input
                      type="file"
                      ref={cameraInputRef}
                      onChange={handleChatFileUpload}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                    />

                    {/* Hidden input for Documents/Files */}
                    <input
                      type="file"
                      ref={documentInputRef}
                      onChange={handleChatFileUpload}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      className="hidden"
                    />

                    {/* Attachment Options Action Menu */}
                    {attachMenuOpen && (
                      <div className="absolute bottom-16 left-3 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-2 z-40 w-56 flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2">
                        {/* 1. Image / Photo Gallery */}
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false);
                            photoInputRef.current?.click();
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">Image / Photo</div>
                            <div className="text-[10px] text-slate-400">Choose from gallery</div>
                          </div>
                        </button>

                        {/* 2. Camera */}
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false);
                            cameraInputRef.current?.click();
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Camera className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">Camera</div>
                            <div className="text-[10px] text-slate-400">Take a photo</div>
                          </div>
                        </button>

                        {/* 3. Document / File */}
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false);
                            documentInputRef.current?.click();
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">Document / File</div>
                            <div className="text-[10px] text-slate-400">PDF, DOC, sheets</div>
                          </div>
                        </button>

                        {/* 4. Location */}
                        <button
                          type="button"
                          onClick={() => {
                            setAttachMenuOpen(false);
                            setLocationModalOpen(true);
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">Location</div>
                            <div className="text-[10px] text-slate-400">Share GPS or meetup spot</div>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Paperclip Browse Button */}
                    <button
                      type="button"
                      onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                      className={`p-2.5 rounded-xl transition-colors ${
                        attachMenuOpen
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                      }`}
                      title="Attach photo, camera, file or location"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {isRecording ? (
                      /* Voice Recording Active Bar */
                      <div className="flex-1 flex items-center justify-between bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-1.5 animate-pulse">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                          <span className="text-xs font-semibold text-rose-300">
                            Recording {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={cancelRecording}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs"
                            title="Cancel recording"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1"
                            title="Send Voice Note"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Standard Text Input */
                      <>
                        <input
                          type="text"
                          value={msgInput}
                          onChange={(e) => setMsgInput(e.target.value)}
                          placeholder="Type message... (e.g. meet at rooftop?)"
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                        />
                        {msgInput.trim() ? (
                          <button
                            type="submit"
                            className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md transition-colors"
                            title="Send text message"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={startRecording}
                            className="p-2.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 rounded-xl shadow-md transition-colors"
                            title="Record voice message"
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
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
              {/* Facebook-style Cover & Profile Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {/* Cover Image */}
                <div className="h-32 sm:h-44 w-full relative overflow-hidden bg-slate-950 group">
                  <img
                    src={currentUser.coverImage || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80'}
                    alt="My Cover Photo"
                    onClick={() => setPhotoViewerUrl(currentUser.coverImage || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80')}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                    title="Click to view cover photo (ກົດເບິ່ງຮູບໜ້າປົກ)"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-black/20 pointer-events-none" />
                  
                  {/* Change Cover Button */}
                  <button
                    type="button"
                    onClick={() => profileCoverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="absolute bottom-2 right-2 px-2.5 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 text-white backdrop-blur text-xs font-semibold flex items-center gap-1.5 border border-white/20 shadow-lg cursor-pointer transition-colors"
                    title="Change Cover Photo (ປ່ຽນຮູບໜ້າປົກ)"
                  >
                    <Camera className="w-3.5 h-3.5 text-rose-400" />
                    <span>{uploadingCover ? 'Uploading...' : 'Edit Cover (ປ່ຽນຮູບປົກ)'}</span>
                  </button>
                </div>

                {/* Avatar and Details */}
                <div className="px-4 pb-4 -mt-10 sm:-mt-12 relative">
                  <div className="flex justify-between items-end">
                    <div className="relative group">
                      <img
                        src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                        alt={currentUser.name}
                        onClick={() => setPhotoViewerUrl(currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400')}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-slate-900 shadow-xl cursor-pointer hover:opacity-90 transition-opacity"
                        title="Click to view profile picture (ກົດເບິ່ງຮູບໂປຣໄຟລ໌)"
                      />
                      <button
                        type="button"
                        onClick={() => profileAvatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute bottom-0 right-0 p-1.5 bg-rose-500 hover:bg-rose-600 rounded-full text-white shadow-lg border-2 border-slate-900 cursor-pointer"
                        title="Change Profile Picture (ປ່ຽນຮູບໂປຣໄຟລ໌)"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenUserProfile(currentUser.id)}
                        className="px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-500/25 transition-all"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Timeline (ເບິ່ງໂປຣໄຟລ໌ Facebook)</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <h3 className="text-lg font-extrabold text-white flex items-center gap-1.5">
                      {currentUser.name}
                      {currentUser.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-xs text-slate-400">{currentUser.phone}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                        Role: {currentUser.role}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {currentUser.city || 'Vientiane'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

                {/* Wallet Balance Card */}
                <div className="mt-5 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="flex justify-between items-center">
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
                  {currentUser.walletId && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">Wallet ID (ໄອດີກະເປົາ):</span>
                      <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-semibold">
                        <span className="select-all">{currentUser.walletId}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentUser.walletId) {
                              navigator.clipboard.writeText(currentUser.walletId);
                              setCopiedId(true);
                              setTimeout(() => setCopiedId(false), 2000);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-white transition-colors"
                          title="Copy Wallet ID"
                        >
                          {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3 Wallet Action Buttons */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      loadTopupInstructions();
                      setTopupModal(true);
                    }}
                    className="p-3 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-600/20 flex flex-col items-center justify-center gap-1.5 transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold">Top-Up</span>
                  </button>

                  <button
                    onClick={() => {
                      setTransferModal(true);
                    }}
                    className="p-3 bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white rounded-xl shadow-lg shadow-purple-600/20 flex flex-col items-center justify-center gap-1.5 transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold">QR Transfer</span>
                  </button>

                  <button
                    onClick={() => {
                      setWithdrawModal(true);
                    }}
                    className="p-3 bg-gradient-to-br from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white rounded-xl shadow-lg shadow-amber-600/20 flex flex-col items-center justify-center gap-1.5 transition-all group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold">Withdraw</span>
                  </button>
                </div>

              {/* Wallet Transaction History List */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span>Recent Wallet Activity</span>
                  </h4>
                  <button
                    onClick={loadWalletInfo}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    Refresh
                  </button>
                </div>

                {walletTransactions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 text-center">No wallet transactions yet</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                    {walletTransactions.map((tx) => {
                      const isPositive = tx.type === 'TOPUP' || tx.type === 'TRANSFER_IN';
                      return (
                        <div key={tx.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              tx.type === 'TOPUP' ? 'bg-emerald-500/20 text-emerald-400' :
                              tx.type === 'WITHDRAW' ? 'bg-amber-500/20 text-amber-400' :
                              tx.type === 'TRANSFER_IN' ? 'bg-indigo-500/20 text-indigo-400' :
                              'bg-rose-500/20 text-rose-400'
                            }`}>
                              {tx.type === 'TOPUP' ? <ArrowDownLeft className="w-3.5 h-3.5" /> :
                               tx.type === 'WITHDRAW' ? <ArrowUpRight className="w-3.5 h-3.5" /> :
                               <ArrowRightLeft className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="font-semibold text-white">
                                {tx.type === 'TOPUP' ? 'Wallet Top-Up' :
                                 tx.type === 'WITHDRAW' ? `Withdraw (${tx.bankName || 'Bank'})` :
                                 tx.type === 'TRANSFER_IN' ? `Received from ${tx.accountName || 'User'}` :
                                 `Sent to ${tx.accountName || 'User'}`}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isPositive ? '+' : '-'}{tx.amount.toLocaleString()} LAK
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                              tx.status === 'APPROVED' || tx.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                              tx.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300' :
                              'bg-rose-500/20 text-rose-300'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

              {/* Log out Button */}
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-rose-400 rounded-xl text-xs font-bold border border-rose-500/30 flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Account</span>
              </button>
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

        {/* HIDDEN FILE INPUT FOR CHANGING PROFILE AVATAR */}
        <input
          type="file"
          ref={profileAvatarInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        {/* HIDDEN FILE INPUT FOR CHANGING PROFILE COVER PHOTO */}
        <input
          type="file"
          ref={profileCoverInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleCoverChange}
        />


        {/* FACEBOOK-STYLE USER PROFILE MODAL */}
        {selectedUserProfile && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto no-scrollbar shadow-2xl relative">
              
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedUserProfile(null)}
                className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur transition-colors"
                title="Close Profile"
              >
                <X className="w-5 h-5" />
              </button>

              {/* 1. Facebook Cover Picture */}
              <div className="h-44 sm:h-52 w-full relative overflow-hidden bg-slate-950 group">
                <img
                  src={selectedUserProfile.coverImage || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80'}
                  alt="Cover Photo"
                  onClick={() => setPhotoViewerUrl(selectedUserProfile.coverImage || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80')}
                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-black/30 pointer-events-none" />

                {/* Change Cover Photo Button if own profile */}
                {currentUser?.id === selectedUserProfile.id && (
                  <button
                    type="button"
                    onClick={() => profileCoverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur text-xs font-semibold flex items-center gap-1.5 border border-white/20 shadow-lg cursor-pointer transition-colors"
                    title="Change Cover Photo (ປ່ຽນຮູບໜ້າປົກ)"
                  >
                    <Camera className="w-4 h-4 text-rose-400" />
                    <span>{uploadingCover ? 'Uploading...' : 'Edit Cover (ປ່ຽນຮູບປົກ)'}</span>
                  </button>
                )}
              </div>

              {/* 2. Avatar Overlapping Cover */}
              <div className="px-5 pb-5 -mt-16 sm:-mt-20 relative">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div className="relative group self-start">
                    <img
                      src={selectedUserProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}
                      alt={selectedUserProfile.name}
                      onClick={() => setPhotoViewerUrl(selectedUserProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600')}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-slate-900 shadow-2xl cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    {/* Online status indicator */}
                    {onlineUserIds.includes(selectedUserProfile.id) && (
                      <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-400 border-3 border-slate-900 shadow" title="Online" />
                    )}

                    {/* Change Profile Pic Button if own profile */}
                    {currentUser?.id === selectedUserProfile.id && (
                      <button
                        type="button"
                        onClick={() => profileAvatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute bottom-1 right-1 p-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white border-2 border-slate-900 shadow-lg cursor-pointer"
                        title="Change Profile Picture (ປ່ຽນຮູບໂປຣໄຟລ໌)"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Facebook-style Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentUser?.id !== selectedUserProfile.id ? (
                      <>
                        {/* Add Friend Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleFriend(selectedUserProfile.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ${
                            selectedUserProfile.isFriend
                              ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                          }`}
                        >
                          {selectedUserProfile.isFriend ? (
                            <>
                              <UserCheck className="w-4 h-4" />
                              <span>Friends (ໝູ່ເພື່ອນ)</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              <span>Add Friend (ເພີ່ມໝູ່)</span>
                            </>
                          )}
                        </button>

                        {/* Message Button */}
                        <button
                          type="button"
                          onClick={() => handleStartChatWithUser(selectedUserProfile)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                        >
                          <Send className="w-3.5 h-3.5 text-rose-400" />
                          <span>Message (ສົ່ງຂໍ້ຄວາມ)</span>
                        </button>

                        {/* Optional Book Companion Button */}
                        {selectedUserProfile.role === 'COMPANION' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserProfile(null);
                              const found = companions.find((c) => c.userId === selectedUserProfile.id);
                              if (found) setSelectedCompanion(found);
                            }}
                            className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-rose-500/25"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Book Date</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => profileAvatarInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-500/25 transition-all"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{uploadingAvatar ? 'Uploading...' : 'Edit Profile Pic'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => profileCoverInputRef.current?.click()}
                          disabled={uploadingCover}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
                          <span>Edit Cover</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Name, Badges & Friends Count */}
                <div className="mt-3 space-y-1">
                  <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                    {selectedUserProfile.name}
                    {selectedUserProfile.isVerified && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                  </h3>

                  {/* Facebook-style Friends count */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                      <Users className="w-4 h-4" />
                      {selectedUserProfile.friendCount ?? 0} friends (ໝູ່ເພື່ອນ)
                    </span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedUserProfile.role === 'COMPANION'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {selectedUserProfile.role === 'COMPANION' ? 'Companion 🌸' : 'Client 💼'}
                    </span>
                    {onlineUserIds.includes(selectedUserProfile.id) && (
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Online Now
                      </span>
                    )}
                  </div>

                  {selectedUserProfile.bio && (
                    <p className="text-xs text-slate-300 pt-1 leading-relaxed">
                      {selectedUserProfile.bio}
                    </p>
                  )}
                </div>

                {/* Facebook Details / Intro (Clean Facebook Style - No Wallet ID / DB fields) */}
                <div className="mt-3.5 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Lives in <strong className="text-slate-200">{selectedUserProfile.city || 'Vientiane, Laos'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Joined <strong className="text-slate-200">{new Date(selectedUserProfile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Followed by <strong className="text-slate-200">{selectedUserProfile.friendCount ? selectedUserProfile.friendCount * 3 + 18 : 36} people</strong></span>
                  </div>
                </div>

                {/* 3. Facebook Timeline Posts Section */}
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-rose-400" />
                      Posts & Media ({selectedUserProfile.posts?.length || 0})
                    </h4>
                    <span className="text-[10px] text-slate-500">Timeline (ໂພສ)</span>
                  </div>

                  {(!selectedUserProfile.posts || selectedUserProfile.posts.length === 0) ? (
                    <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/60 border border-slate-800/60 rounded-2xl">
                      No posts shared by this user yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedUserProfile.posts.map((p) => (
                        <div key={p.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 shadow-lg">
                          {/* Post Author Header */}
                          <div className="flex items-center gap-2.5">
                            <img
                              src={selectedUserProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={selectedUserProfile.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-800"
                            />
                            <div>
                              <span className="text-xs font-bold text-white block">{selectedUserProfile.name}</span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(p.createdAt).toLocaleDateString()} • {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {/* Caption */}
                          {p.caption && (
                            <p className="text-xs text-slate-200 leading-relaxed">{p.caption}</p>
                          )}

                          {/* Media Image */}
                          {p.mediaUrl && (
                            <div
                              onClick={() => setPhotoViewerUrl(p.mediaUrl)}
                              className="rounded-xl overflow-hidden bg-black max-h-80 cursor-pointer group relative"
                            >
                              <img
                                src={p.mediaUrl}
                                alt="Post media"
                                className="w-full object-cover group-hover:opacity-95 transition-opacity"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] font-semibold backdrop-blur">
                                  Click to view full photo
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Post Footer */}
                          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-900">
                            <button
                              type="button"
                              onClick={async () => {
                                await authFetch(`/api/posts/${p.id}/like`, { method: 'POST' });
                                handleOpenUserProfile(selectedUserProfile.id);
                              }}
                              className="flex items-center gap-1.5 hover:text-rose-400 transition-colors"
                            >
                              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                              <span>{p.likesCount}</span>
                            </button>
                            <span className="text-[10px] text-slate-500">
                              {p.comments?.length || 0} comments
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* MODAL 6: IMAGE PREVIEW LIGHTBOX */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-sm w-full max-h-[85vh] flex flex-col items-center">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 p-1.5 text-white/80 hover:text-white bg-slate-800/80 rounded-full"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewImage}
                alt="Preview"
                className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* MODAL 7: SHARE LOCATION / MEETUP VENUE */}
        {locationModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Share Location / Meetup Spot</span>
                </h3>
                <button type="button" onClick={() => setLocationModalOpen(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Fast Option 1: Live GPS Location */}
              <button
                type="button"
                onClick={handleGetLiveLocation}
                className="w-full p-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Navigation className="w-4 h-4" />
                <span>Send My Current GPS Location</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-2 text-[10px] text-slate-500 uppercase tracking-wider">or pick a venue</span>
              </div>

              {/* Popular Vientiane Meetup Spots */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                {[
                  { name: 'Senglao Lounge & Bar', address: 'Vientiane Capital', url: 'https://www.google.com/maps?q=17.9757,102.6331' },
                  { name: 'Mekong Riverside Night Market', address: 'Fa Ngum Rd, Vientiane', url: 'https://www.google.com/maps?q=17.9620,102.6070' },
                  { name: 'That Dam Wine House', address: 'Chantabouly, Vientiane', url: 'https://www.google.com/maps?q=17.9676,102.6105' },
                  { name: 'Joma Bakery Cafe Nam Phou', address: 'Nam Phou Fountain, Vientiane', url: 'https://www.google.com/maps?q=17.9644,102.6083' },
                ].map((spot) => (
                  <button
                    key={spot.name}
                    type="button"
                    onClick={() => handleSendLocation(spot.url, `📍 ${spot.name} (${spot.address})`)}
                    className="w-full p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white">{spot.name}</div>
                      <div className="text-[10px] text-slate-400">{spot.address}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                ))}
              </div>

              {/* Custom Location input */}
              <div className="space-y-2 pt-1 border-t border-slate-800">
                <input
                  type="text"
                  value={customLocationName}
                  onChange={(e) => setCustomLocationName(e.target.value)}
                  placeholder="Or enter custom place name..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
                {customLocationName.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const encoded = encodeURIComponent(customLocationName.trim() + ' Vientiane Laos');
                      handleSendLocation(`https://www.google.com/maps/search/?api=1&query=${encoded}`, `📍 ${customLocationName.trim()}`);
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
                  >
                    Send "{customLocationName.trim()}"
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 8: IN-APP WALLET TOP-UP */}
        {topupModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl my-auto">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Top-Up Wallet</h3>
                    <p className="text-[10px] text-slate-400">ເຕີມເງິນເຂົ້າກະເປົາຜ່ານ BCEL One / QR</p>
                  </div>
                </div>
                <button type="button" onClick={() => setTopupModal(false)}>
                  <X className="w-5 h-5 text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Bank Transfer Instructions */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Bank:</span>
                  <span className="font-bold text-white">BCEL One / LAPNet</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Account No:</span>
                  <span className="font-mono font-bold text-emerald-400">010-12-00-01234567-001</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Account Name:</span>
                  <span className="font-semibold text-white">COMPANION PLATFORM CO., LTD</span>
                </div>
              </div>

              {/* QR Code for Top-up */}
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LAO_QR_TOPUP_${currentUser?.phone || 'WALLET'}_${topupAmount}`}
                  alt="Top-up Bank QR"
                  className="w-40 h-40 object-contain"
                />
                <span className="text-[10px] text-slate-700 font-semibold mt-1">
                  Scan to transfer {Number(topupAmount || 0).toLocaleString()} LAK
                </span>
              </div>

              <form onSubmit={handleTopupSubmit} noValidate className="space-y-3">
                {/* Quick Amount Selector */}
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Select Amount (LAK)</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['10000', '50000', '100000', '200000', '500000', '1000000'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTopupAmount(amt)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors ${
                          topupAmount === amt
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {(Number(amt) / 1000).toLocaleString()}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount input */}
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">Custom Amount (LAK)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Enter any amount (e.g. 10000)"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Upload Slip */}
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                    Upload Bank Transfer Slip (ໃບໂອນເງິນ) *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setTopupSlipFile(e.target.files?.[0] || null)}
                    className="w-full text-slate-300 text-[11px] file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={topupLoading || !topupSlipFile}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Upload className="w-4 h-4" />
                  <span>{topupLoading ? 'Submitting Slip...' : 'Submit Slip for Admin Review'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 9: REAL-TIME WALLET TRANSFER (SEND / RECEIVE QR) */}
        {transferModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl my-auto">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Wallet Transfer</h3>
                    <p className="text-[10px] text-slate-400">ໂອນເງິນ / ຮັບເງິນ Realtime ດ້ວຍ QR</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    stopCameraScanner();
                    setTransferStep('scan');
                    setRecipientInfo(null);
                    setInquiryError(null);
                    setTransferModal(false);
                  }}
                >
                  <X className="w-5 h-5 text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Sub-tabs: Send vs My QR */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setTransferTab('send');
                    setTransferStep('scan');
                    setRecipientInfo(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    transferTab === 'send'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Send Money (ໂອນເງິນ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCameraScanner();
                    setTransferTab('myqr');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    transferTab === 'myqr'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Receive / My QR (ຮັບເງິນ)
                </button>
              </div>

              {transferTab === 'send' ? (
                <div className="space-y-3">
                  {/* STEP 1: SCAN QR / ENTER RECIPIENT INQUIRY */}
                  {transferStep === 'scan' ? (
                    <div className="space-y-3">
                      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-slate-400">Your Balance:</span>
                        <span className="font-bold text-white">{(currentUser?.walletBalance || 0).toLocaleString()} LAK</span>
                      </div>

                      {/* Camera Scanner View */}
                      {isScanningCamera ? (
                        <div className="relative rounded-2xl overflow-hidden border-2 border-blue-500 bg-black aspect-square flex flex-col items-center justify-center shadow-inner">
                          <video ref={scannerVideoRef} className="w-full h-full object-cover" />
                          <div className="absolute inset-8 border-2 border-dashed border-blue-400/80 rounded-xl pointer-events-none animate-pulse" />
                          <button
                            type="button"
                            onClick={stopCameraScanner}
                            className="absolute bottom-3 px-4 py-1.5 bg-black/75 hover:bg-black text-white text-[11px] rounded-full font-bold border border-slate-700 shadow-md"
                          >
                            Stop Camera
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {/* Live Camera Scanner Button */}
                          <button
                            type="button"
                            onClick={startCameraScanner}
                            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
                          >
                            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500/20">
                              <ScanLine className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] font-bold text-white">Scan Wallet QR</span>
                            <span className="text-[9px] text-slate-400">Scan via camera</span>
                          </button>

                          {/* Upload QR Image from phone */}
                          <button
                            type="button"
                            onClick={() => qrFileInputRef.current?.click()}
                            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center transition-all group"
                          >
                            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:bg-purple-500/20">
                              <Upload className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] font-bold text-white">Upload QR Photo</span>
                            <span className="text-[9px] text-slate-400">Select from gallery</span>
                          </button>
                          <input
                            type="file"
                            ref={qrFileInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleQrImageUpload}
                          />
                        </div>
                      )}

                      <div className="relative flex items-center justify-center">
                        <div className="border-t border-slate-800 w-full" />
                        <span className="bg-slate-900 px-2 text-[10px] text-slate-500 uppercase tracking-wider">
                          or enter wallet ID
                        </span>
                      </div>

                      {/* Manual Input & Inquiry */}
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Recipient Wallet ID (e.g. CPW-9A7F-83D2-E40B)"
                          value={transferTarget}
                          onChange={(e) => {
                            setTransferTarget(e.target.value);
                            setInquiryError(null);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                        />

                        {inquiryError && (
                          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{inquiryError}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={inquiryLoading || !transferTarget.trim()}
                          onClick={() => handleSendInquiry(transferTarget)}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{inquiryLoading ? 'Verifying Wallet ID...' : 'Verify Wallet ID (ກວດສອບ)'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* STEP 2: RECIPIENT VERIFIED & ENTER AMOUNT */
                    <form onSubmit={handleTransferSubmit} noValidate className="space-y-3">
                      {/* Recipient Card */}
                      <div className="p-3 bg-slate-950 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={recipientInfo?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt="Recipient"
                            className="w-10 h-10 rounded-full object-cover border border-emerald-500/40"
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-white text-xs">{recipientInfo?.name}</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono font-bold">{recipientInfo?.walletId}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTransferStep('scan');
                            setRecipientInfo(null);
                          }}
                          className="text-[10px] font-bold text-blue-400 hover:underline px-2 py-1 bg-slate-800 rounded-lg"
                        >
                          Change
                        </button>
                      </div>

                      <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-slate-400">Available:</span>
                        <span className="font-bold text-white">{(currentUser?.walletBalance || 0).toLocaleString()} LAK</span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                          Transfer Amount (LAK) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          placeholder="Enter any amount (e.g. 10000)"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          required
                          autoFocus
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Quick Preset Buttons */}
                      <div className="flex gap-1.5">
                        {['10000', '50000', '100000', '200000', '500000'].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setTransferAmount(amt)}
                            className="flex-1 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300"
                          >
                            {(Number(amt) / 1000).toLocaleString()}k
                          </button>
                        ))}
                      </div>

                      {/* Transfer Memo */}
                      <div>
                        <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                          Transfer Note (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Dinner, Gift, Booking bonus"
                          value={transferNote}
                          onChange={(e) => setTransferNote(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={transferLoading || Number(transferAmount) <= 0}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        <span>{transferLoading ? 'Processing Transfer...' : `Confirm Transfer (${Number(transferAmount || 0).toLocaleString()} LAK)`}</span>
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* My Wallet QR Code */
                <div className="space-y-3 flex flex-col items-center text-center">
                  <div className="p-3 bg-white rounded-2xl shadow-xl flex flex-col items-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=WALLET:${currentUser?.walletId || 'CPW-WALLET'}`}
                      alt="My Wallet QR"
                      className="w-44 h-44 object-contain"
                    />
                    <span className="text-[11px] text-slate-800 font-bold mt-1.5">
                      {currentUser?.name || 'Companion User'}
                    </span>
                  </div>

                  <div className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="text-left overflow-hidden mr-2">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">Wallet ID (ໄອດີກະເປົາ)</span>
                      <span className="text-emerald-400 font-mono font-bold text-xs truncate block select-all">
                        {currentUser?.walletId || 'CPW-GENERATING...'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentUser?.walletId || '');
                        setCopiedId(true);
                        setTimeout(() => setCopiedId(false), 2000);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId ? 'Copied' : 'Copy Wallet ID'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Share your unique Wallet ID or QR code to receive real-time funds securely without sharing your phone number.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 10: IN-APP WALLET WITHDRAWAL */}
        {withdrawModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl my-auto">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Withdraw Funds</h3>
                    <p className="text-[10px] text-slate-400">ຖອນເງິນອອກເຂົ້າບັນຊີທະນາຄານ</p>
                  </div>
                </div>
                <button type="button" onClick={() => setWithdrawModal(false)}>
                  <X className="w-5 h-5 text-slate-400 hover:text-white" />
                </button>
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400">Available to Withdraw:</span>
                <span className="font-bold text-amber-400">{(currentUser?.walletBalance || 0).toLocaleString()} LAK</span>
              </div>

              <form onSubmit={handleWithdrawSubmit} noValidate className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] text-slate-400 font-semibold">
                      Withdrawal Amount (LAK)
                    </label>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(currentUser?.walletBalance || 0))}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold"
                    >
                      Withdraw All (ຖອນທັງໝົດ)
                    </button>
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Enter any amount (e.g. 10000)"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  />

                  {/* Quick Select Chips */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {['10000', '50000', '100000', '500000'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setWithdrawAmount(amt)}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                          withdrawAmount === amt
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {(Number(amt) / 1000).toLocaleString()}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Receiving Bank QR (Displayed directly below Amount) */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[11px] font-bold text-white block">
                        Receiving Bank QR (QR ບັນຊີທະນາຄານຮັບເງິນ)
                      </span>
                      <span className="text-[9px] text-slate-400">
                        Admin will scan this QR to transfer your funds
                      </span>
                    </div>
                    {(withdrawQrPreview || currentUser?.bankQrUrl) && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={withdrawQrInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setWithdrawQrFile(file);
                        setWithdrawQrPreview(URL.createObjectURL(file));
                      }
                    }}
                  />

                  {withdrawQrPreview || currentUser?.bankQrUrl ? (
                    <div className="text-center pt-1">
                      <div className="p-2 bg-white rounded-xl shadow-lg w-36 h-36 mx-auto flex items-center justify-center">
                        <img
                          src={withdrawQrPreview || currentUser?.bankQrUrl || ''}
                          alt="Receiving Bank QR"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => withdrawQrInputRef.current?.click()}
                        className="mt-2 text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center justify-center gap-1 mx-auto transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Change Bank QR</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => withdrawQrInputRef.current?.click()}
                      className="w-full p-4 bg-slate-900 hover:bg-slate-800/80 border-2 border-dashed border-amber-500/40 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-white">Upload Bank QR (BCEL One / Lao QR)</span>
                      <span className="text-[10px] text-slate-400">Attach QR so admin can transfer money</span>
                    </button>
                  )}
                </div>

                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-300">
                  ⚠️ Admin will scan your Bank QR and transfer funds directly within 5-15 minutes. The requested amount is held in escrow immediately.
                </div>

                <button
                  type="submit"
                  disabled={withdrawLoading || Number(withdrawAmount) <= 0 || (!currentUser?.bankQrUrl && !withdrawQrFile)}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{withdrawLoading ? 'Submitting Request...' : 'Request Withdrawal (ຖອນເງິນ)'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 11: REAL-TIME WALLET TRANSFER E-SLIP */}
        {eslipModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative my-auto">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setEslipModal(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Success Badge & Header */}
              <div className="text-center pt-2">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">COMPANION PLATFORM</h3>
                <p className="text-[11px] text-emerald-400 font-semibold">ໂອນເງິນສຳເລັດ / Transfer Successful</p>
              </div>

              {/* Big Amount Box */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-center shadow-inner">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                  Transfer Amount (ຈຳນວນເງິນໂອນ)
                </span>
                <div className="text-2xl font-black text-white tracking-tight">
                  {eslipModal.amount.toLocaleString()} <span className="text-xs font-normal text-slate-400">LAK</span>
                </div>
              </div>

              {/* Transaction Details Card */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Ref ID (ເລກອ້າງອີງ):</span>
                  <span className="font-mono font-bold text-sky-400 select-all">{eslipModal.referenceId}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Date & Time:</span>
                  <span className="text-slate-300 font-medium">
                    {new Date(eslipModal.dateTime).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5 space-y-2.5">
                  {/* Sender / Debit */}
                  <div className="flex justify-between items-start text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">ຜູ້ໂອນ (Debit Account):</span>
                      <span className="font-bold text-white text-xs">{eslipModal.debit.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[9px]">Wallet ID / Phone</span>
                      <span className="font-mono text-slate-300 text-[11px]">{eslipModal.debit.walletId}</span>
                    </div>
                  </div>

                  {/* Receiver / Credit */}
                  <div className="flex justify-between items-start text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">ຜູ້ຮັບ (Credit Account):</span>
                      <span className="font-bold text-emerald-400 text-xs">{eslipModal.credit.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[9px]">Wallet ID / Phone</span>
                      <span className="font-mono text-emerald-400 text-[11px] font-bold">{eslipModal.credit.walletId}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Transfer Fee (ຄ່າທຳນຽມ):</span>
                  <span className="text-emerald-400 font-semibold">0 LAK (Free)</span>
                </div>
              </div>

              {/* QR Verification Seal */}
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] text-slate-400">Official companion e-Slip verified</span>
                </div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=SLIP:${eslipModal.referenceId}`}
                  alt="Slip QR"
                  className="w-8 h-8 rounded bg-white p-0.5"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveEslip(eslipModal)}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.99]"
                >
                  <Download className="w-4 h-4" />
                  <span>Save e-Slip to Phone (ບັນທຶກໃບຮັບເງິນ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEslipModal(null)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Done (ສຳເລັດ)
                </button>
              </div>

              {/* Toast message when saved */}
              {eslipSavedToast && (
                <div className="p-2 bg-emerald-600 text-white rounded-xl text-center text-xs font-bold shadow-lg animate-in fade-in flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>e-Slip saved to your device gallery!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FULL SCREEN PHOTO VIEWER / LIGHTBOX (RENDERED AT ROOT WITH HIGHEST Z-INDEX ON TOP OF ALL MODALS) */}
        {photoViewerUrl && (
          <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 animate-in fade-in">
            {/* Top Bar */}
            <div className="w-full max-w-4xl flex items-center justify-between py-2 px-1 z-20">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
                  <span>Photo Preview (ເບິ່ງຮູບເຕັມ)</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Change photo button if own photo or profile */}
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      if (photoViewerUrl.includes('cover') || photoViewerUrl === currentUser.coverImage || selectedUserProfile?.coverImage === photoViewerUrl) {
                        profileCoverInputRef.current?.click();
                      } else {
                        profileAvatarInputRef.current?.click();
                      }
                    }}
                    disabled={uploadingAvatar || uploadingCover}
                    className="px-3.5 py-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-500/30 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{uploadingAvatar || uploadingCover ? 'Uploading...' : 'Change Photo (ປ່ຽນຮູບ)'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPhotoViewerUrl(null)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  title="Close (ປິດ)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Preview Center */}
            <div
              onClick={() => setPhotoViewerUrl(null)}
              className="w-full flex-1 flex items-center justify-center cursor-zoom-out p-2 overflow-hidden"
            >
              <img
                src={photoViewerUrl}
                alt="Full preview"
                onClick={(e) => e.stopPropagation()}
                className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl cursor-default transition-transform"
              />
            </div>

            {/* Bottom Tip */}
            <div className="text-center pb-2">
              <span className="text-[11px] text-slate-400 bg-black/60 px-3 py-1 rounded-full backdrop-blur">
                Tap anywhere outside or press (X) to close
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


