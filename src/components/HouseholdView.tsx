import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  FolderOpen,
  Trash2,
  CheckCircle2,
  Navigation,
  FolderHeart,
  Plus,
  X,
  Check,
  ShieldCheck,
  Cloud,
  Smartphone,
  Eye,
  MessageSquare,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { WasteReport, SeverityLevel } from '../types';
import { soundAlert } from '../utils/audioAlarm';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from '../context/LocationContext';
import { LiveCameraModal } from './LiveCameraModal';
import { compressImage } from '../utils/imageCompressor';
import { BRGY_40_HALL_COORDS, BRGY_41_HALL_COORDS } from '../utils/jurisdiction';
import {
  ThreeDHouseholdTrash,
  ThreeDBulkyFurniture,
  ThreeDYardGarden,
  ThreeDHazardous,
  ThreeDCamera,
  ThreeDFolderGallery,
  ThreeDSeverityMild,
  ThreeDSeverityModerate,
  ThreeDSeverityOverflowing,
  ThreeDSeverityEmergency,
  ThreeDSeniorHeart,
  ThreeDAssistanceBeacon,
  ThreeDLocationPin,
  ThreeDBarangayHall,
  ThreeDCheckShield,
} from './ThreeDIcons';

interface HouseholdViewProps {
  onReportSubmitted: (newReport: WasteReport) => void;
  activeStorageMode?: 'pi' | 'cloud';
}

const COMMON_WASTE_BUTTONS = [
  {
    id: 'household',
    title: 'Household Trash',
    tagalog: 'Pang-araw-araw na Basura',
    IconComponent: ThreeDHouseholdTrash,
  },
  {
    id: 'bulky',
    title: 'Bulky Waste / Furniture',
    tagalog: 'Sirang Gamit / Kahoy / Kutson',
    IconComponent: ThreeDBulkyFurniture,
  },
  {
    id: 'yard',
    title: 'Yard & Garden Trimmings',
    tagalog: 'Dahon / Sangang Pinutol',
    IconComponent: ThreeDYardGarden,
  },
  {
    id: 'hazardous',
    title: 'Hazardous / E-Waste',
    tagalog: 'Baterya, Ilaw, Sirang Appliances',
    IconComponent: ThreeDHazardous,
  },
];

const SEVERITY_LEVELS: {
  id: SeverityLevel;
  label: string;
  tagalog: string;
  color: string;
  IconComponent: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'MILD',
    label: 'Mild (1-2 bags)',
    tagalog: 'Banayad / 1-2 sako lamang',
    color: 'border-emerald-400 bg-emerald-50 text-emerald-900',
    IconComponent: ThreeDSeverityMild,
  },
  {
    id: 'MODERATE',
    label: 'Moderate (3-5 bags)',
    tagalog: 'Katamtaman (3-5 sako)',
    color: 'border-amber-400 bg-amber-50 text-amber-900',
    IconComponent: ThreeDSeverityModerate,
  },
  {
    id: 'OVERFLOWING',
    label: 'Overflowing / Severe Pile',
    tagalog: 'Malala / Umaapaw na Basura',
    color: 'border-rose-500 bg-rose-50 text-rose-900',
    IconComponent: ThreeDSeverityOverflowing,
  },
  {
    id: 'EMERGENCY',
    label: 'Emergency / Hazardous',
    tagalog: 'Emergency / Delikado o Nakaharang',
    color: 'border-red-600 bg-red-100 text-red-950 font-bold',
    IconComponent: ThreeDSeverityEmergency,
  },
];

const BARANGAY_OPTIONS = [
  { value: 'Barangay 41 (Rosal), Cavite City', label: 'Barangay 41 (Rosal), Cavite City' },
  { value: 'Barangay 40 (Gumamela), Cavite City', label: 'Barangay 40 (Gumamela), Cavite City' },
];

export const HouseholdView: React.FC<HouseholdViewProps> = ({
  onReportSubmitted,
}) => {
  const { language, t } = useLanguage();
  const [residentTab, setResidentTab] = useState<'form' | 'my_storage'>('form');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Household Trash']);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string>('');
  const [severityLevel, setSeverityLevel] = useState<SeverityLevel>('MODERATE');
  const [isElderly, setIsElderly] = useState(false);
  const [needsAssistanceOutside, setNeedsAssistanceOutside] = useState(false);
  const [barangay, setBarangay] = useState('Barangay 41 (Rosal), Cavite City');
  const [purok, setPurok] = useState('Barangay 41 (Rosal), Cavite City');
  const [streetAddress, setStreetAddress] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [residentName, setResidentName] = useState('');
  const [notes, setNotes] = useState('');
  const [extraMessage, setExtraMessage] = useState('');
  const {
    coords,
    address: liveGpsAddress,
    accuracy: liveGpsAccuracy,
    isEnabled: isLocationEnabled,
    status: locationStatus,
    isWithinJurisdiction: gpsWithinJurisdiction,
    detectedBarangay: gpsDetectedBarangay,
    errorMessage: locationErrorMessage,
    requestLocation,
    refreshLocation,
    resetLocation,
    setManualLocation,
  } = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<WasteReport | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<WasteReport | null>(null);


  // Resident's Personal Local Storage (saved directly in phone memory)
  const [myStoredReports, setMyStoredReports] = useState<WasteReport[]>(() => {
    try {
      const saved =
        localStorage.getItem('pulse_resident_my_reports') ||
        localStorage.getItem('trash_resident_my_reports') ||
        localStorage.getItem('draw_resident_my_reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);

  // Sync resident's personal storage with live server status
  useEffect(() => {
    const syncPersonalReports = async () => {
      try {
        const res = await fetch('/api/reports?feed=all');
        const liveReports: WasteReport[] = await res.json();
        if (Array.isArray(liveReports) && liveReports.length > 0) {
          setMyStoredReports((prev) => {
            if (prev.length === 0) return prev;
            const updated = prev.map((local) => {
              const matched = liveReports.find((live) => live.id === local.id || live.ticketNumber === local.ticketNumber);
              return matched ? { ...local, ...matched } : local;
            });
            try {
              localStorage.setItem('pulse_resident_my_reports', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      } catch (e) {
        console.warn('Sync error:', e);
      }
    };
    syncPersonalReports();
    const interval = setInterval(syncPersonalReports, 6000);
    return () => clearInterval(interval);
  }, []);


  // Sync detected barangay with form selection
  useEffect(() => {
    if (gpsDetectedBarangay) {
      const full =
        gpsDetectedBarangay === 'Barangay 40'
          ? 'Barangay 40 (Gumamela), Cavite City'
          : 'Barangay 41 (Rosal), Cavite City';
      setBarangay(full);
      setPurok(full);
    }
  }, [gpsDetectedBarangay]);

  // Sync assistance flag if detected outside
  useEffect(() => {
    if (isLocationEnabled && coords) {
      if (!gpsWithinJurisdiction) {
        setNeedsAssistanceOutside(true);
      } else {
        setNeedsAssistanceOutside(false);
      }
    }
  }, [isLocationEnabled, coords, gpsWithinJurisdiction]);


  const toggleWasteType = (typeTitle: string) => {
    setSelectedTypes((prev) => {
      if (prev.includes(typeTitle)) {
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== typeTitle);
      } else {
        return [...prev, typeTitle];
      }
    });
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = 15 - photos.length;
    if (remainingSlots <= 0) {
      alert(language === 'tl' ? 'Naabot na ang limitasyon na 15 litrato.' : 'The 15 photos limit has been reached.');
      return;
    }
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    for (const file of filesToProcess) {
      try {
        const compressed = await compressImage(file, 1080, 1080, 0.75);
        if (compressed) {
          setPhotos((prev) => [...prev, compressed]);
          setPhotoError('');
        }
      } catch (err) {
        console.warn('Error reading photo:', err);
      }
    }
  };

  const handleLiveCameraCapture = async (dataUrl: string) => {
    if (photos.length >= 15) {
      alert(language === 'tl' ? 'Naabot na ang limitasyon na 15 litrato.' : 'The 15 photos limit has been reached.');
      return;
    }
    const compressed = await compressImage(dataUrl, 1080, 1080, 0.75);
    setPhotos((prev) => [...prev, compressed]);
    setPhotoError('');
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) {
      setPhotoError(
        language === 'tl'
          ? 'Kinakailangan kumuha o mag-attach ng sariling litrato ng basura. Bawal ang mag-submit nang walang litrato.'
          : 'A waste photo is required. Submission without photo is not allowed.'
      );
      return;
    }
    setPhotoError('');
    setIsSubmitting(true);

    const hasLiveGps = Boolean(isLocationEnabled && coords);
    const isOutsideOrFlagged = needsAssistanceOutside || (hasLiveGps && !gpsWithinJurisdiction);
    const finalTypes = [...selectedTypes];
    if (isOutsideOrFlagged && !finalTypes.includes('Nangangailangan ng assistance') && !finalTypes.includes('Special Assistance Needed')) {
      finalTypes.push(language === 'tl' ? 'Nangangailangan ng assistance' : 'Special Assistance Needed');
    }
    if (isElderly && !finalTypes.includes('Senior Citizen Priority')) {
      finalTypes.push('Senior Citizen Priority');
    }

    const finalCoords = hasLiveGps
      ? coords!
      : barangay.includes('40')
      ? { lat: BRGY_40_HALL_COORDS[0], lng: BRGY_40_HALL_COORDS[1] }
      : { lat: BRGY_41_HALL_COORDS[0], lng: BRGY_41_HALL_COORDS[1] };

    const finalAddress = hasLiveGps && liveGpsAddress
      ? liveGpsAddress
      : streetAddress
      ? `${streetAddress}, ${barangay}`
      : `${barangay} (${language === 'tl' ? 'Manu-manong address - Walang GPS data' : 'Manual address - No GPS data'})`;

    const payload = {

      residentName: residentName.trim(),
      residentPhone: 'N/A',
      isElderly,
      severityLevel,
      purok: purok || `${barangay}`,
      barangay: barangay.includes('40') ? 'Barangay 40 (Gumamela)' : 'Barangay 41 (Rosal)',
      streetAddress: streetAddress.trim(),
      houseNumber: houseNumber.trim(),
      coordinates: finalCoords,
      autoGpsAccurate: hasLiveGps,
      realtimeGpsAddress: finalAddress,
      isWithinBrgy41: barangay.includes('41'),
      isWithinJurisdiction: !isOutsideOrFlagged,
      needsAssistanceOutside: isOutsideOrFlagged,
      wasteTypes: finalTypes,
      urgency: isElderly ? 'URGENT_ELDERLY' : severityLevel === 'EMERGENCY' ? 'HIGH' : 'NORMAL',
      estimatedBags: `${severityLevel}`,
      photos,
      notes: notes.trim(),
      extraMessage: extraMessage.trim(),
      sourceStorage: 'Raspberry Pi Cloud Storage',
    };


    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setSubmittedTicket(data.report);
        onReportSubmitted(data.report);
        // Save to resident's own device storage permanently
        const updatedPersonalList = [data.report, ...myStoredReports];
        setMyStoredReports(updatedPersonalList);
        localStorage.setItem('pulse_resident_my_reports', JSON.stringify(updatedPersonalList));
        soundAlert.playChime();
      } else {
        alert(data.error || (language === 'tl' ? 'Nagkaroon ng problema sa pag-submit. Pakisubukan muli.' : 'Submission error. Please try again.'));
      }
    } catch (err) {
      console.error(err);
      alert(language === 'tl' ? 'Nagkaroon ng problema sa pag-submit. Pakisubukan muli.' : 'Submission error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setPhotos([]);
    setNotes('');
    setExtraMessage('');
    setIsElderly(false);
    setSeverityLevel('MODERATE');
    setPurok('Barangay 41, Cavite City');
    setStreetAddress('');
    setHouseNumber('');
    setResidentName('');
    setNeedsAssistanceOutside(false);
  };


  const handleConfirmClearAll = () => {
    setMyStoredReports([]);
    try {
      localStorage.removeItem('pulse_resident_my_reports');
      localStorage.setItem('pulse_resident_my_reports', '[]');
    } catch (e) {
      console.warn('Storage clear notice:', e);
    }
    setIsConfirmingClearAll(false);
    soundAlert.playChime();
  };

  const handleConfirmDeleteSingle = () => {
    if (!reportToDelete) return;
    const updated = myStoredReports.filter((r) => r.id !== reportToDelete.id);
    setMyStoredReports(updated);
    localStorage.setItem('pulse_resident_my_reports', JSON.stringify(updated));
    setReportToDelete(null);
    soundAlert.playChime();
  };

  // Submission success view
  if (submittedTicket) {
    return (
      <div className="w-full max-w-md sm:max-w-xl mx-auto py-6 sm:py-10 px-3 sm:px-6 animate-in fade-in zoom-in-95">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-100 text-center space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 font-mono">
            {t.household.ticketNumberLabel}: #{submittedTicket.ticketNumber}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            {t.household.successModalTitle}
          </h2>
          <p className="text-sm sm:text-base text-emerald-700 font-bold">
            {t.household.successModalSubtitle}
          </p>
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 space-y-1">
            <div className="font-extrabold flex items-center gap-1.5 text-amber-800">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>{language === 'tl' ? 'Aksyon ng Kagawad & Sariling Storage:' : 'Kagawad Action & Storage Sync:'}</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {language === 'tl'
                ? 'Naka-save ang ticket na ito sa memorya ng iyong telepono. Bago ma-resolve ng Kagawad, obligado silang mag-attach ng litrato ng proeba na nalinis na. Pagkatapos maresolba, may 1-araw na auto-purge countdown bago maalis sa active view, ngunit mananatili sa iyong sariling telepono at sa Pi Logbook!'
                : 'This ticket is saved to your phone storage. Before resolving, Kagawads are required to attach official photographic proof of cleanup. Once resolved, a 1-day auto-purge countdown begins, but your copy remains safe in your phone memory and Pi Logbook!'}
            </p>
          </div>
          {submittedTicket.extraMessage && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700">
              <span className="font-bold block text-slate-900">{language === 'tl' ? 'Iyong Karagdagang Mensahe:' : 'Your Additional Message:'}</span>
              <p className="italic mt-0.5">&quot;{submittedTicket.extraMessage}&quot;</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-3">
            <button
              onClick={() => {
                handleResetForm();
                setResidentTab('my_storage');
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <FolderHeart className="w-4 h-4 text-emerald-600" />
              <span>{t.household.myReportsTab}</span>
            </button>
            <button
              onClick={handleResetForm}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'tl' ? 'Mag-report ng Panibago' : 'Report Another'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl lg:max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-6">
      {/* Resident Sub-Tabs */}
      <div className="mb-4 sm:mb-6 flex p-1 bg-slate-200/80 rounded-2xl">
        <button
          onClick={() => setResidentTab('form')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            residentTab === 'form'
              ? 'bg-white text-emerald-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-4 h-4 text-emerald-600" />
          <span>{t.household.reportWasteTab}</span>
        </button>
        <button
          onClick={() => setResidentTab('my_storage')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            residentTab === 'my_storage'
              ? 'bg-white text-emerald-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderHeart className="w-4 h-4 text-emerald-600" />
          <span>{t.household.myReportsTab} ({myStoredReports.length})</span>
        </button>
      </div>

      {/* VIEW 1: RESIDENT'S OWN STORAGE (ON PHONE) */}
      {residentTab === 'my_storage' ? (
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <span>
                  {language === 'tl'
                    ? 'Sari-sariling Storage (Iyong Cellphone)'
                    : 'Personal Device Storage (Your Phone)'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {language === 'tl'
                  ? 'Naka-save sa memorya ng iyong phone ang bawat ticket at katibayan ng Kagawad. Ikaw ang may kontrol sa storage nito.'
                  : 'Every ticket and official Kagawad cleanup proof is saved in your phone storage. You have full control over these records.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {myStoredReports.length > 0 && (
                isConfirmingClearAll ? (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-300 p-1 rounded-xl animate-in fade-in">
                    <span className="text-[11px] font-bold text-red-900 px-1">
                      {language === 'tl' ? 'Burahin lahat?' : 'Clear all?'}
                    </span>
                    <button
                      type="button"
                      onClick={handleConfirmClearAll}
                      className="text-[11px] font-black bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg cursor-pointer transition-all active:scale-95 shadow-sm"
                    >
                      {language === 'tl' ? 'Oo, Burahin' : 'Yes, Clear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingClearAll(false)}
                      className="text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-300 cursor-pointer"
                    >
                      {language === 'tl' ? 'Kansela' : 'Cancel'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingClearAll(true)}
                    className="text-[11px] font-black text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                    title={language === 'tl' ? 'Linisin ang lahat ng rekord sa iyong cellphone' : 'Clear all records from your phone'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'tl' ? 'I-clear Lahat' : 'Clear All'}</span>
                  </button>
                )
              )}
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                {myStoredReports.length} {language === 'tl' ? 'Tala' : 'Records'}
              </span>
            </div>
          </div>

          {/* Connected Gateway Notice */}
          <div className="p-3 rounded-2xl bg-slate-900 text-slate-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[11px]">
                {language === 'tl'
                  ? 'Koneksyon sa Barangay Portal: Permanente at Ligtas na Naka-sync'
                  : 'Barangay Portal Connection: Permanently & Securely Synced'}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {language === 'tl' ? 'AKTIBO' : 'ACTIVE'}
            </span>
          </div>

          {myStoredReports.length > 0 ? (
            <div className="space-y-4">
              {myStoredReports.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 shadow-2xs hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-black text-sm text-slate-900">
                        #{item.ticketNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-2">
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(item.needsAssistanceOutside || item.isWithinBrgy41 === false) && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                          ASSISTANCE
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${
                          item.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.status === 'CANCELLED'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {item.status === 'RESOLVED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {item.status === 'RESOLVED'
                          ? (language === 'tl' ? 'NA-RESOLBA (MAY PROEBA)' : 'RESOLVED (WITH PROOF)')
                          : item.status === 'CANCELLED'
                          ? (language === 'tl' ? 'KINANSELA' : 'CANCELLED')
                          : (language === 'tl' ? 'PENDING' : 'PENDING')}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Purge Reminder / Status */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      {item.status === 'RESOLVED'
                        ? (language === 'tl'
                            ? 'Naresolba: 1-araw auto-purge sa feed. Ligtas dito sa iyong phone!'
                            : 'Resolved: 1-day auto-purge on feed. Stored safely on your phone!')
                        : (language === 'tl'
                            ? 'Active: 3-araw auto-purge sa feed. Ligtas dito sa iyong phone!'
                            : 'Active: 3-day auto-purge on feed. Stored safely on your phone!')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                    <div>
                      <strong>{language === 'tl' ? 'Lokasyon:' : 'Location:'}</strong> {item.purok} ({item.streetAddress || 'Auto-GPS'})
                    </div>
                    <div>
                      <strong>{language === 'tl' ? 'Kalubhaan:' : 'Severity:'}</strong> {t.severity[item.severityLevel]?.label || item.severityLevel}
                    </div>
                    {item.extraMessage && (
                      <div className="text-emerald-800 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <strong>{language === 'tl' ? 'Mensahe sa Kagawad:' : 'Message to Kagawad:'}</strong> &quot;{item.extraMessage}&quot;
                      </div>
                    )}
                  </div>

                  {/* Resident Photos */}
                  {item.photos && item.photos.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>
                          {language === 'tl' ? 'Iyong Naipasa na Litrato' : 'Your Submitted Photos'} ({item.photos.length}):
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {language === 'tl' ? 'Naka-save sa phone memory' : 'Saved in phone memory'}
                        </span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {item.photos.map((p, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedPreviewImage(p)}
                            className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 shrink-0 cursor-pointer group"
                          >
                            <img
                              src={p}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* KAGAWAD ACTION / PROOF PHOTOS & REASON */}
                  {item.status === 'RESOLVED' && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>
                            {language === 'tl'
                              ? 'PROEBA / KATIBAYAN MULA SA KAGAWAD'
                              : 'OFFICIAL PROOF FROM BARANGAY KAGAWAD'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 font-extrabold text-[10px]">
                          OFFICIAL PROOF
                        </span>
                      </div>

                      {item.proofPhotos && item.proofPhotos.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-emerald-800 font-semibold">
                            {language === 'tl'
                              ? 'Attached na proeba ng Kagawad (Litrato ng nalinis na lugar):'
                              : 'Attached Kagawad proof photo (Cleaned location):'}
                          </p>
                          <div className="flex gap-2.5 overflow-x-auto pb-1">
                            {item.proofPhotos.map((proofImg, pIdx) => (
                              <div
                                key={pIdx}
                                onClick={() => setSelectedPreviewImage(proofImg)}
                                className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0 cursor-pointer shadow-sm group"
                              >
                                <img
                                  src={proofImg}
                                  alt="Proof"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute bottom-0 inset-x-0 bg-emerald-900/80 text-white text-[9px] font-black text-center py-0.5">
                                  {language === 'tl' ? 'Proeba' : 'Proof'} #{pIdx + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.resolutionNotes && (
                        <div className="text-xs text-emerald-900 bg-white/90 p-2.5 rounded-xl border border-emerald-200 space-y-1">
                          <div className="font-extrabold text-[11px] text-emerald-800 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{language === 'tl' ? 'Mensahe / Rason ng Kagawad:' : 'Kagawad Message / Notes:'}</span>
                          </div>
                          <p className="leading-relaxed">
                            {item.resolutionNotes}
                          </p>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500">
                        {language === 'tl' ? 'Inaksyunan ni:' : 'Action taken by:'} <strong>{item.resolvedBy || item.proofKagawadName || (language === 'tl' ? 'Barangay Kagawad' : 'Barangay Kagawad')}</strong> {item.resolvedAt ? `• ${new Date(item.resolvedAt).toLocaleString()}` : ''}
                      </div>
                    </div>
                  )}

                  {/* Actions for Resident */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                    <span className="text-[11px] text-slate-500">
                      {language === 'tl' ? 'Nasa iyong sariling phone ang kopyang ito' : 'This copy is saved in your device storage'}
                    </span>
                    <button
                      onClick={() => setReportToDelete(item)}
                      className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                      title={language === 'tl' ? 'Burahin sa sariling cellphone' : 'Delete from phone'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'tl' ? 'Burahin sa Phone' : 'Delete from Phone'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs space-y-3 flex flex-col items-center">
              <div className="w-20 h-20 rounded-3xl bg-white border border-slate-200 shadow-md flex items-center justify-center p-3">
                <ThreeDHouseholdTrash className="w-full h-full select-none" />
              </div>
              <p className="max-w-xs text-slate-500 font-medium leading-relaxed">
                {language === 'tl'
                  ? 'Wala ka pang naipapasang concern sa iyong telepono.'
                  : 'You have not submitted any concerns from this device yet.'}
              </p>
              <button
                onClick={() => setResidentTab('form')}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                {language === 'tl' ? 'Mag-report ng Basura Ngayon' : 'Report Waste Now'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: RESIDENT REPORT FORM */
        <form onSubmit={handleSubmitReport} className="space-y-4 sm:space-y-5">
          {/* Real-time GPS status banner with integrity check */}
          {isLocationEnabled && coords ? (
            <div className="bg-slate-900 text-white rounded-2xl p-2.5 px-3.5 flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white text-[11px] sm:text-xs">
                  {language === 'tl' ? 'Auto-GPS Aktibo:' : 'Auto-GPS Active:'}
                </span>
                <span className="text-emerald-400 font-mono text-[10px] sm:text-xs">
                  Cavite City ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300">
                PINNED
              </span>
            </div>
          ) : (
            <div className="bg-slate-900/90 text-slate-300 rounded-2xl p-2.5 px-3.5 flex items-center justify-between text-xs shadow-sm border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="font-bold text-slate-300 text-[11px] sm:text-xs">
                  {language === 'tl' ? 'GPS: Naka-patay / Walang Lokasyon' : 'GPS: Off / Location Blank'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => requestLocation()}
                disabled={locationStatus === 'requesting'}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black cursor-pointer transition-all"
              >
                <Navigation className={`w-3 h-3 ${locationStatus === 'requesting' ? 'animate-spin' : ''}`} />
                <span>{language === 'tl' ? 'Buksan ang GPS' : 'Enable GPS'}</span>
              </button>
            </div>
          )}


          {/* Simple Clean Notice */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <strong>{language === 'tl' ? 'Ligtas na Pagpasa ng Concern:' : 'Secure Concern Submission:'}</strong>{' '}
              {language === 'tl'
                ? 'Ang mga litratong ia-attach mo ay direktang ipapadala sa opisyal na portal ng Barangay Kagawad para sa agarang pagkolekta. Naka-save din ang personal mong kopya sa sarili mong cellphone storage na pwede mong panatilihin o burahin anumang oras.'
                : 'Attached photos are delivered directly to the official Barangay Kagawad portal for prompt collection. Your personal copy is also saved to your phone storage, which you can keep or clear anytime.'}
            </div>
          </div>

          {/* Step 1: Waste Types */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  {language === 'tl' ? 'Hakbang 1' : 'Step 1'}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {t.household.wasteTypeTitle}
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-bold">1-Tap</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {COMMON_WASTE_BUTTONS.map((item) => {
                const isSelected = selectedTypes.includes(item.title);
                const localizedTitle =
                  item.id === 'household'
                    ? t.wasteTypes.household.title
                    : item.id === 'bulky'
                    ? t.wasteTypes.bulky.title
                    : item.id === 'yard'
                    ? t.wasteTypes.yard.title
                    : t.wasteTypes.hazardous.title;
                const localizedDesc =
                  item.id === 'household'
                    ? t.wasteTypes.household.desc
                    : item.id === 'bulky'
                    ? t.wasteTypes.bulky.desc
                    : item.id === 'yard'
                    ? t.wasteTypes.yard.desc
                    : t.wasteTypes.hazardous.desc;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleWasteType(item.title)}
                    className={`p-3 sm:p-4 rounded-3xl border-2 text-left transition-all flex items-center gap-3.5 relative cursor-pointer group ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 shadow-2xs'
                    }`}
                  >
                    {/* Dedicated Pure-White Background Badge for 3D Logo */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center p-2.5 shrink-0 group-hover:scale-105 transition-transform">
                      <item.IconComponent className="w-full h-full select-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">{localizedTitle}</div>
                      <div className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-snug">{localizedDesc}</div>
                    </div>
                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Photos Attachment (Required) */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                    {language === 'tl' ? 'Hakbang 2' : 'Step 2'}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    * {language === 'tl' ? 'KINAKAILANGAN' : 'REQUIRED'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {t.household.photoTitle}
                </h3>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${photos.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                {photos.length} / 15 {language === 'tl' ? 'litrato' : 'photos'}
              </span>
            </div>

            {photos.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 shadow-xs flex items-center justify-center p-1 shrink-0">
                  <ThreeDCamera className="w-full h-full" />
                </div>
                <span>
                  {language === 'tl'
                    ? 'Kinakailangang maglagay ng sariling litrato ng basura. Bawal mag-submit nang walang litrato.'
                    : 'A photo of the waste is required before submitting.'}
                </span>
              </div>
            ) : null}

            {photoError ? (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-extrabold flex items-center gap-2">
                <span>⚠️ {photoError}</span>
              </div>
            ) : null}

            {/* Enlarged 3D Camera & Gallery Action Cards with White Background Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsLiveCameraOpen(true)}
                className="p-3.5 sm:p-4 rounded-3xl border-2 border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-left transition-all flex items-center gap-3.5 group cursor-pointer shadow-sm hover:shadow-md active:scale-98"
              >
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center p-2.5 shrink-0 group-hover:scale-105 transition-transform">
                  <ThreeDCamera className="w-full h-full select-none" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-xs sm:text-sm text-emerald-950 flex items-center gap-1.5 flex-wrap">
                    <span>{t.household.takeLivePhoto}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black">LIVE</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-1 leading-snug">
                    {language === 'tl' ? 'Diretso kuha gamit ang camera' : 'Instant camera snapshot'}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="p-3.5 sm:p-4 rounded-3xl border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-left transition-all flex items-center gap-3.5 group cursor-pointer shadow-2xs hover:shadow-sm active:scale-98"
              >
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center p-2.5 shrink-0 group-hover:scale-105 transition-transform">
                  <ThreeDFolderGallery className="w-full h-full select-none" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-xs sm:text-sm text-slate-900">
                    {t.household.uploadFromFiles}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {language === 'tl' ? 'Pumili sa gallery o file storage' : 'Choose files from gallery'}
                  </div>
                </div>
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoFiles(e.target.files)}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotoFiles(e.target.files)}
              className="hidden"
            />

            <LiveCameraModal
              isOpen={isLiveCameraOpen}
              onClose={() => setIsLiveCameraOpen(false)}
              onCapture={handleLiveCameraCapture}
              onFallbackToFile={() => galleryInputRef.current?.click()}
            />

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2">
                {photos.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-2xs"
                  >
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full shadow-md cursor-pointer hover:bg-red-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 3: Gaano Kalala ang Basura */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-3.5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                {language === 'tl' ? 'Hakbang 3' : 'Step 3'}
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {t.household.severityTitle}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SEVERITY_LEVELS.map((sev) => {
                const isSelected = severityLevel === sev.id;
                const localizedLabel = t.severity[sev.id]?.label || sev.label;
                const localizedDesc = t.severity[sev.id]?.desc || sev.tagalog;
                return (
                  <button
                    key={sev.id}
                    type="button"
                    onClick={() => setSeverityLevel(sev.id)}
                    className={`p-3 sm:p-4 rounded-3xl border-2 text-left transition-all flex items-center gap-3.5 cursor-pointer group ${
                      isSelected
                        ? `${sev.color} ring-2 ring-slate-900 shadow-md`
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 text-slate-700 shadow-2xs'
                    }`}
                  >
                    {/* Dedicated pure-white badge container for the 3D severity bag/siren */}
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center p-2.5 shrink-0 group-hover:scale-105 transition-transform">
                      <sev.IconComponent className="w-full h-full select-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-xs sm:text-sm leading-tight">{localizedLabel}</div>
                      <div className="text-[11px] opacity-80 mt-1 leading-snug">{localizedDesc}</div>
                    </div>
                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Senior Citizen Priority Flag (Purely Optional) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsElderly(!isElderly)}
                className={`w-full p-3.5 sm:p-4 rounded-3xl border-2 flex items-center justify-between transition-all cursor-pointer group ${
                  isElderly
                    ? 'border-purple-600 bg-purple-50/90 text-purple-950 ring-2 ring-purple-500 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3.5 text-left">
                  {/* Dedicated pure-white background badge */}
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center justify-center p-2.5 shrink-0 group-hover:scale-105 transition-transform">
                    <ThreeDSeniorHeart className="w-full h-full select-none" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-slate-900">
                      {t.household.elderlyPriorityTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {t.household.elderlyPrioritySubtitle}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-xs shrink-0 ${
                    isElderly ? 'bg-purple-700 text-white animate-pulse' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {isElderly
                    ? (language === 'tl' ? 'NAKA-ON' : 'ACTIVE')
                    : (language === 'tl' ? 'NAKA-OFF (Opsyonal)' : 'OFF (Optional)')}
                </span>
              </button>
            </div>
          </div>

          {/* Step 4: Lokasyon ng Bahay sa Barangay 40 o 41 & Extra Message Option */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
                  {language === 'tl' ? 'Hakbang 4' : 'Step 4'}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>{t.household.locationTitle}</span>
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                {language === 'tl' ? 'Auto-GPS Aktibo' : 'Auto-GPS Active'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setNeedsAssistanceOutside(!needsAssistanceOutside)}
              className={`w-full p-3.5 sm:p-4 rounded-3xl border-2 text-left transition-all flex items-center gap-3.5 cursor-pointer group ${
                needsAssistanceOutside
                  ? 'border-purple-600 bg-purple-50 text-purple-950 ring-2 ring-purple-600 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
              }`}
            >
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center justify-center p-2.5 shrink-0 group-hover:scale-105 transition-transform">
                <ThreeDAssistanceBeacon className="w-full h-full select-none" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                  <span>{language === 'tl' ? 'Nangangailangan ng Assistance' : 'Requires Special Assistance'}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                    {language === 'tl' ? 'Taga-Brgy 40 o 41 (Nasa Labas ng Cavite City)' : 'Resident Outside Immediate Area'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  {t.household.outsideJurisdictionWarning}
                </p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${
                  needsAssistanceOutside
                    ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                    : 'border-slate-300 bg-white text-transparent'
                }`}
              >
                ✓
              </div>
            </button>

            {/* Real-time GPS Pin details with Integrity Check */}
            {isLocationEnabled && coords ? (
              <div
                className={`p-3.5 sm:p-4 rounded-3xl border-2 text-xs flex flex-col sm:flex-row items-start sm:items-center gap-3.5 ${
                  gpsWithinJurisdiction && !needsAssistanceOutside
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-sm'
                    : 'bg-purple-50/90 border-purple-300 text-purple-950 shadow-sm'
                }`}
              >
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white border border-emerald-100 shadow-md flex items-center justify-center p-2 shrink-0">
                  <ThreeDLocationPin className="w-full h-full drop-shadow-sm select-none" />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center justify-between font-extrabold text-[11px] sm:text-xs">
                    <span className="flex items-center gap-1.5">
                      <span>{language === 'tl' ? 'Kasalukuyang Real-Time GPS Mo' : 'Your Live Detected GPS Pin'}</span>
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full ${
                        gpsWithinJurisdiction && !needsAssistanceOutside
                          ? barangay.includes('40')
                            ? 'bg-cyan-200 text-cyan-900 border border-cyan-300'
                            : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                          : 'bg-purple-200 text-purple-900 border border-purple-300'
                      }`}
                    >
                      {gpsWithinJurisdiction && !needsAssistanceOutside
                        ? barangay.includes('40')
                          ? (language === 'tl' ? '✓ Sakop ng Brgy 40' : '✓ Within Brgy 40')
                          : (language === 'tl' ? '✓ Sakop ng Brgy 41' : '✓ Within Brgy 41')
                        : (language === 'tl' ? '⚠️ Nangangailangan ng Assistance' : '⚠️ Special Assistance Needed')}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 mt-1 text-xs sm:text-sm">
                    {liveGpsAddress || `GPS: ${coords.lat}, ${coords.lng}`}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono mt-0.5">
                    Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}{' '}
                    {liveGpsAccuracy ? `(${language === 'tl' ? 'Katumpakan' : 'Accuracy'}: ±${liveGpsAccuracy}m)` : ''}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-emerald-800 font-semibold">
                      ✓ {language === 'tl' ? 'Tumpak na GPS signal nakakabit' : 'Accurate GPS signal attached'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => refreshLocation()}
                        disabled={locationStatus === 'requesting'}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        title="Refresh GPS"
                      >
                        <RotateCcw className={`w-3 h-3 ${locationStatus === 'requesting' ? 'animate-spin text-emerald-600' : ''}`} />
                        <span>{language === 'tl' ? 'I-refresh' : 'Refresh'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => resetLocation()}
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Reset GPS to blank"
                      >
                        <X className="w-3 h-3" />
                        <span>{language === 'tl' ? 'I-reset (Blank)' : 'Reset (Blank)'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/80 text-xs text-slate-600 space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white border border-slate-200/90 shadow-md flex items-center justify-center p-2 shrink-0">
                    <ThreeDLocationPin className="w-full h-full drop-shadow-sm select-none" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 block text-xs sm:text-sm">
                        {language === 'tl' ? 'GPS Lokasyon: Walang Signal / Naka-off' : 'GPS Location: Blank / Turned Off'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 shrink-0">
                        BLANK
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                      Lat: ---, Lng: --- (Walang data)
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {language === 'tl'
                    ? 'Walang lokasyong ipinapakita upang mapanatili ang integridad ng iyong data. Pindutin ang Payagan ang Lokasyon para sa awtomatikong pin, o pumili ng barangay hall pin sa ibaba.'
                    : 'Location is currently blank to preserve location integrity. Tap Allow Location Access to detect your live pin, or select a barangay hall pin below.'}
                </p>

                {locationErrorMessage && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-center gap-1.5">
                    <span>⚠️ {locationErrorMessage}</span>
                  </div>
                )}

                <div className="pt-1 space-y-2">
                  <button
                    type="button"
                    onClick={() => requestLocation()}
                    disabled={locationStatus === 'requesting'}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Navigation className={`w-4 h-4 ${locationStatus === 'requesting' ? 'animate-spin' : ''}`} />
                    <span>
                      {locationStatus === 'requesting'
                        ? (language === 'tl' ? 'Kumukonekta sa GPS...' : 'Detecting GPS...')
                        : (language === 'tl' ? 'Payagan ang Lokasyon (Auto-GPS)' : 'Allow Location Access (Auto-GPS)')}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setManualLocation('Barangay 40');
                        setBarangay('Barangay 40 (Gumamela), Cavite City');
                        setPurok('Barangay 40 (Gumamela), Cavite City');
                      }}
                      className="p-2.5 rounded-2xl bg-white hover:bg-cyan-50 text-cyan-900 border border-cyan-200 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-2 shadow-2xs group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center p-1 shrink-0 group-hover:scale-105 transition-transform">
                        <ThreeDBarangayHall className="w-full h-full" />
                      </div>
                      <span className="truncate">Brgy 40 (Gumamela)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManualLocation('Barangay 41');
                        setBarangay('Barangay 41 (Rosal), Cavite City');
                        setPurok('Barangay 41 (Rosal), Cavite City');
                      }}
                      className="p-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-2 shadow-2xs group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center p-1 shrink-0 group-hover:scale-105 transition-transform">
                        <ThreeDBarangayHall className="w-full h-full" />
                      </div>
                      <span className="truncate">Brgy 41 (Rosal)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.household.barangayLabel}
                </label>
                <select
                  value={barangay}
                  onChange={(e) => {
                    setBarangay(e.target.value);
                    setPurok(e.target.value);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50"
                >
                  {BARANGAY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'tl' ? 'Kalsada / Street' : 'Street Name'} <span className="font-normal text-slate-400">({language === 'tl' ? 'Opsyonal' : 'Optional'})</span>
                </label>
                <input
                  type="text"
                  placeholder={t.household.streetPlaceholder}
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'tl' ? 'House # / Palatandaan' : 'House # / Landmark'} <span className="font-normal text-slate-400">({language === 'tl' ? 'Opsyonal' : 'Optional'})</span>
                </label>
                <input
                  type="text"
                  placeholder={t.household.landmarkPlaceholder}
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.household.residentNameLabel} <span className="font-normal text-slate-400">({language === 'tl' ? 'Opsyonal' : 'Optional'})</span>
                </label>
                <input
                  type="text"
                  placeholder={t.household.residentNamePlaceholder}
                  value={residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-slate-50"
                />
              </div>
            </div>

            {/* OPTION 4 PINAKA BABA: EXTRA MESSAGE */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.household.notesLabel}:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {language === 'tl' ? 'Opsyonal' : 'Optional'}
                </span>
              </label>
              <textarea
                rows={2}
                value={extraMessage}
                onChange={(e) => setExtraMessage(e.target.value)}
                placeholder={t.household.notesPlaceholder}
                className="w-full p-3 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Big Action Submit Button with 3D Crest Shield */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting || photos.length === 0}
              className={`w-full py-4 sm:py-5 px-6 rounded-3xl font-black text-base sm:text-xl shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer ${
                photos.length === 0
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none border border-slate-300'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/30 active:scale-98'
              }`}
            >
              {photos.length === 0 ? (
                <div className="w-8 h-8 rounded-xl bg-white/80 border border-slate-300 flex items-center justify-center p-1 shrink-0">
                  <ThreeDCamera className="w-full h-full" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-2xl bg-white border border-emerald-300 shadow-sm flex items-center justify-center p-1 shrink-0">
                  <ThreeDCheckShield className="w-full h-full" />
                </div>
              )}
              <span>
                {isSubmitting
                  ? t.household.submittingReport
                  : photos.length === 0
                  ? (language === 'tl' ? 'KUMUHA MUNA NG LITRATO BAGO IPASA' : 'ATTACH PHOTO BEFORE SUBMITTING')
                  : t.household.submitReportBtn}
              </span>
            </button>
            {photos.length === 0 && (
              <p className="text-center text-[11px] text-rose-600 font-bold mt-2">
                * {language === 'tl' ? 'Kailangang maglagay ng 1 hanggang 15 sariling litrato ng basura bago maipadala.' : 'Must attach 1 to 15 photos of the waste before submitting.'}
              </p>
            )}
          </div>
        </form>
      )}

      {/* Delete Single Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {language === 'tl' ? 'Burahin ang Rekord na Ito?' : 'Delete This Record?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'tl' ? 'Ticket' : 'Ticket'} <strong>#{reportToDelete.ticketNumber}</strong> {language === 'tl' ? 'sa' : 'in'} {reportToDelete.purok}
              </p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                {language === 'tl' ? 'Bumalik' : 'Back'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md active:scale-98 cursor-pointer"
              >
                {language === 'tl' ? 'Burahin' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Image Preview */}
      {selectedPreviewImage && (
        <div
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img
              src={selectedPreviewImage}
              alt="Litrato"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
            />
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
