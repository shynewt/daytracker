<script lang="ts">
	import { appState, setCountry, removeCountry, setRule } from '$lib/store.svelte';
	import IconMapPin  from '@tabler/icons-svelte/icons/map-pin';
	import IconPencil  from '@tabler/icons-svelte/icons/pencil';
	import IconTrash   from '@tabler/icons-svelte/icons/trash';
	import IconPlus    from '@tabler/icons-svelte/icons/plus';
	import IconX       from '@tabler/icons-svelte/icons/x';
	import { inp, inpSm } from '$lib/styles';

	let {
		selectedYear,
		activeMobileTab,
	}: {
		selectedYear: number;
		activeMobileTab: 'countries' | 'calendar' | 'stats';
	} = $props();

	let addingCountry   = $state(false);
	let newCode         = $state('');
	let newName         = $state('');
	let newColor        = $state('#6366f1');
	let editingCountry  = $state<string | null>(null);
	let editName        = $state('');
	let editColor       = $state('');

	function submitAddCountry() {
		const code = newCode.trim().toUpperCase();
		if (!code || !newName.trim()) return;
		setCountry(code, newName.trim(), newColor);
		newCode = ''; newName = ''; newColor = '#6366f1'; addingCountry = false;
	}

	function startEdit(code: string) {
		editingCountry = code;
		editName  = appState.countries[code].name;
		editColor = appState.countries[code].color;
	}

	function submitEdit() {
		if (!editingCountry) return;
		setCountry(editingCountry, editName, editColor);
		editingCountry = null;
	}

	function deleteCountry(code: string) {
		if (confirm(`Delete "${appState.countries[code]?.name}"? All entries removed.`))
			removeCountry(code);
	}

	function ruleMin(c: string)    { return appState.rules[String(selectedYear)]?.[c]?.min ?? 0; }
	function ruleMax(c: string)    { const v = appState.rules[String(selectedYear)]?.[c]?.max; return v ?? ''; }
	function setMin(c: string, v: string) { setRule(String(selectedYear), c, parseInt(v)||0, appState.rules[String(selectedYear)]?.[c]?.max ?? 366); }
	function setMax(c: string, v: string) { setRule(String(selectedYear), c, appState.rules[String(selectedYear)]?.[c]?.min ?? 0, parseInt(v)||366); }
</script>

<aside class="flex flex-col overflow-y-auto w-full md:w-60 md:shrink-0 bg-white dark:bg-zinc-900 border-r border-stone-200 dark:border-zinc-800 {activeMobileTab !== 'countries' ? 'max-md:hidden' : ''}">
	<div class="flex items-center gap-1.5 px-4 pt-4 pb-2">
		<IconMapPin size={13} class="text-stone-400 dark:text-zinc-600" />
		<span class="text-[10px] font-semibold tracking-widest uppercase text-stone-400 dark:text-zinc-600">Countries</span>
	</div>

	{#each Object.entries(appState.countries) as [code, country]}
	<div class="border-b border-stone-100 dark:border-zinc-800/60">
		{#if editingCountry === code}
		<div class="px-3 py-2.5 flex flex-col gap-2">
			<input bind:value={editName} class={inp} placeholder="Country name" />
			<div class="flex items-center gap-2">
				<input bind:value={editColor} type="color" class="w-8 h-8 rounded-lg border border-stone-200 dark:border-zinc-700 cursor-pointer p-0.5 bg-stone-50 dark:bg-zinc-800" />
				<button onclick={submitEdit} class="flex-1 bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition-opacity">Save</button>
				<button onclick={() => editingCountry = null} class="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"><IconX size={15} /></button>
			</div>
		</div>
		{:else}
		<div class="flex items-center gap-2.5 px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors group" style="border-left: 3px solid {country.color}">
			<span class="flex-1 text-sm font-medium truncate">{country.name}</span>
			<span class="font-mono text-[10px] bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-stone-500 dark:text-zinc-400 shrink-0">{code}</span>
			<button onclick={() => startEdit(code)} class="md:opacity-0 md:group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-stone-400 hover:text-blue-500 transition-all rounded"><IconPencil size={13} /></button>
			<button onclick={() => deleteCountry(code)} class="md:opacity-0 md:group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-stone-400 hover:text-red-500 transition-all rounded"><IconTrash size={13} /></button>
		</div>
		<div class="flex items-center gap-2 px-4 pb-2.5 text-[11px] text-stone-400 dark:text-zinc-600" style="padding-left: 19px">
			<span class="w-6">Min</span>
			<input type="number" min="0" max="366" value={ruleMin(code)} oninput={(e) => setMin(code, (e.target as HTMLInputElement).value)} class={inpSm} />
			<span class="w-6 ml-1">Max</span>
			<input type="number" min="0" max="366" value={ruleMax(code)} oninput={(e) => setMax(code, (e.target as HTMLInputElement).value)} class={inpSm} />
		</div>
		{/if}
	</div>
	{/each}

	{#if addingCountry}
	<div class="px-3 py-2.5 flex flex-col gap-2 border-b border-stone-100 dark:border-zinc-800/60">
		<input bind:value={newCode} maxlength="4" class={inp} placeholder="Code (e.g. DE)" />
		<input bind:value={newName} class={inp} placeholder="Country name" />
		<div class="flex items-center gap-2">
			<input bind:value={newColor} type="color" class="w-8 h-8 rounded-lg border border-stone-200 dark:border-zinc-700 cursor-pointer p-0.5 bg-stone-50 dark:bg-zinc-800" />
			<button onclick={submitAddCountry} class="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors">Add</button>
			<button onclick={() => addingCountry = false} class="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"><IconX size={15} /></button>
		</div>
	</div>
	{:else}
	<button onclick={() => addingCountry = true} class="m-3 flex items-center justify-center gap-2 text-[13px] font-medium text-stone-400 dark:text-zinc-600 border border-dashed border-stone-300 dark:border-zinc-700 rounded-xl py-2.5 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-400 dark:hover:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors">
		<IconPlus size={15} /> Add Country
	</button>
	{/if}
</aside>
