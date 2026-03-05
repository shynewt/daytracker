import type { AppState } from './types';
import { getDatesInRange, getStats } from './utils';

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

function saveToStorage(state: AppState) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const appState = $state<AppState>(defaultState());

let initialized = false;

export function initStore() {
	if (initialized) return;
	initialized = true;
	const loaded = loadFromStorage();
	Object.assign(appState, loaded);
}

$effect.root(() => {
	$effect(() => {
		// Serialize to trigger reactivity tracking on all nested keys
		const snapshot = JSON.stringify(appState);
		if (initialized) saveToStorage(JSON.parse(snapshot));
	});
});

export function setEntry(date: string, country: string) {
	appState.entries[date] = { country };
}

export function setEntryRange(from: string, to: string, country: string) {
	const dates = getDatesInRange(from, to);
	for (const date of dates) {
		appState.entries[date] = { country };
	}
}

export function removeEntry(date: string) {
	delete appState.entries[date];
}

export function removeEntryRange(from: string, to: string) {
	const dates = getDatesInRange(from, to);
	for (const date of dates) {
		delete appState.entries[date];
	}
}

export function addCountry(code: string, name: string, color: string) {
	appState.countries[code] = { name, color };
}

export function updateCountry(code: string, name: string, color: string) {
	appState.countries[code] = { name, color };
}

export function removeCountry(code: string) {
	delete appState.countries[code];
	// Remove all entries for this country
	for (const [date, entry] of Object.entries(appState.entries)) {
		if (entry.country === code) delete appState.entries[date];
	}
	// Remove all rules for this country
	for (const year of Object.keys(appState.rules)) {
		delete appState.rules[year][code];
	}
}

export function setRule(year: string, countryCode: string, min: number, max: number) {
	if (!appState.rules[year]) appState.rules[year] = {};
	appState.rules[year][countryCode] = { min, max };
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
			const next = new Date(prev);
			next.setDate(next.getDate() + 1);
			if (d === next.toISOString().slice(0, 10)) {
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
	Object.assign(appState, incoming);
	saveToStorage(appState);
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
	saveToStorage(appState);
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

export function importJSON(file: File): Promise<void> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const parsed = JSON.parse(e.target?.result as string);
				if (parsed.version !== 1) throw new Error('Unsupported version');
				Object.assign(appState, parsed);
				saveToStorage(appState);
				resolve();
			} catch (err) {
				reject(err);
			}
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}

export { getStats };
