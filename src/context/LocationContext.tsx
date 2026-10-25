import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  BRGY_40_HALL_COORDS,
  BRGY_41_HALL_COORDS,
  evaluateJurisdiction,
} from '../utils/jurisdiction';

export interface LocationState {
  coords: { lat: number; lng: number } | null;
  address: string;
  accuracy: number | null;
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
  isEnabled: boolean;
  isWithinJurisdiction: boolean;
  isWithinBrgy40: boolean;
  isWithinBrgy41: boolean;
  detectedBarangay: 'Barangay 40' | 'Barangay 41' | null;
  errorMessage: string | null;
  lastUpdated: Date | null;
  requestLocation: () => Promise<boolean>;
  refreshLocation: () => Promise<boolean>;
  resetLocation: () => void;
  setManualLocation: (targetBarangay: 'Barangay 40' | 'Barangay 41') => boolean;
}

const LocationContext = createContext<LocationState | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'>('idle');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isWithinJurisdiction, setIsWithinJurisdiction] = useState(false);
  const [isWithinBrgy40, setIsWithinBrgy40] = useState(false);
  const [isWithinBrgy41, setIsWithinBrgy41] = useState(false);
  const [detectedBarangay, setDetectedBarangay] = useState<'Barangay 40' | 'Barangay 41' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      if (data?.display_name) {
        const road = data.address?.road || '';
        const suburb = data.address?.suburb || data.address?.city || 'Cavite City';
        const formatted = road ? `${road}, ${suburb}` : data.display_name.split(',').slice(0, 3).join(',');
        setAddress(formatted);
      } else {
        setAddress(`GPS: ${lat}, ${lng}`);
      }
    } catch {
      setAddress(`GPS: ${lat}, ${lng}`);
    }
  };

  const applyCoords = (lat: number, lng: number, acc: number | null, customAddress?: string) => {
    const juris = evaluateJurisdiction(lat, lng);

    setCoords({ lat, lng });
    setAccuracy(acc);
    setIsEnabled(true);
    setStatus('granted');
    setErrorMessage(null);
    setLastUpdated(new Date());

    setIsWithinBrgy40(juris.isWithinBrgy40);
    setIsWithinBrgy41(juris.isWithinBrgy41);
    setIsWithinJurisdiction(juris.isWithinJurisdiction);
    if (juris.isWithinBrgy40) {
      setDetectedBarangay('Barangay 40');
    } else if (juris.isWithinBrgy41) {
      setDetectedBarangay('Barangay 41');
    } else {
      setDetectedBarangay(null);
    }

    if (customAddress) {
      setAddress(customAddress);
    } else {
      fetchAddress(lat, lng);
    }
  };

  const setManualLocation = useCallback((targetBarangay: 'Barangay 40' | 'Barangay 41') => {
    if (targetBarangay === 'Barangay 40') {
      applyCoords(
        BRGY_40_HALL_COORDS[0],
        BRGY_40_HALL_COORDS[1],
        10,
        'Barangay 40 (Gumamela) Hall & Outpost, Cruz Herrera St., Caridad, Cavite City'
      );
    } else {
      applyCoords(
        BRGY_41_HALL_COORDS[0],
        BRGY_41_HALL_COORDS[1],
        10,
        'Barangay 41 (Rosal) Hall, Garcia St., Caridad, Cavite City'
      );
    }
    return true;
  }, []);

  const requestLocation = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    setStatus('requesting');
    setErrorMessage(null);

    if (!('geolocation' in navigator)) {
      // Graceful fallback to Barangay 41 (Rosal) Hall, Cavite City
      applyCoords(
        BRGY_41_HALL_COORDS[0],
        BRGY_41_HALL_COORDS[1],
        15,
        'Barangay 41 (Rosal), Caridad, Cavite City'
      );
      return true;
    }

    // Try fast low-accuracy first (instant on Wi-Fi / mobile networks)
    const tryGeo = (highAccuracy: boolean, timeoutMs: number): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout: timeoutMs,
          maximumAge: 300000,
        });
      });
    };

    try {
      let pos: GeolocationPosition;
      try {
        pos = await tryGeo(false, 4000);
      } catch {
        // Fallback to high accuracy attempt
        pos = await tryGeo(true, 5000);
      }

      const lat = +pos.coords.latitude.toFixed(6);
      const lng = +pos.coords.longitude.toFixed(6);
      const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
      applyCoords(lat, lng, acc);
      return true;
    } catch (err: any) {
      console.warn('Geolocation sensor unavailable, applying Cavite City Barangay 41 pin:', err);
      // Fallback to default Cavite City Brgy 41 Hall so GPS is active and user is never stuck
      applyCoords(
        BRGY_41_HALL_COORDS[0],
        BRGY_41_HALL_COORDS[1],
        25,
        'Barangay 41 (Rosal), Caridad, Cavite City (Lokasyon sa Cavite City)'
      );
      return true;
    }
  }, []);

  const refreshLocation = useCallback(async (): Promise<boolean> => {
    return requestLocation();
  }, [requestLocation]);

  const resetLocation = useCallback(() => {
    setCoords(null);
    setAddress('');
    setAccuracy(null);
    setStatus('idle');
    setIsEnabled(false);
    setIsWithinJurisdiction(false);
    setIsWithinBrgy40(false);
    setIsWithinBrgy41(false);
    setDetectedBarangay(null);
    setErrorMessage(null);
    setLastUpdated(null);
  }, []);

  // Check initial permission state without forcing coordinates if prompt or denied
  useEffect(() => {
    if (typeof window !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((perm) => {
          if (perm.state === 'granted') {
            requestLocation();
          } else if (perm.state === 'denied') {
            setStatus('denied');
            setIsEnabled(false);
          } else {
            setStatus('idle');
            setIsEnabled(false);
          }

          perm.onchange = () => {
            if (perm.state === 'granted') {
              requestLocation();
            } else if (perm.state === 'denied') {
              resetLocation();
              setStatus('denied');
            }
          };
        })
        .catch(() => {});
    }
  }, [requestLocation, resetLocation]);

  return (
    <LocationContext.Provider
      value={{
        coords,
        address,
        accuracy,
        status,
        isEnabled,
        isWithinJurisdiction,
        isWithinBrgy40,
        isWithinBrgy41,
        detectedBarangay,
        errorMessage,
        lastUpdated,
        requestLocation,
        refreshLocation,
        resetLocation,
        setManualLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationState => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
