import type { AppState } from './types';
import { getDatesInRange, toDateStr, parseDate, getStats } from './utils';

const STORAGE_KEY = 'daytracker_data';

function defaultState(): AppState {
	return {
		version: 1,
		countries: {},
		rules: {},
		entries: {},
		settings: { weekStartsMonday: true }
	};
}

function loadFromStorage(): AppState {
	if (typeof localStorage === 'undefined') return defaultState();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultState();
		const parsed = JSON.parse(raw);
		if (parsed.version === 1) return parsed as AppState;
	} catch {
		// ignore
	}
	return defaultState();
}

export const appState = $state<AppState>(defaultState());

let initialized = false;

export function initStore() {
	if (initialized) return;
	initialized = true;
	Object.assign(appState, loadFromStorage());
}

$effect.root(() => {
	$effect(() => {
		const snapshot = JSON.stringify(appState);
		if (initialized && typeof localStorage !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, snapshot);
		}
	});
});

export function setEntryRange(from: string, to: string, country: string) {
	for (const date of getDatesInRange(from, to)) {
		appState.entries[date] = { country };
	}
}

export function removeEntryRange(from: string, to: string) {
	for (const date of getDatesInRange(from, to)) {
		delete appState.entries[date];
	}
}

export function setCountry(code: string, name: string, color: string) {
	appState.countries[code] = { name, color };
}

export function removeCountry(code: string) {
	delete appState.countries[code];
	for (const [date, entry] of Object.entries(appState.entries)) {
		if (entry.country === code) delete appState.entries[date];
	}
	for (const year of Object.keys(appState.rules)) {
		delete appState.rules[year][code];
	}
}

export function setRule(year: string, countryCode: string, min: number, max: number) {
	if (!appState.rules[year]) appState.rules[year] = {};
	appState.rules[year][countryCode] = { min, max };
}

function nextDay(dateStr: string): string {
	const d = parseDate(dateStr);
	d.setDate(d.getDate() + 1);
	return toDateStr(d);
}

function entriesToRanges(entries: AppState['entries']): Record<string, string[]> {
	const byCountry: Record<string, string[]> = {};
	for (const [date, { country }] of Object.entries(entries)) {
		(byCountry[country] ??= []).push(date);
	}
	const result: Record<string, string[]> = {};
	for (const [code, dates] of Object.entries(byCountry)) {
		dates.sort();
		const ranges: string[] = [];
		let start = dates[0], prev = dates[0];
		for (let i = 1; i < dates.length; i++) {
			const d = dates[i];
			if (d === nextDay(prev)) {
				prev = d;
			} else {
				ranges.push(start === prev ? start : `${start}/${prev}`);
				start = prev = d;
			}
		}
		ranges.push(start === prev ? start : `${start}/${prev}`);
		result[code] = ranges;
	}
	return result;
}

function rangesToEntries(compact: Record<string, string[]>): AppState['entries'] {
	const entries: AppState['entries'] = {};
	for (const [code, ranges] of Object.entries(compact)) {
		for (const r of ranges) {
			const [from, to = from] = r.split('/');
			for (const d of getDatesInRange(from, to)) entries[d] = { country: code };
		}
	}
	return entries;
}

export function exportString(): string {
	const compact = {
		version: 2,
		countries: appState.countries,
		rules: appState.rules,
		entries: entriesToRanges(appState.entries),
		settings: appState.settings
	};
	return btoa(JSON.stringify(compact));
}

export function importString(str: string): AppState {
	const parsed = JSON.parse(atob(str.trim()));
	if (parsed.version !== 2) throw new Error('Unsupported version');
	return {
		version: 1,
		countries: parsed.countries,
		rules: parsed.rules,
		entries: rangesToEntries(parsed.entries),
		settings: parsed.settings
	};
}

export function replaceState(incoming: AppState) {
	appState.countries = incoming.countries;
	appState.rules = incoming.rules;
	appState.entries = incoming.entries;
	appState.settings = incoming.settings;
}

export function mergeState(incoming: AppState) {
	for (const [code, c] of Object.entries(incoming.countries)) {
		if (!appState.countries[code]) appState.countries[code] = c;
	}
	for (const [year, rules] of Object.entries(incoming.rules)) {
		if (!appState.rules[year]) appState.rules[year] = {};
		for (const [code, rule] of Object.entries(rules as Record<string, {min:number;max:number}>)) {
			if (!appState.rules[year][code]) appState.rules[year][code] = rule;
		}
	}
	Object.assign(appState.entries, incoming.entries);
}

export function exportJSON() {
	const json = JSON.stringify(appState, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `daytracker-${new Date().toISOString().slice(0, 10)}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

export { getStats };
