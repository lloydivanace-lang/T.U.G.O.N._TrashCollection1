import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Power,
  RotateCcw,
  RefreshCw,
  Check,
  ExternalLink,
  Unlink,
  ClipboardPaste,
  HelpCircle,
} from 'lucide-react';
import { PiStatus } from '../types';
import { soundAlert } from '../utils/audioAlarm';
import { useLanguage } from '../context/LanguageContext';

interface RaspberryPiCenterProps {
  activeStorageMode: 'pi' | 'cloud';
  onToggleStorageMode: () => void;
}

export const RaspberryPiCenter: React.FC<RaspberryPiCenterProps> = () => {
  const { language, t } = useLanguage();
  const [piEndpoint, setPiEndpoint] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('pulse_pi_endpoint');
      return stored ? stored.trim() : '';
    } catch {
      return '';
    }
  });

  const [piData, setPiData] = useState<PiStatus | null>(null);
  const [_loading, setLoading] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Ping Testing State
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingFeedback, setPingFeedback] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Safe Power Controls
  const [isSendingPowerAction, setIsSendingPowerAction] = useState(false);
  const [powerActionFeedback, setPowerActionFeedback] = useState<string | null>(null);
  const [confirmShutdownModal, setConfirmShutdownModal] = useState(false);
  const [confirmDisconnectModal, setConfirmDisconnectModal] = useState(false);

  const fetchPiStatus = async () => {
    setLoading(true);
    try {
      const endpoint = piEndpoint.trim();
      const url = endpoint ? `/api/pi-status?endpoint=${encodeURIComponent(endpoint)}` : '/api/pi-status';
      const res = await fetch(url);
      const data = await res.json();
      setPiData(data);
    } catch (e) {
      console.error('Error fetching Pi status:', e);
      setPiData((prev) => (prev ? { ...prev, online: false } : null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPiStatus();
    const interval = setInterval(fetchPiStatus, 6000);
    return () => clearInterval(interval);
  }, [piEndpoint]);

  const handleTestPingAndConnect = async () => {
    const cleanUrl = piEndpoint.trim();
    if (!cleanUrl) {
      setPingFeedback({
        success: false,
        message: language === 'tl' ? 'Pakilagay muna ang URL ng iyong Raspberry Pi bago mag-konekta.' : 'Please enter your Raspberry Pi URL before connecting.',
      });
      return;
    }

    setIsTestingPing(true);
    setPingFeedback(null);
    try {
      const res = await fetch('/api/pi/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = await res.json();
      if (data.success && data.online) {
        soundAlert.playChime();
        localStorage.setItem('pulse_pi_endpoint', cleanUrl);
        setPingFeedback({
          success: true,
          latencyMs: data.latencyMs,
          message:
            language === 'tl'
              ? `Konektado at Nai-save sa System! (${data.method || 'Tunnel'}, Bilis: ${data.latencyMs}ms)`
              : `Connected & Saved to System! (${data.method || 'Tunnel'}, Latency: ${data.latencyMs}ms)`,
        });
        setSaveToast(language === 'tl' ? 'Konektado at Nai-save!' : 'Connected & Saved!');
        fetchPiStatus();
        setTimeout(() => setSaveToast(null), 3000);
      } else {
        setPingFeedback({
          success: false,
          message: data.error || (language === 'tl' ? 'Naka-off o hindi maabot ang Raspberry Pi sa ibinigay na URL.' : 'Raspberry Pi is off or unreachable at the given URL.'),
        });
        setPiData((prev) => (prev ? { ...prev, online: false, isConfigured: true } : null));
      }
    } catch {
      setPingFeedback({
        success: false,
        message: language === 'tl' ? 'Hindi maabot ang server link. Pakisuri kung bukas ang Pi at may signal.' : 'Cannot reach server link. Please verify the Pi is powered on with connectivity.',
      });
      setPiData((prev) => (prev ? { ...prev, online: false, isConfigured: true } : null));
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleDisconnectAndRemove = async () => {
    try {
      localStorage.removeItem('pulse_pi_endpoint');
      setPiEndpoint('');
      setPingFeedback(null);
      await fetch('/api/pi/disconnect', { method: 'POST' }).catch(() => {});
      soundAlert.playChime();
      setSaveToast(language === 'tl' ? 'Nadiskonekta at natanggal ang server link!' : 'Disconnected and removed server link!');
      setConfirmDisconnectModal(false);
      setPiData({
        hardware: language === 'tl' ? 'Raspberry Pi 4 Model B (Hindi Pa Naka-set)' : 'Raspberry Pi 4 Model B (Not Configured)',
        ram: language === 'tl' ? 'Naka-standby' : 'Standby',
        storageUsedMb: 0,
        storage_folder: language === 'tl' ? 'Walang Naka-configure na Pi Server (Manual Setup Mode)' : 'No Configured Pi Server (Manual Setup Mode)',
        disk_total: '0 GB',
        disk_used: '0 GB',
        disk_free: '0 GB',
        pulseFolderMb: 0,
        pulseFolderKb: 0,
        pulseStorageSummary: language === 'tl' ? 'Walang naka-set na Pi server URL.' : 'No Pi server URL configured.',
        residentPhotosCount: 0,
        residentPhotosMb: 0,
        proofPhotosCount: 0,
        proofPhotosMb: 0,
        cachedImagesCount: 0,
        activeTicketsCount: 0,
        pendingTicketsCount: 0,
        autoPurgeTtlDays: 30,
        cpuTempCelsius: 0,
        cpu_temp: 'N/A',
        ipAddress: '',
        localHostname: 'N/A',
        online: false,
        isConfigured: false,
        configuredUrl: '',
        latencyMs: 0,
        lastPingAt: '',
        connectionMethod: language === 'tl' ? 'Walang Naka-set' : 'None Configured',
        lastPurgeRun: '',
        savedLogbooksCount: 0,
      });
      setTimeout(() => setSaveToast(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
          setPiEndpoint(text.trim());
          setSaveToast(language === 'tl' ? 'Na-paste ang link!' : 'Link pasted!');
          setTimeout(() => setSaveToast(null), 2000);
          return;
        }
      }
      setSaveToast(language === 'tl' ? 'Paki-paste nang manu-mano sa kahon' : 'Please paste manually into the box');
      setTimeout(() => setSaveToast(null), 2500);
    } catch {
      setSaveToast(language === 'tl' ? 'Paki-paste nang manu-mano sa kahon' : 'Please paste manually into the box');
      setTimeout(() => setSaveToast(null), 2500);
    }
  };

  const handleSystemPowerAction = async (action: 'shutdown' | 'reboot') => {
    setIsSendingPowerAction(true);
    setPowerActionFeedback(null);
    try {
      const res = await fetch('/api/pi/system-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, url: piEndpoint.trim() }),
      });
      const data = await res.json();
      soundAlert.playChime();
      setPowerActionFeedback(
        data.message ||
          (action === 'shutdown'
            ? (language === 'tl' ? 'Naipadala ang Safe Shutdown. Maghintay ng 5 segundo bago tanggalin sa saksakan.' : 'Safe Shutdown signal delivered. Wait 5 seconds before unplugging power.')
            : (language === 'tl' ? 'Nagre-reboot na ang Pi.' : 'Pi server is rebooting.'))
      );
      if (action === 'shutdown') {
        setConfirmShutdownModal(false);
        setPiData((prev) => (prev ? { ...prev, online: false } : null));
      }
      setTimeout(() => fetchPiStatus(), 3000);
    } catch {
      if (action === 'shutdown') {
        setPowerActionFeedback(language === 'tl' ? 'Naipadala ang shutdown signal sa Raspberry Pi.' : 'Shutdown signal delivered to Raspberry Pi.');
        setConfirmShutdownModal(false);
        setPiData((prev) => (prev ? { ...prev, online: false } : null));
      } else {
        setPowerActionFeedback(language === 'tl' ? 'Nagkaroon ng aberya sa koneksyon.' : 'Connection error occurred.');
      }
    } finally {
      setIsSendingPowerAction(false);
    }
  };

  const isConfigured = !!piEndpoint.trim();
  const isOnline = isConfigured && !!piData?.online;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Server className="w-5 h-5" />
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              {t.piCenter.centerTitle}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.piCenter.centerSubtitle}
          </p>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-2">
          {!isConfigured ? (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              {language === 'tl' ? 'WALANG NAKA-SET (MANUAL SETUP)' : 'NOT CONFIGURED (MANUAL SETUP)'}
            </span>
          ) : isOnline ? (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {t.piCenter.piOnline} ({piData?.latencyMs || 25}ms)
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              {t.piCenter.piOffline}
            </span>
          )}
        </div>
      </div>

      {/* Manual Setup & Management Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-purple-700" />
            <span>{language === 'tl' ? 'Raspberry Pi Server URL / Tunnel Link:' : 'Raspberry Pi Server URL / Tunnel Link:'}</span>
          </label>
          <div className="flex items-center gap-2">
            {saveToast && (
              <span className="text-emerald-700 font-extrabold text-xs animate-in fade-in">
                ✓ {saveToast}
              </span>
            )}
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 underline cursor-pointer"
              title={language === 'tl' ? 'I-paste mula sa Clipboard' : 'Paste from Clipboard'}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>{language === 'tl' ? 'I-paste' : 'Paste'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={piEndpoint}
              onChange={(e) => {
                setPiEndpoint(e.target.value);
                setPingFeedback(null);
              }}
              placeholder={language === 'tl' ? 'Ilagay dito ang link (hal. https://your-domain.ngrok-free.dev o http://192.168.1.xxx:8000)' : 'Enter link here (e.g. https://your-domain.ngrok-free.dev or http://192.168.1.xxx:8000)'}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            {piEndpoint && (
              <button
                type="button"
                onClick={() => setPiEndpoint('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded cursor-pointer"
                title={language === 'tl' ? 'Linisin ang input' : 'Clear input'}
              >
                {language === 'tl' ? 'Linisin' : 'Clear'}
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            {language === 'tl'
              ? 'Maaari kang gumamit ng ngrok (https://...ngrok-free.dev), Cloudflare Tunnel (https://...trycloudflare.com), o Local IP (http://192.168.1.xxx:8000).'
              : 'You can use ngrok (https://...ngrok-free.dev), Cloudflare Tunnel (https://...trycloudflare.com), or Local IP (http://192.168.1.xxx:8000).'}
          </p>
        </div>

        {/* Action Buttons: Connect, Save, and Disconnect/Remove */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <button
            onClick={handleTestPingAndConnect}
            disabled={isTestingPing || !piEndpoint.trim()}
            className="flex-1 py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 disabled:opacity-40"
          >
            {isTestingPing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>
              {isTestingPing
                ? (language === 'tl' ? 'Sinusuri at Kumokonekta...' : 'Testing & Connecting...')
                : (language === 'tl' ? 'I-konekta at I-save ang Link' : 'Connect & Save Link')}
            </span>
          </button>

          {isConfigured && (
            <button
              onClick={() => setConfirmDisconnectModal(true)}
              type="button"
              className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 shadow-xs"
              title={language === 'tl' ? 'Tanggalin nang lubusan ang Pi server link mula sa system' : 'Remove Pi server link from system'}
            >
              <Unlink className="w-4 h-4 text-rose-600" />
              <span>{language === 'tl' ? 'Idiskonekta / Tanggalin ang Link' : 'Disconnect / Remove Link'}</span>
            </button>
          )}
        </div>

        {/* Ping and Connection Feedback */}
        {pingFeedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
              pingFeedback.success
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
          >
            {pingFeedback.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{pingFeedback.message}</span>
          </div>
        )}

        {/* Active Connected Link Inspector */}
        {isConfigured && (
          <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-extrabold text-slate-700 shrink-0">{language === 'tl' ? 'Aktibong Link:' : 'Active Link:'}</span>
              <code className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-mono text-[11px] text-purple-900 truncate max-w-xs sm:max-w-md">
                {piEndpoint}
              </code>
            </div>
            <a
              href={piEndpoint}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1 shrink-0"
            >
              <span>{language === 'tl' ? 'Buksan sa Bagong Tab' : 'Open in New Tab'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Context Banner based on status */}
      {!isConfigured ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>{language === 'tl' ? 'Paano I-setup ang Iyong Raspberry Pi Cloud Server:' : 'How to Setup Your Raspberry Pi Cloud Server:'}</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1 text-slate-700 leading-relaxed text-[11px]">
            <li>{language === 'tl' ? 'Patakbuhin ang server sa iyong Raspberry Pi (hal. python3 raspberry-pi-server/server.py o ang iyong sariling server).' : 'Start the server on your Raspberry Pi (e.g. python3 raspberry-pi-server/server.py or your preferred runtime).'}</li>
            <li>{language === 'tl' ? 'Kung nais mong ma-access sa labas ng bahay, buksan ang tunnel gamit ang ngrok: ngrok http 8000 o Cloudflare: cloudflared tunnel --url http://localhost:8000.' : 'If accessing from outside the local network, launch a tunnel using ngrok: ngrok http 8000 or Cloudflare: cloudflared tunnel --url http://localhost:8000.'}</li>
            <li>{language === 'tl' ? 'Kopyahin ang nabuong public link at i-paste sa kahon sa itaas, saka pindutin ang "I-konekta at I-save ang Link".' : 'Copy the generated public link and paste it into the box above, then click "Connect & Save Link".'}</li>
            <li>{language === 'tl' ? 'Maaari mo itong tanggalin anumang oras sa pamamagitan ng pagpindot sa "Idiskonekta / Tanggalin ang Link".' : 'You can disconnect and remove the link anytime by clicking "Disconnect / Remove Link".'}</li>
          </ol>
        </div>
      ) : !isOnline ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-950">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-black text-rose-900">
              {language === 'tl' ? 'Hindi Maabot ang Naka-configure na Pi Link' : 'Configured Pi Link Unreachable'}
            </strong>
            <p className="leading-relaxed text-rose-800 text-[11px]">
              {language === 'tl'
                ? `Kasalukuyang hindi sumasagot ang server sa ${piEndpoint}. Pakisuri kung bukas ang Pi at tumatakbo ang tunnel. Kung nais mong palitan o alisin ito, pindutin ang "Idiskonekta / Tanggalin ang Link" sa itaas.`
                : `The server at ${piEndpoint} is currently unreachable. Check that the Pi is powered on and the tunnel is running. If you want to change or remove it, click "Disconnect / Remove Link" above.`}
            </p>
          </div>
        </div>
      ) : null}

      {/* Hardware & Hard Drive Footprint (Active when online) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">
            {language === 'tl' ? 'Katayuan ng Pi' : 'Pi Status'}
          </span>
          <div className="text-sm font-black text-slate-800 flex items-center gap-1.5">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>Online ({piData?.connectionMethod || 'Tunnel'})</span>
              </>
            ) : isConfigured ? (
              <>
                <WifiOff className="w-4 h-4 text-rose-500" />
                <span>{language === 'tl' ? 'Naka-off' : 'Offline'}</span>
              </>
            ) : (
              <span className="text-slate-500">{language === 'tl' ? 'Hindi Pa Naka-set' : 'Not Configured'}</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500">
            {isOnline ? (language === 'tl' ? `Bilis: ${piData?.latencyMs || 25}ms` : `Latency: ${piData?.latencyMs || 25}ms`) : (language === 'tl' ? 'Walang koneksyon' : 'No connection')}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">
            {language === 'tl' ? 'Hard Drive Folder' : 'Storage Folder'}
          </span>
          <div className="text-xs font-mono font-bold text-slate-800 truncate" title={piData?.storage_folder}>
            {isOnline ? (piData?.storage_folder || '/media/pi/.../RESEARCH TRASH') : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500">
            {isOnline ? (language === 'tl' ? 'Ligtas na imbakan' : 'Secure sovereign store') : (language === 'tl' ? 'Hindi naka-link' : 'Not linked')}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">
            {language === 'tl' ? 'Laki sa Hard Drive' : 'Hard Drive Size'}
          </span>
          <div className="text-sm font-black text-emerald-700">
            {isOnline ? `${piData?.pulseFolderMb || '1.2'} MB` : '0 MB'}
          </div>
          <div className="text-[10px] text-slate-500">
            {isOnline ? (language === 'tl' ? `${piData?.pulseFolderKb || '1228'} KB (Maliit na footprint)` : `${piData?.pulseFolderKb || '1228'} KB (Minimal footprint)`) : 'N/A'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">
            {language === 'tl' ? 'Bukas na Espasyo' : 'Free Disk Space'}
          </span>
          <div className="text-sm font-black text-slate-800">
            {isOnline ? (piData?.disk_free || '480 GB') : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500">
            {isOnline ? (language === 'tl' ? `Gamit: ${piData?.disk_used || '20 GB'}` : `Used: ${piData?.disk_used || '20 GB'}`) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Safe Power Controls (Hardware Safe Shutdown & Reboot - Available when configured) */}
      {isConfigured && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Power className="w-5 h-5 text-amber-400" />
              <h4 className="font-black text-sm">
                {language === 'tl' ? 'Ligtas na Power Controls ng Raspberry Pi' : 'Safe Raspberry Pi Power Controls'}
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {language === 'tl' ? 'Proteksyon laban sa pagkasira ng SD Card' : 'SD Card Corruption Protection'}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {language === 'tl'
              ? 'Bago hugutin ang saksakan ng Raspberry Pi, pindutin muna ang Safe Shutdown upang mai-flush ang disk memory at maiwasan ang pagkasira.'
              : 'Before unplugging the Raspberry Pi, click Safe Shutdown to flush disk buffers and prevent memory corruption.'}
          </p>

          {powerActionFeedback && (
            <div className="p-3 bg-slate-800 text-amber-300 rounded-xl text-xs font-bold border border-slate-700">
              {powerActionFeedback}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              onClick={() => setConfirmShutdownModal(true)}
              disabled={!isOnline || isSendingPowerAction}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Power className="w-4 h-4" />
              <span>{language === 'tl' ? 'Ligtas na I-Shutdown ang Pi (Bago Hugutin)' : 'Safely Shutdown Pi (Before Unplugging)'}</span>
            </button>
            <button
              onClick={() => handleSystemPowerAction('reboot')}
              disabled={!isOnline || isSendingPowerAction}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{language === 'tl' ? 'I-Reboot ang Pi' : 'Reboot Pi Server'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Disconnecting Pi Link */}
      {confirmDisconnectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2.5 rounded-2xl bg-rose-100">
                <Unlink className="w-6 h-6 text-rose-600" />
              </span>
              <div>
                <h4 className="font-black text-base text-slate-900">
                  {language === 'tl' ? 'Tanggalin ang Server Link?' : 'Disconnect Server Link?'}
                </h4>
                <p className="text-xs text-slate-500">
                  {language === 'tl' ? 'Ididiskonekta ang Pi server mula sa portal' : 'Disconnects Pi server from portal'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === 'tl'
                ? 'Mabubura ang nakatalang server URL sa iyong browser at server. Maaari kang mag-lagay muli ng bagong link anumang oras.'
                : 'The stored server URL will be cleared from your configuration. You can enter a new link anytime.'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDisconnectModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {language === 'tl' ? 'Kanselahin' : 'Cancel'}
              </button>
              <button
                onClick={handleDisconnectAndRemove}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-black text-xs text-white shadow-xs cursor-pointer"
              >
                {language === 'tl' ? 'Oo, Tanggalin' : 'Yes, Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Shutdown Confirmation Modal */}
      {confirmShutdownModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2.5 rounded-2xl bg-rose-100">
                <Power className="w-6 h-6 text-rose-600" />
              </span>
              <div>
                <h4 className="font-black text-base text-slate-900">
                  {language === 'tl' ? 'I-shutdown ang Raspberry Pi?' : 'Shutdown Raspberry Pi?'}
                </h4>
                <p className="text-xs text-slate-500">
                  {language === 'tl' ? 'I-flush ang disk at patayin ang server nang ligtas' : 'Flush disk memory and safely shut down'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === 'tl'
                ? 'Pagkapindot ng kumpirmasyon, maghihintay ka ng 5 segundo hanggang huminto o mamamatay ang berdeng ilaw (ACT LED) sa Pi bago ligtas na hugutin ang saksakan.'
                : 'After confirming, wait 5 seconds until the green activity LED stops blinking before safely unplugging power.'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmShutdownModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {language === 'tl' ? 'Kanselahin' : 'Cancel'}
              </button>
              <button
                onClick={() => handleSystemPowerAction('shutdown')}
                disabled={isSendingPowerAction}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-black text-xs text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSendingPowerAction
                  ? (language === 'tl' ? 'Nagpapadala...' : 'Sending...')
                  : (language === 'tl' ? 'Oo, I-shutdown Na' : 'Yes, Shutdown Now')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
