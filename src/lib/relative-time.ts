const rtf = new Intl.RelativeTimeFormat("he", { numeric: "auto" });

const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 2629800; // average seconds/month (30.44 days)
const YEAR = 31557600; // average seconds/year (365.25 days)

/**
 * Hebrew relative time for a past/future date, picking the largest sensible
 * unit — e.g. "עכשיו", "אתמול", "לפני 3 שבועות", "לפני חודשיים". Uses
 * Intl.RelativeTimeFormat so plural/dual forms are correct.
 */
export function relativeTimeHe(date: Date, now: Date = new Date()): string {
  const sec = Math.round((date.getTime() - now.getTime()) / 1000); // negative = past
  const abs = Math.abs(sec);
  if (abs < MIN) return "עכשיו";
  if (abs < HOUR) return rtf.format(Math.round(sec / MIN), "minute");
  if (abs < DAY) return rtf.format(Math.round(sec / HOUR), "hour");
  if (abs < WEEK) return rtf.format(Math.round(sec / DAY), "day");
  if (abs < MONTH) return rtf.format(Math.round(sec / WEEK), "week");
  if (abs < YEAR) return rtf.format(Math.round(sec / MONTH), "month");
  return rtf.format(Math.round(sec / YEAR), "year");
}
