'use client';

import React, { useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useLanguage } from '@/lib/i18n/context';
import { initialShifts } from '@/lib/mock-data';
import { Shift } from '@/lib/types';
import { CalendarClock, Plus, CheckCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ShiftsPage() {
  const { t, language } = useLanguage();
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [latePenaltyRule, setLatePenaltyRule] = useState('three_late_half_day');

  return (
    <DashboardShell
      title={t.navShifts}
      subtitle={language === 'en' 
        ? "Configure work shifts, office start time, grace periods, and late arrival deduction rules" 
        : "कार्यालय समय, सिफ्ट तालिका, छुट मिनेट तथा ढिलो दण्ड नियमहरू"}
    >
      {/* Shift Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shifts.map((shift) => (
          <div 
            key={shift.id} 
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden"
          >
            {shift.is_default && (
              <span className="absolute top-4 right-4 bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-200 uppercase">
                {t.defaultShift}
              </span>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{shift.name}</h4>
                <p className="text-xs text-slate-500">8 Hours standard daily working shift</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-4">
              <div>
                <span className="text-slate-500 font-medium">{t.startTime}</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{shift.start_time}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">{t.endTime}</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{shift.end_time}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">{t.gracePeriod}</span>
                <p className="text-sm font-bold text-amber-600 mt-0.5">{shift.grace_period_minutes} Minutes</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">{t.halfDayHours}</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">&lt; {shift.half_day_threshold_hours} Hours</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
              <span>Applied to 28 active staff</span>
              <button className="font-semibold text-blue-600 hover:text-blue-700">
                Edit Schedule
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Late Arrival Penalty Rules Configuration */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base">
              {language === 'en' ? 'Late Arrival Penalty Engine' : 'ढिलो हाजिरी दण्ड नियम'}
            </h4>
            <p className="text-xs text-slate-500">
              {language === 'en' 
                ? 'Automated salary deduction formula applied when staff punch in after the grace period'
                : 'छुट मिनेटपछि पञ्च गर्दा लागु हुने स्वचालित तलब कट्टी नियम'}
            </p>
          </div>
        </div>

        <div className="space-y-3 max-w-xl text-xs">
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
            <input
              type="radio"
              name="penalty_rule"
              value="three_late_half_day"
              checked={latePenaltyRule === 'three_late_half_day'}
              onChange={() => setLatePenaltyRule('three_late_half_day')}
              className="mt-0.5 text-blue-600"
            />
            <div>
              <p className="font-bold text-slate-900">
                {language === 'en' ? '3 Late Arrivals = 0.5 Day Salary Deduction (Standard Nepal Rule)' : '३ पटक ढिलो = आधा दिन तलब कट्टी'}
              </p>
              <p className="text-slate-500 mt-0.5">
                Every 3 late arrivals in a payroll month automatically deducts 0.5 day's wage during monthly payroll.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
            <input
              type="radio"
              name="penalty_rule"
              value="fixed_penalty"
              checked={latePenaltyRule === 'fixed_penalty'}
              onChange={() => setLatePenaltyRule('fixed_penalty')}
              className="mt-0.5 text-blue-600"
            />
            <div>
              <p className="font-bold text-slate-900">
                {language === 'en' ? 'Fixed Fine per Late Punch (e.g. NPR 200)' : 'प्रत्येक ढिलोमा निश्चित जरिवाना (रु. २००)'}
              </p>
              <p className="text-slate-500 mt-0.5">
                Applies a constant fine for every punch occurring after grace period ends.
              </p>
            </div>
          </label>

          <div className="pt-2">
            <button
              onClick={() => alert('Late penalty rule successfully saved and applied to Payroll Engine!')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors"
            >
              {t.saveSettings}
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
