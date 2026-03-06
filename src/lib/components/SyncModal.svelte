<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onDestroy } from 'svelte';
	import QRCode from 'qrcode';
	import { Html5Qrcode } from 'html5-qrcode';
	import IconRefresh from '@tabler/icons-svelte/icons/refresh';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconX from '@tabler/icons-svelte/icons/x';
	import IconDevices from '@tabler/icons-svelte/icons/devices';
	import {
		createSyncSession,
		joinSyncSession,
		type SyncSession,
		type SyncStatus,
	} from '$lib/sync';

	let { open = $bindable() }: { open: boolean } = $props();

	let mode = $state<'host' | 'join'>('host');
	let qrCanvas = $state<HTMLCanvasElement>();
	let scannerEl = $state<HTMLDivElement>();
	let manualCode = $state('');

	let hostSession = $state<SyncSession | null>(null);
	let joinStatus = $state<SyncStatus>('idle');
	let joinError = $state('');

	let scanner: Html5Qrcode | null = null;
	let destroyJoin: (() => void) | null = null;

	$effect(() => {
		if (open) {
			mode = 'host';
			hostSession = null;
			joinStatus = 'idle';
			joinError = '';
			manualCode = '';
		} else {
			cleanup();
		}
	});

	$effect(() => {
		if (open && mode === 'host' && !hostSession) {
			startHost();
		}
	});

	$effect(() => {
		if (open && mode === 'join' && scannerEl && joinStatus === 'idle') {
			startScanner();
		}
	});

	$effect(() => {
		if (hostSession?.qrData && qrCanvas) {
			QRCode.toCanvas(qrCanvas, hostSession.qrData, {
				width: 200,
				margin: 2,
				color: { dark: '#1c1917', light: '#ffffff' },
			});
		}
	});

	function cleanup() {
		if (hostSession) {
			hostSession.destroy();
			hostSession = null;
		}
		if (destroyJoin) {
			destroyJoin();
			destroyJoin = null;
		}
		stopScanner();
	}

	onDestroy(cleanup);

	async function startHost() {
		hostSession = await createSyncSession((s) => {
			hostSession = { ...s };
		});
	}

	async function startScanner() {
		if (scanner) return;
		try {
			scanner = new Html5Qrcode('qr-scanner');
			await scanner.start(
				{ facingMode: 'environment' },
				{ fps: 10, qrbox: { width: 220, height: 220 } },
				(text) => {
					stopScanner();
					handleJoin(text);
				},
				() => {}
			);
		} catch {
			// Camera not available — user can use manual input
		}
	}

	async function stopScanner() {
		if (scanner) {
			try {
				await scanner.stop();
			} catch {
				// ignore
			}
			scanner = null;
		}
	}

	async function handleJoin(qrData: string) {
		stopScanner();
		destroyJoin = await joinSyncSession(qrData, (status, error) => {
			joinStatus = status;
			joinError = error ?? '';
		});
	}

	function handleManualJoin() {
		if (!manualCode.trim()) return;
		try {
			JSON.parse(manualCode.trim());
			handleJoin(manualCode.trim());
		} catch {
			joinStatus = 'error';
			joinError = 'Please scan the QR code or paste the full sync data';
		}
	}

	const statusLabel: Record<SyncStatus, string> = {
		idle: '',
		waiting: 'Waiting for other device...',
		connecting: 'Connecting...',
		syncing: 'Merging data...',
		done: 'Merged successfully',
		error: 'Error',
	};
</script>

{#if open}
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
	<div
		transition:fade={{ duration: 150 }}
		class="absolute inset-0 bg-black/40 backdrop-blur-sm"
		role="button" tabindex="-1" onclick={() => open = false}
	></div>
	<div
		transition:fly={{ y: 24, duration: 220, opacity: 0 }}
		class="relative bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-5 z-10"
	>
		<div class="flex items-center gap-2 mb-4">
			<IconDevices size={16} class="text-stone-500 dark:text-zinc-500" />
			<span class="font-semibold text-base">Sync Devices</span>
			<button
				onclick={() => open = false}
				class="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
			><IconX size={15} /></button>
		</div>

		<div class="flex gap-1 mb-3 bg-stone-100 dark:bg-zinc-800 rounded-xl p-1">
			{#each [['host', 'Show QR'], ['join', 'Scan QR']] as [id, label]}
			<button
				onclick={() => {
					cleanup();
					mode = id as 'host' | 'join';
					joinStatus = 'idle';
					joinError = '';
					if (id === 'host') hostSession = null;
				}}
				class="flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors {mode === id ? 'bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 shadow-sm' : 'text-stone-400 dark:text-zinc-600 hover:text-stone-700 dark:hover:text-zinc-300'}"
			>{label}</button>
			{/each}
		</div>

		<p class="text-xs text-stone-400 dark:text-zinc-500 mb-4 leading-relaxed">
			Both devices exchange their data and <span class="font-semibold text-stone-600 dark:text-zinc-300">merge</span> it — nothing is deleted or overwritten. Entries from both sides are combined.
		</p>

		{#if mode === 'host'}
		<div class="flex flex-col items-center gap-3">
			<div class="bg-white rounded-xl p-2 border border-stone-200 dark:border-zinc-700">
				<canvas bind:this={qrCanvas}></canvas>
			</div>

			{#if hostSession}
			<div class="text-center">
				<div class="font-mono text-lg font-bold tracking-[0.3em] text-stone-900 dark:text-zinc-100">
					{hostSession.roomCode}
				</div>
				<div class="text-xs text-stone-400 dark:text-zinc-600 mt-0.5">
					Scan this QR code on the other device
				</div>
			</div>

			<div class="flex items-center gap-2 text-sm">
				{#if hostSession.status === 'waiting'}
					<IconRefresh size={14} class="animate-spin text-amber-500" />
					<span class="text-stone-500 dark:text-zinc-400">Waiting for other device...</span>
				{:else if hostSession.status === 'syncing'}
					<IconRefresh size={14} class="animate-spin text-amber-500" />
					<span class="text-stone-500 dark:text-zinc-400">Merging data...</span>
				{:else if hostSession.status === 'done'}
					<IconCheck size={14} class="text-green-500" />
					<span class="text-green-600 dark:text-green-400">Merged — both devices are in sync</span>
				{:else if hostSession.status === 'error'}
					<span class="text-red-500">{hostSession.error || 'Unknown error'}</span>
				{/if}
			</div>
			{/if}
		</div>

		{:else}
		<div class="flex flex-col gap-3">
			{#if joinStatus === 'idle'}
			<div
				bind:this={scannerEl}
				id="qr-scanner"
				class="w-full aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-800"
			></div>

			<div class="flex flex-col gap-1.5">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">
					Or paste sync data from the other device
				</span>
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={manualCode}
						placeholder="Paste sync data..."
						class="flex-1 bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
					/>
					<button
						onclick={handleManualJoin}
						class="px-4 py-2 text-sm font-semibold rounded-xl bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
					>Join</button>
				</div>
			</div>

			{:else}
			<div class="flex flex-col items-center gap-3 py-8">
				{#if joinStatus === 'connecting' || joinStatus === 'syncing'}
					<IconRefresh size={24} class="animate-spin text-amber-500" />
					<span class="text-sm text-stone-500 dark:text-zinc-400">{statusLabel[joinStatus]}</span>
				{:else if joinStatus === 'done'}
					<IconCheck size={24} class="text-green-500" />
					<span class="text-sm text-green-600 dark:text-green-400">Merged — both devices are in sync</span>
				{:else if joinStatus === 'error'}
					<span class="text-sm text-red-500 text-center">{joinError || 'Unknown error'}</span>
					<button
						onclick={() => { joinStatus = 'idle'; joinError = ''; }}
						class="text-sm font-semibold text-amber-500 hover:underline"
					>Try again</button>
				{/if}
			</div>
			{/if}
		</div>
		{/if}
	</div>
</div>
{/if}
