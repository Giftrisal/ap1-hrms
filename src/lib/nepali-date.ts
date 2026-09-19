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
const BS_CALENDAR_DATA: Record<number, number[]> = {
  2080: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 31],
  2083: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 31]
};

// Anchor: 2026-04-14 = 2083-01-01 (Baishakh 1, 2083)
const ANCHOR_AD_TIME = new Date('2026-04-14T00:00:00Z').getTime();
const ANCHOR_BS_YEAR = 2083;

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

export function formatDualDate(adDateInput: Date | string = new Date(), lang: 'ne' | 'en' = 'en'): string {
  const ad = typeof adDateInput === 'string' ? new Date(adDateInput) : adDateInput;
  const bs = getNepaliDate(ad);
  const adFormatted = ad.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return `${bs.formattedEn} (${adFormatted})`;
}
