'use client';

import { useState, useEffect, useCallback } from 'react';
import { LicensePayload, LicenseTier, LICENSE_TIERS } from './license-manager';

const STORAGE_KEY = 'goinfi_active_license_v1';
const EVENT_NAME = 'goinfi_license_changed';

export interface UseLicenseResult {
  license: LicensePayload | null;
  isValid: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  timeRemainingLabel: string;
  loading: boolean;
  activate: (key: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  reload: () => void;
}

export function useLicense(): UseLicenseResult {
  const [license, setLicense] = useState<LicensePayload | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronize authoritative license from Cloud Server
  const syncWithCloudServer = useCallback(async () => {
    try {
      const res = await fetch('/api/license', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.activeLicense && data.activeLicense.key && data.activeLicense.expiresAt) {
          const serverLic: LicensePayload = data.activeLicense;
          
          setLicense(prev => {
            // Only update if key or expiry is different to prevent redundant re-renders
            if (!prev || prev.key !== serverLic.key || prev.expiresAt !== serverLic.expiresAt) {
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(serverLic));
              } catch {}
              return serverLic;
            }
            return prev;
          });
          setLoading(false);
          return serverLic;
        }
      }
    } catch (err) {
      console.warn('[useLicense] Cloud sync warning:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLocalCachedLicense = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: LicensePayload = JSON.parse(saved);
        if (parsed && parsed.expiresAt && parsed.key) {
          setLicense(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      console.error('Error reading cached license:', e);
    }
  }, []);

  useEffect(() => {
    // 1. Instantly display cached license from localStorage (no blank UI)
    loadLocalCachedLicense();

    // 2. Immediately fetch authoritative real-time state from cloud database
    syncWithCloudServer();

    // 3. Auto-sync on window focus (switching tabs or opening Office PC)
    const handleFocus = () => {
      syncWithCloudServer();
    };

    // 4. Background polling every 20 seconds for cross-device real-time sync
    const pollTimer = setInterval(() => {
      syncWithCloudServer();
    }, 20000);

    const handleLocalUpdate = () => {
      loadLocalCachedLicense();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener(EVENT_NAME, handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(EVENT_NAME, handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, [loadLocalCachedLicense, syncWithCloudServer]);

  const now = Date.now();
  const expiresAt = license?.expiresAt || 0;
  const msRemaining = Math.max(0, expiresAt - now);
  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  
  let timeRemainingLabel = `${daysRemaining} दिन (Days)`;
  if (hoursRemaining <= 24) {
    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const mins = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
    timeRemainingLabel = `${hours} घण्टा ${mins} मिनेट (${hours}h ${mins}m)`;
  } else if (daysRemaining <= 7) {
    timeRemainingLabel = `${daysRemaining} दिन (${daysRemaining} Days)`;
  }

  const isExpired = license ? now > expiresAt : false;
  const isExpiringSoon = !isExpired && (hoursRemaining <= 24 || daysRemaining <= 15);
  const isValid = !!license && !isExpired;

  // Background SMS notification trigger is completely disabled as per user instruction
  useEffect(() => {
    // Disabled - no automatic SMS alerts
  }, [loading, isExpiringSoon, isExpired]);

  const activate = async (key: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', key: key.trim().toUpperCase() })
      });

      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error || 'लाइसेन्स सक्रिय हुन सकेन' };
      }

      const newPayload: LicensePayload = data.payload;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPayload));
      } catch {}
      setLicense(newPayload);

      // Broadcast update event to all components on this client
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: newPayload }));

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'नेटवर्क त्रुटि' };
    }
  };

  return {
    license,
    isValid,
    isExpired,
    isExpiringSoon,
    daysRemaining,
    hoursRemaining,
    timeRemainingLabel,
    loading,
    activate,
    reload: syncWithCloudServer
  };
}
