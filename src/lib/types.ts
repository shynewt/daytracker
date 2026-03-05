export interface Country {
	name: string;
	color: string;
}

export interface Rule {
	min: number;
	max: number;
}

export interface Entry {
	country: string;
}

export interface AppState {
	version: 1;
	countries: Record<string, Country>;
	rules: Record<string, Record<string, Rule>>;
	entries: Record<string, Entry>;
	settings: { weekStartsMonday: boolean };
}

export interface CountryStats {
	past: number;
	upcoming: number;
	total: number;
	toMin: number;
	toMax: number;
	overMax: boolean;
	toMinSim: number;
	overMaxSim: boolean;
}
