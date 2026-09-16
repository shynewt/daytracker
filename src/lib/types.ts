export interface Country {
	name: string;
	color: string;
	/** custom emoji, overrides the flag derived from the code (for non-ISO countries) */
	emoji?: string;
}

export interface Rule {
	// 0 = unset
	min: number;
	// 0 or absent = unset
	target?: number;
	// >=366 = unset
	max: number;
}

export interface Entry {
	country: string;
}

/** Where the user currently is; gaps from `since` onward auto-fill with this country */
export interface Presence {
	country: string;
	since: string; // YYYY-MM-DD
}

export interface AppState {
	version: 1;
	countries: Record<string, Country>;
	rules: Record<string, Record<string, Rule>>;
	entries: Record<string, Entry>;
	presence?: Presence | null;
	settings: { weekStartsMonday: boolean };
}

export interface CountryStats {
	past: number;
	upcoming: number;
	total: number;
	min: number;
	target: number;
	max: number;
	/** days still needed to reach min (counting past only) */
	toMin: number;
	/** days still needed to reach target (counting past + planned) */
	toTarget: number;
	/** days remaining before hitting max (counting past + planned); Infinity if no max */
	toMax: number;
	overMax: boolean;
	/** true once min is reached counting past + planned */
	minMetSim: boolean;
	/** true once target is reached counting past + planned */
	targetMet: boolean;
	/** date on which max will be hit at current plan, if within the year */
	maxHitDate: string | null;
	/** date on which the goal is reached counting planned days (null if plans don't cover it) */
	targetHitDate: string | null;
}

export interface Trip {
	country: string;
	from: string; // YYYY-MM-DD
	to: string;   // YYYY-MM-DD
	days: number;
	ongoing: boolean;
}
