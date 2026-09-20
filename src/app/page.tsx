'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('goinfi_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          router.replace('/dashboard');
          return;
        }
      }
    } catch (e) {}
    router.replace('/login');
  }, [router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-3">
        <img 
          src="/ap1-logo.png" 
          alt="AP1 Television" 
          className="h-12 w-auto object-contain mb-1 animate-pulse" 
          style={{ aspectRatio: '800/339' }} 
        />
        <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-medium">Loading AP1 Television HRMS...</p>
      </div>
    </div>
  );
}
