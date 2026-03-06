import { exportString, importString, mergeState } from './store.svelte';

const DEFAULT_RELAY = 'wss://day-counter-relay.YOUR_SUBDOMAIN.workers.dev';

function generateId(len = 6): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const arr = crypto.getRandomValues(new Uint8Array(len));
	return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

async function generateKey(): Promise<CryptoKey> {
	return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
		'encrypt',
		'decrypt',
	]);
}

async function exportKey(key: CryptoKey): Promise<string> {
	const raw = await crypto.subtle.exportKey('raw', key);
	return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

async function importKey(encoded: string): Promise<CryptoKey> {
	const raw = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
	return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encrypt(data: string, key: CryptoKey): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const enc = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(data)
	);
	const combined = new Uint8Array(iv.length + new Uint8Array(enc).length);
	combined.set(iv);
	combined.set(new Uint8Array(enc), iv.length);
	return btoa(String.fromCharCode(...combined));
}

async function decrypt(payload: string, key: CryptoKey): Promise<string> {
	const combined = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
	const iv = combined.slice(0, 12);
	const data = combined.slice(12);
	const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
	return new TextDecoder().decode(dec);
}

export type SyncStatus = 'idle' | 'waiting' | 'connecting' | 'syncing' | 'done' | 'error';

export interface SyncSession {
	status: SyncStatus;
	error: string;
	roomCode: string;
	qrData: string;
	destroy: () => void;
}

function getRelayUrl(): string {
	if (typeof localStorage !== 'undefined') {
		const custom = localStorage.getItem('daytracker_relay_url');
		if (custom) return custom;
	}
	return DEFAULT_RELAY;
}

export function setRelayUrl(url: string) {
	if (url.trim()) {
		localStorage.setItem('daytracker_relay_url', url.trim());
	} else {
		localStorage.removeItem('daytracker_relay_url');
	}
}

export function getStoredRelayUrl(): string {
	if (typeof localStorage !== 'undefined') {
		return localStorage.getItem('daytracker_relay_url') ?? '';
	}
	return '';
}

export async function createSyncSession(
	onUpdate: (session: SyncSession) => void
): Promise<SyncSession> {
	const roomCode = generateId();
	const key = await generateKey();
	const keyStr = await exportKey(key);

	const session: SyncSession = {
		status: 'waiting',
		error: '',
		roomCode,
		qrData: JSON.stringify({ relay: getRelayUrl(), room: roomCode, key: keyStr }),
		destroy: () => {},
	};

	const relay = getRelayUrl();
	const wsUrl = `${relay}/room/${roomCode}`;
	let ws: WebSocket;

	try {
		ws = new WebSocket(wsUrl);
	} catch {
		session.status = 'error';
		session.error = 'Failed to connect to relay';
		onUpdate(session);
		return session;
	}

	const timeout = setTimeout(() => {
		if (session.status === 'waiting' || session.status === 'connecting') {
			session.status = 'error';
			session.error = 'Connection timed out';
			onUpdate(session);
			ws.close();
		}
	}, 120_000);

	ws.onopen = () => {
		session.status = 'waiting';
		onUpdate(session);
	};

	ws.onmessage = async (event) => {
		try {
			const msg = JSON.parse(event.data as string);
			if (msg.type === 'hello') {
				session.status = 'syncing';
				onUpdate(session);
				const data = exportString();
				const encrypted = await encrypt(data, key);
				ws.send(JSON.stringify({ type: 'sync-data', payload: encrypted }));
			} else if (msg.type === 'sync-data') {
				const decrypted = await decrypt(msg.payload, key);
				const incoming = importString(decrypted);
				mergeState(incoming);
				session.status = 'done';
				onUpdate(session);
				clearTimeout(timeout);
				ws.close();
			}
		} catch (e) {
			session.status = 'error';
			session.error = e instanceof Error ? e.message : 'Sync failed';
			onUpdate(session);
		}
	};

	ws.onerror = () => {
		session.status = 'error';
		session.error = 'WebSocket error — check relay URL';
		onUpdate(session);
		clearTimeout(timeout);
	};

	ws.onclose = () => {
		clearTimeout(timeout);
	};

	session.destroy = () => {
		clearTimeout(timeout);
		ws.close();
	};

	onUpdate(session);
	return session;
}

export async function joinSyncSession(
	qrData: string,
	onUpdate: (status: SyncStatus, error?: string) => void
): Promise<() => void> {
	let parsed: { relay: string; room: string; key: string };
	try {
		parsed = JSON.parse(qrData);
	} catch {
		onUpdate('error', 'Invalid QR data');
		return () => {};
	}

	const key = await importKey(parsed.key);
	const wsUrl = `${parsed.relay}/room/${parsed.room}`;

	onUpdate('connecting');

	let ws: WebSocket;
	try {
		ws = new WebSocket(wsUrl);
	} catch {
		onUpdate('error', 'Failed to connect');
		return () => {};
	}

	const timeout = setTimeout(() => {
		onUpdate('error', 'Connection timed out');
		ws.close();
	}, 30_000);

	ws.onopen = () => {
		ws.send(JSON.stringify({ type: 'hello' }));
	};

	ws.onmessage = async (event) => {
		try {
			const msg = JSON.parse(event.data as string);
			if (msg.type === 'sync-data') {
				onUpdate('syncing');
				const decrypted = await decrypt(msg.payload, key);
				const incoming = importString(decrypted);
				mergeState(incoming);

				const data = exportString();
				const encrypted = await encrypt(data, key);
				ws.send(JSON.stringify({ type: 'sync-data', payload: encrypted }));

				onUpdate('done');
				clearTimeout(timeout);
				ws.close();
			}
		} catch (e) {
			onUpdate('error', e instanceof Error ? e.message : 'Sync failed');
		}
	};

	ws.onerror = () => {
		onUpdate('error', 'WebSocket error');
		clearTimeout(timeout);
	};

	ws.onclose = () => {
		clearTimeout(timeout);
	};

	return () => {
		clearTimeout(timeout);
		ws.close();
	};
}
