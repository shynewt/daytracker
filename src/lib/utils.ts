import type { AppState, CountryStats, Rule, Trip } from './types';

// btoa only accepts Latin1, and state JSON may contain emoji.
export function bytesToBinary(bytes: Uint8Array): string {
	let bin = '';
	const chunk = 0x8000; // spread has an argument-count limit; chunk it
	for (let i = 0; i < bytes.length; i += chunk) {
		bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return bin;
}

export function encodeB64(str: string): string {
	return btoa(bytesToBinary(new TextEncoder().encode(str)));
}

export function decodeB64(b64: string): string {
	return new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
}

export function toDateStr(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function parseDate(str: string): Date {
	return new Date(str + 'T00:00:00');
}

export function todayStr(): string {
	return toDateStr(new Date());
}

export function addDays(dateStr: string, n: number): string {
	const d = parseDate(dateStr);
	d.setDate(d.getDate() + n);
	return toDateStr(d);
}

export function daysBetween(from: string, to: string): number {
	return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000);
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

/** Normalize a stored rule: min/target 0 = unset, max >= 366 = unset */
export function getRule(state: AppState, year: number, code: string): Required<Rule> {
	const r = state.rules[String(year)]?.[code];
	return {
		min: r?.min ?? 0,
		target: r?.target ?? 0,
		max: r?.max !== undefined && r.max < 366 ? r.max : 366
	};
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jan 12" or "Jan 12 '26" when the year differs from the reference year */
export function formatShort(dateStr: string, refYear?: number): string {
	const y = parseInt(dateStr.slice(0, 4));
	const m = parseInt(dateStr.slice(5, 7));
	const d = parseInt(dateStr.slice(8, 10));
	const base = `${MONTHS_SHORT[m - 1]} ${d}`;
	return refYear !== undefined && y !== refYear ? `${base} '${String(y).slice(2)}` : base;
}

export function getStats(state: AppState, countryCode: string, year: number): CountryStats {
	const yearStr = String(year);
	const today = todayStr();
	let past = 0;
	let upcoming = 0;
	let hitMax: string | null = null;
	let hitTarget: string | null = null;

	const dates = Object.keys(state.entries)
		.filter(d => d.startsWith(yearStr + '-') && state.entries[d].country === countryCode)
		.sort();

	const { min, target, max } = getRule(state, year, countryCode);

	let cum = 0;
	for (const d of dates) {
		if (d <= today) past++;
		else upcoming++;
		cum++;
		if (!hitMax && max < 366 && cum >= max) hitMax = d;
		if (!hitTarget && target > 0 && cum >= target) hitTarget = d;
	}

	const total = past + upcoming;

	return {
		past,
		upcoming,
		total,
		min,
		target,
		max: max < 366 ? max : 0,
		toMin: Math.max(0, min - past),
		toTarget: target > 0 ? Math.max(0, target - total) : 0,
		toMax: max < 366 ? Math.max(0, max - total) : Infinity,
		overMax: max < 366 && total > max,
		minMetSim: min > 0 && total >= min,
		targetMet: target > 0 && total >= target,
		maxHitDate: max < 366 && total >= max ? hitMax : null,
		targetHitDate: target > 0 && total >= target ? hitTarget : null
	};
}

/**
 * Derive trips: maximal runs of consecutive days in the same country.
 * A trip that includes today and matches the current presence is marked ongoing.
 */
export function getTrips(state: AppState, year?: number): Trip[] {
	const today = todayStr();
	const dates = Object.keys(state.entries).sort();
	if (dates.length === 0) return [];

	const trips: Trip[] = [];
	let country = state.entries[dates[0]].country;
	let from = dates[0];
	let prev = dates[0];

	for (let i = 1; i < dates.length; i++) {
		const d = dates[i];
		const c = state.entries[d].country;
		if (c === country && d === addDays(prev, 1)) {
			prev = d;
		} else {
			trips.push({ country, from, to: prev, days: daysBetween(from, prev) + 1, ongoing: false });
			country = c;
			from = d;
			prev = d;
		}
	}
	trips.push({ country, from, to: prev, days: daysBetween(from, prev) + 1, ongoing: false });

	// Mark ongoing: trip covering today in the presence country
	if (state.presence) {
		const cur = trips.find(t => t.from <= today && today <= t.to && t.country === state.presence!.country);
		if (cur) cur.ongoing = true;
	}

	if (year !== undefined) {
		const y = String(year);
		return trips.filter(t => t.from.startsWith(y + '-') || t.to.startsWith(y + '-'));
	}
	return trips;
}

/** Consecutive days in `code` ending today (the current streak) */
export function getCurrentStreak(state: AppState, code: string): number {
	let streak = 0;
	let d = todayStr();
	while (state.entries[d]?.country === code) {
		streak++;
		d = addDays(d, -1);
	}
	return streak;
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

/** Display emoji for a country: custom emoji first, then the ISO flag */
export function getCountryEmoji(code: string, country?: { emoji?: string }): string {
	return country?.emoji ?? getCountryFlag(code);
}

export function getCountryFlag(code: string): string {
	if (code.length !== 2) return '';
	const offset = 0x1F1E6 - 65;
	return [...code.toUpperCase()]
		.map(c => String.fromCodePoint(c.charCodeAt(0) + offset))
		.join('');
}

export function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number, weekStartsMonday: boolean): number {
	const day = new Date(year, month, 1).getDay();
	if (weekStartsMonday) return (day + 6) % 7;
	return day;
}
