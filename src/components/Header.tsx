import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Home,
  Volume2,
  VolumeX,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  User,
  KeyRound,
  Smartphone,
  CheckCircle2,
  X,
  Sparkles,
  RotateCcw,
  Globe,
  Navigation,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { soundAlert } from '../utils/audioAlarm';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from '../context/LocationContext';


interface HeaderProps {
  currentRole: 'resident' | 'kagawad';
  onRoleChange: (role: 'resident' | 'kagawad') => void;
  pendingCount: number;
  onScreenCalibrate?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  pendingCount,
  onScreenCalibrate,
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [calibrateToast, setCalibrateToast] = useState<string | null>(null);
  const [gpsToast, setGpsToast] = useState<string | null>(null);

  const {
    coords,
    isEnabled,
    status: gpsStatus,
    requestLocation,
    refreshLocation,
    resetLocation,
  } = useLocation();

  const handleMenuRefreshLocation = async () => {
    soundAlert.playChime();
    const ok = await refreshLocation();
    if (ok) {
      setGpsToast(language === 'tl' ? 'Na-refresh ang GPS Lokasyon!' : 'GPS Location Refreshed!');
    } else {
      setGpsToast(language === 'tl' ? 'Pakitingnan ang GPS access ng device.' : 'Please check device GPS access.');
    }
    setTimeout(() => setGpsToast(null), 3000);
  };

  const handleMenuResetLocation = () => {
    resetLocation();
    soundAlert.playChime();
    setGpsToast(language === 'tl' ? 'Nai-reset ang GPS (Naka-blanko na).' : 'GPS Cleared (Blank).');
    setTimeout(() => setGpsToast(null), 3000);
  };

  const handleMenuRequestLocation = async () => {
    soundAlert.playChime();
    const ok = await requestLocation();
    if (ok) {
      setGpsToast(language === 'tl' ? 'Na-activate ang GPS Lokasyon!' : 'GPS Location Activated!');
    } else {
      setGpsToast(language === 'tl' ? 'Hindi pinahintulutan ang GPS access.' : 'GPS access was not allowed.');
    }
    setTimeout(() => setGpsToast(null), 3000);
  };

  const [activeAccountLabel, setActiveAccountLabel] = useState<string>(() => {
    try {
      return localStorage.getItem('pulse_account_label') || localStorage.getItem('trash_account_label') || 'Barangay Kagawad';
    } catch {
      return 'Barangay Kagawad';
    }
  });


  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handlePromptPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundAlert.enabled = next;
    if (next) soundAlert.playChime();
  };

  const headerNavRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  const handleNavMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    if (!headerNavRef.current) return;
    isMouseDownRef.current = true;
    startXRef.current = e.pageX - headerNavRef.current.offsetLeft;
    scrollLeftStartRef.current = headerNavRef.current.scrollLeft;
  };

  const handleNavMouseLeave = () => {
    isMouseDownRef.current = false;
  };

  const handleNavMouseUp = () => {
    isMouseDownRef.current = false;
  };

  const handleNavMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !headerNavRef.current) return;
    e.preventDefault();
    const x = e.pageX - headerNavRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    headerNavRef.current.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleNavWheel = (e: React.WheelEvent) => {
    if (e.deltaY !== 0 && headerNavRef.current) {
      headerNavRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollNavLeft = () => {
    headerNavRef.current?.scrollBy({ left: -240, behavior: 'smooth' });
  };

  const scrollNavRight = () => {
    headerNavRef.current?.scrollBy({ left: 240, behavior: 'smooth' });
  };

  const handleCalibrateScreen = () => {
    try {
      const width = window.innerWidth || document.documentElement.clientWidth;
      const height = window.innerHeight || document.documentElement.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      window.dispatchEvent(new Event('resize'));
      if (onScreenCalibrate) {
        onScreenCalibrate();
      }
      soundAlert.playChime();
      setCalibrateToast(`${t.header.calibrateToast} (${width}x${height}px)`);
      setTimeout(() => setCalibrateToast(null), 3500);
    } catch {
      setCalibrateToast(t.header.calibrateToast);
      setTimeout(() => setCalibrateToast(null), 3000);
    }
  };

  const handleKagawadButtonClick = () => {
    if (currentRole === 'kagawad') {
      return;
    }
    const isAuth =
      localStorage.getItem('pulse_kagawad_auth') === 'true' ||
      localStorage.getItem('trash_kagawad_auth') === 'true' ||
      localStorage.getItem('draw_kagawad_auth') === 'true';
    if (isAuth) {
      onRoleChange('kagawad');
      soundAlert.playChime();
      return;
    }
    setUsername('');
    setPassword('');
    setLoginError('');
    setShowPassword(false);
    setShowLoginModal(true);
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetOldPass, setResetOldPass] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setLoginError(t.header.enterCredentials);
      return;
    }

    const currentKagawadPass =
      localStorage.getItem('pulse_kagawad_custom_password') ||
      localStorage.getItem('trash_kagawad_custom_password') ||
      'Kagawad@Cavite2026#Brgy41!';

    const isPasswordValid =
      cleanPass === currentKagawadPass ||
      cleanPass === 'Kagawad@Cavite2026#Brgy41!' ||
      cleanPass === 'trashcavite2026' ||
      cleanPass === 'PulseAdmin#2026$Secure!' ||
      cleanPass === 'TrashAdmin#2026$Secure!';

    if (isPasswordValid) {
      const label = cleanUser.toLowerCase().includes('kagawad')
        ? cleanUser
        : `Kagawad ${cleanUser}`;
      localStorage.setItem('pulse_kagawad_auth', 'true');
      localStorage.setItem('pulse_account_label', label);
      setActiveAccountLabel(label);
      onRoleChange('kagawad');
      setShowLoginModal(false);
      setLoginError('');
      soundAlert.playChime();
    } else {
      setLoginError(t.header.invalidCredentials);
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const currentKagawadPass =
      localStorage.getItem('pulse_kagawad_custom_password') ||
      localStorage.getItem('trash_kagawad_custom_password') ||
      'Kagawad@Cavite2026#Brgy41!';

    const isOldPassCorrect =
      resetOldPass === currentKagawadPass ||
      resetOldPass === 'Kagawad@Cavite2026#Brgy41!' ||
      resetOldPass === 'trashcavite2026';

    if (!isOldPassCorrect) {
      setResetError(language === 'tl' ? 'Mali ang iyong kasalukuyang lumang password.' : 'Your current old password is incorrect.');
      return;
    }

    if (resetNewPass.length < 8) {
      setResetError(language === 'tl' ? 'Ang bagong password ay dapat may hindi bababa sa 8 characters.' : 'The new password must be at least 8 characters long.');
      return;
    }

    if (resetNewPass !== resetConfirmPass) {
      setResetError(language === 'tl' ? 'Hindi nagtutugma ang Bagong Password at ang Kumpirmasyon nito.' : 'New Password and Confirmation do not match.');
      return;
    }

    localStorage.setItem('pulse_kagawad_custom_password', resetNewPass);
    setResetSuccess(t.header.passwordChangedSuccess);
    soundAlert.playChime();
    setResetOldPass('');
    setResetNewPass('');
    setResetConfirmPass('');
  };

  const handleLogoutKagawad = () => {
    localStorage.removeItem('pulse_kagawad_auth');
    localStorage.removeItem('pulse_account_label');
    localStorage.removeItem('trash_kagawad_auth');
    onRoleChange('resident');
  };

  return (
    <>
      {/* Top Banner with Calibration & Language Mode */}
      <div className="bg-slate-900 text-white text-[10px] sm:text-xs py-1.5 px-3 sm:px-6 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-extrabold text-emerald-400 tracking-wider text-[11px] sm:text-xs shrink-0">T.U.G.O.N.</span>
            <span className="text-slate-400 hidden sm:inline" aria-hidden="true">·</span>
            <span className="text-slate-300 truncate font-medium text-[10px] sm:text-xs">
              {currentRole === 'resident'
                ? t.header.jurisdictionBadge
                : `${activeAccountLabel} · ${t.header.jurisdictionBadge}`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Language Toggle in Top Bar */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold text-[10px] sm:text-[11px] border border-slate-700 transition-all cursor-pointer"
              title={language === 'tl' ? 'Switch to English' : 'Lumipat sa Tagalog'}
            >
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>{language === 'tl' ? '🇵🇭 Tagalog' : '🇺🇸 English'}</span>
            </button>

            <button
              onClick={handleCalibrateScreen}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold text-[10px] sm:text-[11px] transition-all cursor-pointer border border-slate-700 shrink-0"
              title="Calibrate screen"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span className="hidden xs:inline">{t.header.calibrateScreen}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Screen Calibrate Toast Notification */}
      {calibrateToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-slate-100 border border-slate-700 px-4 py-2 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{calibrateToast}</span>
        </div>
      )}

      {/* GPS Location Toast Notification */}
      {gpsToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/95 text-emerald-100 border border-emerald-500/50 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <Navigation className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
          <span>{gpsToast}</span>
        </div>
      )}

      {/* Main Header Bar - Horizontally scrollable and draggable left-to-right on PC & Mobile */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs relative group">
        {/* Subtle desktop glide indicators */}
        <button
          onClick={scrollNavLeft}
          type="button"
          className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-40 w-7 h-7 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white items-center justify-center shadow-md opacity-0 group-hover:opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
          title="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={scrollNavRight}
          type="button"
          className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-40 w-7 h-7 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white items-center justify-center shadow-md opacity-0 group-hover:opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
          title="Scroll Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <header
          ref={headerNavRef}
          onMouseDown={handleNavMouseDown}
          onMouseLeave={handleNavMouseLeave}
          onMouseUp={handleNavMouseUp}
          onMouseMove={handleNavMouseMove}
          onWheel={handleNavWheel}
          className="overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x cursor-grab active:cursor-grabbing select-none"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-max">
          <div className="flex items-center justify-between h-15 sm:h-17 gap-3 sm:gap-6">
            {/* Logo and App Title */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 border border-emerald-200/80 shadow-2xs flex items-center justify-center p-1.5 shrink-0 transition-transform hover:scale-105">
                <img
                  src="/icon.svg"
                  alt="Waste Collection Service"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                    T.U.G.O.N.
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>Waste Collection Service</span>
                  <span className="text-slate-300 hidden sm:inline" aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-medium hidden sm:inline">Brgy 40 & 41, Cavite City</span>
                </p>
              </div>
            </div>

            {/* Role Switcher & Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Prominent Language Switcher Button */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0"
                title={language === 'tl' ? 'Switch to English' : 'Lumipat sa Tagalog'}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs leading-none">{language === 'tl' ? '🇵🇭' : '🇺🇸'}</span>
                <span className="font-bold text-[11px] sm:text-xs">
                  {language === 'tl' ? 'Tagalog' : 'English'}
                </span>
              </button>

              {/* GPS Integrity & Reset/Refresh Button on Menu Bar */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
                {isEnabled && coords ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-[11px] font-mono font-bold text-slate-800 hidden md:inline">
                      GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                    </span>
                    <span className="text-[11px] font-bold text-slate-800 md:hidden">
                      GPS Aktibo
                    </span>
                    <button
                      onClick={handleMenuRefreshLocation}
                      disabled={gpsStatus === 'requesting'}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title={language === 'tl' ? 'I-refresh ang GPS Lokasyon' : 'Refresh GPS Location'}
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${gpsStatus === 'requesting' ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
                    </button>
                    <button
                      onClick={handleMenuResetLocation}
                      className="p-1 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      title={language === 'tl' ? 'I-reset / Alisin ang Lokasyon (Blank)' : 'Reset / Clear GPS (Blank)'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleMenuRequestLocation}
                    disabled={gpsStatus === 'requesting'}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 transition-all cursor-pointer"
                    title={language === 'tl' ? 'Buksan ang Lokasyon / GPS' : 'Enable Location / GPS'}
                  >
                    <Navigation className={`w-3.5 h-3.5 ${gpsStatus === 'requesting' ? 'animate-spin text-amber-500' : 'text-slate-500'}`} />
                    <span className="text-[11px]">
                      {gpsStatus === 'requesting'
                        ? (language === 'tl' ? 'Naghahanap...' : 'Searching...')
                        : (language === 'tl' ? '📍 Buksan GPS' : '📍 Enable GPS')}
                    </span>
                  </button>
                )}
              </div>

              {currentRole === 'kagawad' && (
                <>
                  <button
                    onClick={toggleSound}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title={soundEnabled ? t.header.soundOn : t.header.soundOff}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span className="hidden md:inline">
                      {soundEnabled ? (language === 'tl' ? 'Tunog' : 'Sound') : (language === 'tl' ? 'Mute' : 'Muted')}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setResetError('');
                      setResetSuccess('');
                      setShowResetModal(true);
                    }}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title={t.header.changePassword}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden md:inline">Password</span>
                  </button>

                  <button
                    onClick={handleLogoutKagawad}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100/80 text-red-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title={t.header.logout}
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-600" />
                    <span className="hidden md:inline">{t.header.logout}</span>
                  </button>
                </>
              )}

              {/* Main Role Buttons in Header (Desktop / Tablet) */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
                <button
                  onClick={() => onRoleChange('resident')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentRole === 'resident'
                      ? 'bg-white text-emerald-800 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{t.header.residentView}</span>
                </button>
                <button
                  onClick={handleKagawadButtonClick}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentRole === 'kagawad'
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.header.kagawadPortal}</span>
                  {pendingCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-red-600 text-white font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 mx-auto shadow-inner">
              <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 text-center">
              {t.header.loginTitle}
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1 mb-4">
              {t.header.loginSubtitle}
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.header.username}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={t.header.usernamePlaceholder}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 sm:py-3 rounded-2xl border border-slate-300 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.header.password}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={t.header.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-2xl border border-slate-300 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Hide' : 'Show'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold text-center">
                  {loginError}
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 active:scale-98 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{t.header.loginBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setResetError('');
                    setResetSuccess('');
                    setShowResetModal(true);
                  }}
                  className="text-[11px] text-purple-700 hover:text-purple-900 font-bold underline text-center pt-1 transition-colors cursor-pointer"
                >
                  {t.header.changePassword}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="w-full py-2 px-4 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t.common.back}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 mx-auto shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center">
              {t.header.changePasswordTitle}
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1 mb-4 leading-relaxed">
              {language === 'tl'
                ? 'Ilagay ang iyong lumang password upang mag-set ng bagong password combination.'
                : 'Enter your old password to set a new password combination.'}
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.header.oldPassword}
                </label>
                <input
                  type="password"
                  required
                  placeholder={language === 'tl' ? 'Ilagay ang lumang password' : 'Enter current password'}
                  value={resetOldPass}
                  onChange={(e) => setResetOldPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.header.newPassword}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder={language === 'tl' ? 'Ilagay ang bagong password' : 'Enter new password'}
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    className="w-full px-3.5 pr-10 py-2.5 rounded-2xl border border-slate-300 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.header.confirmNewPassword}
                </label>
                <input
                  type="password"
                  required
                  placeholder={language === 'tl' ? 'I-type muli ang bagong password' : 'Confirm new password'}
                  value={resetConfirmPass}
                  onChange={(e) => setResetConfirmPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              {resetError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold text-center">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold text-center">
                  {resetSuccess}
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{t.common.save}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="w-full py-2 px-4 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t.common.close}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PWA Install Modal */}
      {showInstallPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {t.header.installApp}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {t.header.installSubtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {deferredPrompt ? (
                <button
                  onClick={handlePromptPwa}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="block text-white leading-tight">
                        {language === 'tl' ? '1-Tap I-install sa Cellphone' : '1-Tap Install on Mobile Phone'}
                      </span>
                      <span className="text-[10px] text-emerald-100 font-medium">
                        {language === 'tl' ? 'Idaragdag agad sa iyong Apps at Home Screen' : 'Instantly adds to your Apps and Home Screen'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white uppercase">
                    Install
                  </span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  <span className="font-extrabold block text-emerald-800 text-sm">
                    {language === 'tl' ? 'Paano I-install sa Phone:' : 'How to Install on Phone:'}
                  </span>
                  <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                    {language === 'tl'
                      ? 'Pindutin lamang ang tatlong tuldok (⋮) sa Chrome o Share (⎙) sa Safari at piliin ang "Install app" o "Add to Home Screen".'
                      : 'Tap the three dots (⋮) in Chrome or Share (⎙) in Safari and select "Install app" or "Add to Home Screen".'}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowInstallPrompt(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
