<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import {
		exportJSON, exportString, importString, replaceState, mergeState
	} from '$lib/store.svelte';
	import IconShare from '@tabler/icons-svelte/icons/share';
	import IconCheck from '@tabler/icons-svelte/icons/check';
	import IconX     from '@tabler/icons-svelte/icons/x';

	let {
		open = $bindable(),
		initialTab = 'export',
	}: {
		open: boolean;
		initialTab?: 'export' | 'import';
	} = $props();

	let shareTab      = $state<'export' | 'import'>('export');
	let importText    = $state('');
	let shareFileInput: HTMLInputElement;
	let preview       = $state<{ countries: string[]; entryCount: number; yearRange: string } | null>(null);
	let previewState  = $state<ReturnType<typeof importString> | null>(null);
	let previewError  = $state('');
	let copyDone      = $state(false);

	$effect(() => {
		if (open) {
			shareTab = initialTab;
			importText = ''; preview = null; previewState = null; previewError = '';
		}
	});

	function buildPreview(state: ReturnType<typeof importString>) {
		const countries = Object.entries(state.countries).map(([code, c]) => `${c.name} (${code})`);
		const entryCount = Object.keys(state.entries).length;
		const years = Object.keys(state.entries).map(d => d.slice(0, 4));
		const yearRange = years.length ? `${Math.min(...years.map(Number))}–${Math.max(...years.map(Number))}` : 'none';
		return { countries, entryCount, yearRange };
	}

	function parseImportText() {
		previewError = ''; preview = null; previewState = null;
		if (!importText.trim()) return;
		try {
			const s = importString(importText);
			previewState = s;
			preview = buildPreview(s);
		} catch (e: unknown) {
			previewError = e instanceof Error ? e.message : 'Invalid data';
		}
	}

	function handleShareFile(e: Event) {
		const f = (e.target as HTMLInputElement).files?.[0];
		if (!f) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const parsed = JSON.parse(ev.target?.result as string);
				if (parsed.version !== 1) throw new Error('Unsupported version');
				previewState = parsed;
				preview = buildPreview(parsed);
				previewError = '';
			} catch (err: unknown) {
				previewError = err instanceof Error ? err.message : 'Invalid file';
				preview = null; previewState = null;
			}
			(e.target as HTMLInputElement).value = '';
		};
		reader.readAsText(f);
	}

	function doReplace() {
		if (!previewState) return;
		replaceState(previewState);
		open = false;
	}

	function doMerge() {
		if (!previewState) return;
		mergeState(previewState);
		open = false;
	}

	async function copyExport() {
		await navigator.clipboard.writeText(exportString());
		copyDone = true;
		setTimeout(() => { copyDone = false; }, 1500);
	}
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
		class="relative bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-5 z-10"
	>
		<div class="flex items-center gap-2 mb-4">
			<IconShare size={16} class="text-stone-500 dark:text-zinc-500" />
			<span class="font-semibold text-base">Share / Import</span>
			<button onclick={() => open = false} class="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"><IconX size={15} /></button>
		</div>

		<div class="flex gap-1 mb-4 bg-stone-100 dark:bg-zinc-800 rounded-xl p-1">
			{#each ['export', 'import'] as t}
			<button
				onclick={() => shareTab = t as 'export' | 'import'}
				class="flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors {shareTab === t ? 'bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 shadow-sm' : 'text-stone-400 dark:text-zinc-600 hover:text-stone-700 dark:hover:text-zinc-300'}"
			>{t === 'export' ? 'Export' : 'Import'}</button>
			{/each}
		</div>

		{#if shareTab === 'export'}
		<div class="flex flex-col gap-3">
			<label class="flex flex-col gap-1">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">Encoded string</span>
				<textarea
					readonly
					rows={4}
					value={exportString()}
					class="w-full font-mono text-xs bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-stone-700 dark:text-zinc-300 resize-none focus:outline-none select-all"
				></textarea>
			</label>
			<div class="flex gap-2">
				<button
					onclick={copyExport}
					class="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
				>
					{#if copyDone}<IconCheck size={15} /> Copied!{:else}Copy to clipboard{/if}
				</button>
				<button
					onclick={exportJSON}
					class="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
				>Download JSON</button>
			</div>
		</div>

		{:else}
		<div class="flex flex-col gap-3">
			<label class="flex flex-col gap-1">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">Paste encoded string</span>
				<textarea
					rows={3}
					bind:value={importText}
					oninput={parseImportText}
					placeholder="Paste exported string here…"
					class="w-full font-mono text-xs bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-stone-700 dark:text-zinc-300 placeholder:text-stone-400 dark:placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
				></textarea>
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">Or upload JSON file</span>
				<input bind:this={shareFileInput} type="file" accept=".json" onchange={handleShareFile}
					class="text-sm text-stone-600 dark:text-zinc-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-100 dark:file:bg-zinc-800 file:text-stone-700 dark:file:text-zinc-300 hover:file:bg-stone-200 dark:hover:file:bg-zinc-700 cursor-pointer" />
			</label>

			{#if previewError}
			<div class="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 px-3 py-2 text-sm text-red-600 dark:text-red-400">
				{previewError}
			</div>
			{/if}

			{#if preview}
			<div class="rounded-xl bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700 px-3 py-2.5 flex flex-col gap-1.5">
				<span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-600">Preview</span>
				<div class="text-sm text-stone-700 dark:text-zinc-300">
					<span class="font-semibold">{preview.entryCount}</span> entries · <span class="font-semibold">{preview.yearRange}</span>
				</div>
				<div class="flex flex-wrap gap-1">
					{#each preview.countries as c}
					<span class="text-xs bg-stone-200 dark:bg-zinc-700 rounded px-2 py-0.5 text-stone-600 dark:text-zinc-400">{c}</span>
					{/each}
					{#if preview.countries.length === 0}
					<span class="text-xs text-stone-400 dark:text-zinc-600">No countries</span>
					{/if}
				</div>
			</div>
			{/if}

			<div class="flex gap-2 mt-1">
				<button
					onclick={doReplace}
					disabled={!previewState}
					class="flex-1 py-2 text-sm font-semibold rounded-xl bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
				>Replace all</button>
				<button
					onclick={doMerge}
					disabled={!previewState}
					class="flex-1 py-2 text-sm font-semibold rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				>Merge</button>
			</div>
		</div>
		{/if}
	</div>
</div>
{/if}
