'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  X, 
  RotateCcw 
} from 'lucide-react';
import { 
  getNepaliDate, 
  bsToAd, 
  getDaysInBsMonth, 
  NEPALI_MONTHS_NP, 
  NEPALI_DAYS_SHORT_NP, 
  toNepaliDigits, 
  AVAILABLE_BS_YEARS 
} from '@/lib/nepali-date';

interface NepaliDatePickerProps {
  value: string; // ISO AD date "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  className?: string;
  placeholder?: string;
  showDayOfWeek?: boolean;
}

// Convert BS Year, Month, Day to AD YYYY-MM-DD
function formatBsToAdString(bsYear: number, bsMonth: number, bsDay: number): string {
  const dt = bsToAd(bsYear, bsMonth, bsDay);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export default function NepaliDatePicker({
  value,
  onChange,
  className = '',
  placeholder = 'नेपाली मिति छान्नुहोस्',
  showDayOfWeek = true
}: NepaliDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active selected BS Date
  const selectedBs = useMemo(() => {
    try {
      return getNepaliDate(value || new Date());
    } catch {
      return getNepaliDate(new Date());
    }
  }, [value]);

  // Today's BS Date for quick jump and badge highlight
  const todayBs = useMemo(() => getNepaliDate(new Date()), []);

  // Calendar View State (Year and Month currently viewed in the popup)
  const [viewYear, setViewYear] = useState<number>(() => selectedBs.bsYear);
  const [viewMonth, setViewMonth] = useState<number>(() => selectedBs.bsMonth);

  // Synchronize view when selected date changes externally
  useEffect(() => {
    setViewYear(selectedBs.bsYear);
    setViewMonth(selectedBs.bsMonth);
  }, [selectedBs.bsYear, selectedBs.bsMonth]);

  // Close popup on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      if (AVAILABLE_BS_YEARS.includes(viewYear - 1)) {
        setViewYear(viewYear - 1);
        setViewMonth(12);
      }
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      if (AVAILABLE_BS_YEARS.includes(viewYear + 1)) {
        setViewYear(viewYear + 1);
        setViewMonth(1);
      }
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Day calculations for the active view month
  const totalDaysInMonth = useMemo(() => {
    return getDaysInBsMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  // Starting day of week: 0 = Sunday (आइतबार), 6 = Saturday (शनिबार)
  const startDayOfWeek = useMemo(() => {
    const firstDayAd = bsToAd(viewYear, viewMonth, 1);
    return firstDayAd.getUTCDay();
  }, [viewYear, viewMonth]);

  // Select a specific BS Day
  const handleSelectDay = (dayNum: number) => {
    const adDateStr = formatBsToAdString(viewYear, viewMonth, dayNum);
    onChange(adDateStr);
    setIsOpen(false);
  };

  // Jump to Today
  const handleJumpToday = () => {
    setViewYear(todayBs.bsYear);
    setViewMonth(todayBs.bsMonth);
    const todayAd = formatBsToAdString(todayBs.bsYear, todayBs.bsMonth, todayBs.bsDay);
    onChange(todayAd);
    setIsOpen(false);
  };

  // Jump to Yesterday
  const handleJumpYesterday = () => {
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yBs = getNepaliDate(yesterdayDate);
    setViewYear(yBs.bsYear);
    setViewMonth(yBs.bsMonth);
    const yAd = formatBsToAdString(yBs.bsYear, yBs.bsMonth, yBs.bsDay);
    onChange(yAd);
    setIsOpen(false);
  };

  const displayFormatted = useMemo(() => {
    if (!selectedBs) return placeholder;
    const dayName = showDayOfWeek && selectedBs.dayNameNp ? ` (${selectedBs.dayNameNp})` : '';
    return `${toNepaliDigits(selectedBs.bsYear)} ${selectedBs.monthNameNp} ${toNepaliDigits(selectedBs.bsDay)}${dayName}`;
  }, [selectedBs, showDayOfWeek, placeholder]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
          isOpen
            ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-100 shadow-xs'
            : 'bg-white border-slate-300 text-slate-800 hover:border-purple-400 hover:bg-slate-50 shadow-2xs'
        }`}
        title="नेपाली क्यालेन्डर (Bikram Sambat Calendar) खोल्नुहोस्"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
        <span className="text-[11px] text-slate-500 font-medium">मिति:</span>
        <span className="font-bold text-slate-900 tracking-tight">{displayFormatted}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Nepali Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 w-76 sm:w-80 animate-fade-in">
          {/* Header Controls: Navigation & Selectors */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="अघिल्लो महिना"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              {/* Year Select */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 cursor-pointer focus:outline-none focus:border-purple-500"
              >
                {AVAILABLE_BS_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {toNepaliDigits(y)} साल
                  </option>
                ))}
              </select>

              {/* Month Select */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-purple-900 cursor-pointer focus:outline-none focus:border-purple-500"
              >
                {NEPALI_MONTHS_NP.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="पछिल्लो महिना"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets: आज / हिजो */}
          <div className="grid grid-cols-2 gap-1.5 my-2 pt-0.5">
            <button
              type="button"
              onClick={handleJumpToday}
              className="py-1 px-2 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold text-center transition-colors cursor-pointer"
            >
              आज ({toNepaliDigits(todayBs.bsDay)} {todayBs.monthNameNp})
            </button>
            <button
              type="button"
              onClick={handleJumpYesterday}
              className="py-1 px-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold text-center transition-colors cursor-pointer"
            >
              हिजो
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold py-1 text-slate-500 border-b border-slate-100">
            {NEPALI_DAYS_SHORT_NP.map((d, idx) => (
              <span
                key={d}
                className={idx === 6 ? 'text-rose-600 font-extrabold' : ''}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 mt-1.5">
            {/* Leading empty spaces before 1st of month */}
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8" />
            ))}

            {/* Day Cells */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const isSelected =
                viewYear === selectedBs.bsYear &&
                viewMonth === selectedBs.bsMonth &&
                dayNum === selectedBs.bsDay;

              const isToday =
                viewYear === todayBs.bsYear &&
                viewMonth === todayBs.bsMonth &&
                dayNum === todayBs.bsDay;

              // Day of week for this date (0 = Sun, 6 = Sat)
              const dayOfWeek = (startDayOfWeek + idx) % 7;
              const isSaturday = dayOfWeek === 6;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer relative ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-200 scale-105'
                      : isToday
                      ? 'bg-blue-50 text-blue-700 border border-blue-400 hover:bg-blue-100'
                      : isSaturday
                      ? 'text-rose-600 hover:bg-rose-50 font-extrabold'
                      : 'text-slate-800 hover:bg-slate-100'
                  }`}
                  title={`${toNepaliDigits(viewYear)} ${NEPALI_MONTHS_NP[viewMonth - 1]} ${toNepaliDigits(dayNum)} गते`}
                >
                  <span>{toNepaliDigits(dayNum)}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-blue-600 absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span className="font-semibold text-purple-700">
              {NEPALI_MONTHS_NP[viewMonth - 1]} {toNepaliDigits(viewYear)} (वि.सं.)
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 font-bold px-1 py-0.5 rounded cursor-pointer"
            >
              बन्द गर्नुहोस्
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
