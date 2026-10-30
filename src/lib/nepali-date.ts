/**
 * Bikram Sambat (BS) Nepali Calendar & Date Converter
 * Provides accurate AD to BS conversion, Nepali month names, days, and dual date formatting.
 */

// Month names in Nepali and Romanized English
export const NEPALI_MONTHS_NP = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'
];

export const NEPALI_MONTHS_EN = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

export const NEPALI_DAYS_NP = [
  'आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'
];

export const NEPALI_DAYS_SHORT_NP = [
  'आइत', 'सोम', 'मंगलबार', 'बुध', 'बिही', 'शुक्र', 'शनि'
];

// Number converter to Nepali numerals (०, १, २...)
export function toNepaliDigits(num: number | string): string {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return num
    .toString()
    .split('')
    .map(char => {
      const parsed = parseInt(char, 10);
      return isNaN(parsed) ? char : nepaliDigits[parsed];
    })
    .join('');
}

export interface BSDate {
  bsYear: number;
  bsMonth: number; // 1-12
  bsDay: number;
  monthNameNp: string;
  monthNameEn: string;
  dayNameNp: string;
  formattedNp: string;
  formattedEn: string;
}

// Days in months for 2080 to 2085 BS
export const BS_CALENDAR_DATA: Record<number, number[]> = {
  2080: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 31],
  2083: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 31]
};

// Anchor: 2026-04-14 = 2083-01-01 (Baishakh 1, 2083)
export const ANCHOR_AD_TIME = new Date('2026-04-14T00:00:00Z').getTime();
export const ANCHOR_BS_YEAR = 2083;

export function getDaysInBsMonth(bsYear: number, bsMonth: number): number {
  return (BS_CALENDAR_DATA[bsYear] && BS_CALENDAR_DATA[bsYear][bsMonth - 1]) || 30;
}

export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
  let days = 0;
  if (bsYear >= ANCHOR_BS_YEAR) {
    for (let y = ANCHOR_BS_YEAR; y < bsYear; y++) {
      const yDays = (BS_CALENDAR_DATA[y] || []).reduce((a, b) => a + b, 0);
      days += yDays;
    }
    for (let m = 0; m < bsMonth - 1; m++) {
      days += (BS_CALENDAR_DATA[bsYear] && BS_CALENDAR_DATA[bsYear][m]) || 30;
    }
    days += (bsDay - 1);
  } else {
    for (let y = bsYear; y < ANCHOR_BS_YEAR; y++) {
      const yDays = (BS_CALENDAR_DATA[y] || []).reduce((a, b) => a + b, 0);
      days -= yDays;
    }
    for (let m = 0; m < bsMonth - 1; m++) {
      days += (BS_CALENDAR_DATA[bsYear] && BS_CALENDAR_DATA[bsYear][m]) || 30;
    }
    days += (bsDay - 1);
  }
  const adTime = ANCHOR_AD_TIME + days * 24 * 60 * 60 * 1000;
  return new Date(adTime);
}

export function getNepaliDate(adDateInput: Date | string = new Date()): BSDate {
  const adDate = typeof adDateInput === 'string' ? new Date(adDateInput) : adDateInput;
  const utcDate = new Date(Date.UTC(adDate.getFullYear(), adDate.getMonth(), adDate.getDate()));
  
  const diffDays = Math.floor((utcDate.getTime() - ANCHOR_AD_TIME) / (1000 * 60 * 60 * 24));
  
  let curYear = ANCHOR_BS_YEAR;
  let curMonth = 0; // 0-indexed (0 = Baishakh)
  let curDay = 1;
  
  if (diffDays >= 0) {
    let remaining = diffDays;
    while (remaining > 0) {
      const monthDays = (BS_CALENDAR_DATA[curYear] && BS_CALENDAR_DATA[curYear][curMonth]) || 30;
      if (remaining >= monthDays) {
        remaining -= monthDays;
        curMonth++;
        if (curMonth >= 12) {
          curMonth = 0;
          curYear++;
        }
      } else {
        curDay += remaining;
        remaining = 0;
      }
    }
  } else {
    let remaining = Math.abs(diffDays);
    while (remaining > 0) {
      curMonth--;
      if (curMonth < 0) {
        curMonth = 11;
        curYear--;
      }
      const monthDays = (BS_CALENDAR_DATA[curYear] && BS_CALENDAR_DATA[curYear][curMonth]) || 30;
      if (remaining >= monthDays) {
        remaining -= monthDays;
      } else {
        curDay = monthDays - remaining + 1;
        remaining = 0;
      }
    }
  }

  const dayOfWeek = adDate.getDay(); // 0 = Sunday
  const monthNameNp = NEPALI_MONTHS_NP[curMonth] || 'बैशाख';
  const monthNameEn = NEPALI_MONTHS_EN[curMonth] || 'Baishakh';
  const dayNameNp = NEPALI_DAYS_NP[dayOfWeek] || 'आइतबार';

  const formattedNp = `${toNepaliDigits(curYear)} ${monthNameNp} ${toNepaliDigits(curDay)}, ${dayNameNp}`;
  const formattedEn = `${monthNameEn} ${curDay}, ${curYear} BS`;

  return {
    bsYear: curYear,
    bsMonth: curMonth + 1,
    bsDay: curDay,
    monthNameNp,
    monthNameEn,
    dayNameNp,
    formattedNp,
    formattedEn
  };
}

/**
 * Returns an array of YYYY-MM-DD AD date strings for every day in the specified BS month.
 * e.g. For (2083, 7) [Kartik 2083], returns all 30 dates from 2026-10-18 to 2026-11-16.
 */
export function getBsMonthAdDates(bsYear: number, bsMonth: number): string[] {
  const daysInMonth = getDaysInBsMonth(bsYear, bsMonth);
  const adDates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const adDate = bsToAd(bsYear, bsMonth, day);
    const y = adDate.getUTCFullYear();
    const m = String(adDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(adDate.getUTCDate()).padStart(2, '0');
    adDates.push(`${y}-${m}-${d}`);
  }
  return adDates;
}

/**
 * Returns the AD date string YYYY-MM-DD for a specific BS date
 */
export function bsDateToAdString(bsYear: number, bsMonth: number, bsDay: number): string {
  const adDate = bsToAd(bsYear, bsMonth, bsDay);
  const y = adDate.getUTCFullYear();
  const m = String(adDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(adDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format BS Date as Nepali string, e.g. "२०८३ कार्तिक १०, मंगलबार"
 */
export function formatNepaliFullDate(adDateInput: Date | string = new Date()): string {
  const bs = getNepaliDate(adDateInput);
  return bs.formattedNp;
}

/**
 * Format Month & Year in Nepali BS, e.g. "कार्तिक २०८३"
 */
export function formatNepaliMonthYear(bsYear: number, bsMonth: number): string {
  const monthName = NEPALI_MONTHS_NP[bsMonth - 1] || 'बैशाख';
  return `${monthName} ${toNepaliDigits(bsYear)}`;
}

export const AVAILABLE_BS_YEARS = [2080, 2081, 2082, 2083, 2084, 2085];

export interface BsDateRangeItem {
  bsYear: number;
  bsMonth: number;
  bsDay: number;
  bsDateStr: string;        // "२०८३/०७/०२"
  formattedNp: string;      // "२०८३ कार्तिक ०२, सोमबार"
  adDateStr: string;        // "2026-10-19"
  dayNameNp: string;        // "सोमबार"
  dayNameEn: string;        // "Monday"
  dayOfWeek: number;        // 0-6
}

/**
 * Returns an array of date items for every day in the specified BS date range.
 * e.g. from (2083, 7, 2) to (2083, 7, 5) returns Kartik 2, 3, 4, 5.
 */
export function getBsDateRange(
  fromYear: number,
  fromMonth: number,
  fromDay: number,
  toYear: number,
  toMonth: number,
  toDay: number
): BsDateRangeItem[] {
  let startAd = bsToAd(fromYear, fromMonth, fromDay);
  let endAd = bsToAd(toYear, toMonth, toDay);

  if (startAd.getTime() > endAd.getTime()) {
    const tmp = startAd;
    startAd = endAd;
    endAd = tmp;
  }

  const items: BsDateRangeItem[] = [];
  const cur = new Date(startAd.getTime());

  // Loop day by day until endAd
  while (cur.getTime() <= endAd.getTime() + 12 * 60 * 60 * 1000) {
    const bs = getNepaliDate(cur);
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cur.getUTCDate()).padStart(2, '0');
    const adDateStr = `${y}-${m}-${d}`;

    const bsMonthPadded = String(bs.bsMonth).padStart(2, '0');
    const bsDayPadded = String(bs.bsDay).padStart(2, '0');
    const bsDateStr = `${bs.bsYear}/${bsMonthPadded}/${bsDayPadded}`;
    const weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    items.push({
      bsYear: bs.bsYear,
      bsMonth: bs.bsMonth,
      bsDay: bs.bsDay,
      bsDateStr,
      formattedNp: bs.formattedNp,
      adDateStr,
      dayNameNp: bs.dayNameNp,
      dayNameEn: weekdaysEn[cur.getUTCDay()],
      dayOfWeek: cur.getUTCDay()
    });

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return items;
}

/**
 * Formats a BS Date Range in pure Nepali wording
 * e.g. "२०८३ कार्तिक ०२ देखि ०५ गते सम्म" or "२०८३ कार्तिक ०२ देखि २०८३ मंसिर ०५ सम्म"
 */
export function formatBsDateRangeLabel(
  fromYear: number,
  fromMonth: number,
  fromDay: number,
  toYear: number,
  toMonth: number,
  toDay: number
): string {
  const fromMonthName = NEPALI_MONTHS_EN[fromMonth - 1] || 'Kartik';
  const toMonthName = NEPALI_MONTHS_EN[toMonth - 1] || 'Kartik';
  
  if (fromYear === toYear && fromMonth === toMonth) {
    if (fromDay === toDay) {
      return `${fromYear} ${fromMonthName} ${fromDay} BS`;
    }
    return `${fromYear} ${fromMonthName} ${fromDay} - ${toDay} BS`;
  } else if (fromYear === toYear) {
    return `${fromYear} ${fromMonthName} ${fromDay} - ${toMonthName} ${toDay} BS`;
  }
  return `${fromYear} ${fromMonthName} ${fromDay} - ${toYear} ${toMonthName} ${toDay} BS`;
}

export function formatDualDate(adDateInput: Date | string = new Date(), lang: 'ne' | 'en' = 'ne'): string {
  const ad = typeof adDateInput === 'string' ? new Date(adDateInput) : adDateInput;
  const bs = getNepaliDate(ad);
  return bs.formattedNp;
}
