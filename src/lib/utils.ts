import type { AppState, CountryStats } from './types';

export function toDateStr(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function parseDate(str: string): Date {
	return new Date(str + 'T00:00:00');
}

export function daysInYear(year: number): number {
	return isLeapYear(year) ? 366 : 365;
}

export function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDatesInRange(from: string, to: string): string[] {
	const dates: string[] = [];
	const start = parseDate(from);
	const end = parseDate(to);
	const cur = new Date(start);
	while (cur <= end) {
		dates.push(toDateStr(cur));
		cur.setDate(cur.getDate() + 1);
	}
	return dates;
}

export function getStats(state: AppState, countryCode: string, year: number): CountryStats {
	const yearStr = String(year);
	const today = toDateStr(new Date());
	let past = 0;
	let upcoming = 0;

	for (const [dateStr, entry] of Object.entries(state.entries)) {
		if (dateStr.startsWith(yearStr + '-') && entry.country === countryCode) {
			if (dateStr <= today) past++;
			else upcoming++;
		}
	}

	const total = past + upcoming;
	const rule = state.rules[yearStr]?.[countryCode];
	const min = rule?.min ?? 0;
	const max = rule?.max ?? Infinity;

	return {
		past,
		upcoming,
		total,
		toMin:      Math.max(0, min - past),
		toMax:      max === Infinity ? Infinity : Math.max(0, max - past),
		overMax:    max !== Infinity && past > max,
		toMinSim:   Math.max(0, min - total),
		overMaxSim: max !== Infinity && total > max
	};
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			}
		: null;
}

export function colorWithOpacity(hex: string, opacity: number): string {
	const rgb = hexToRgb(hex);
	if (!rgb) return hex;
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

export function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number, weekStartsMonday: boolean): number {
	const day = new Date(year, month, 1).getDay();
	if (weekStartsMonday) return (day + 6) % 7;
	return day;
}
