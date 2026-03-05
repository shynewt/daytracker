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
