<script lang="ts">
	import { appState, setPresence } from '$lib/store.svelte';
	import { getCountryEmoji, getCurrentStreak } from '$lib/utils';
	import IconWorld        from '@tabler/icons-svelte/icons/world';
	import IconChevronLeft  from '@tabler/icons-svelte/icons/chevron-left';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';
	import IconSun          from '@tabler/icons-svelte/icons/sun';
	import IconMoon         from '@tabler/icons-svelte/icons/moon';
	import IconShare        from '@tabler/icons-svelte/icons/share';
	import IconDevices      from '@tabler/icons-svelte/icons/devices';
	import IconSettings     from '@tabler/icons-svelte/icons/settings';
	import IconMapPin       from '@tabler/icons-svelte/icons/map-pin';
	import IconCheck        from '@tabler/icons-svelte/icons/check';
	import { iconBtn } from '$lib/styles';

	let {
		selectedYear = $bindable(),
		isDark,
		onToggleTheme,
		onOpenShare,
		onOpenSync,
		onOpenSettings,
	}: {
		selectedYear: number;
		isDark: boolean;
		onToggleTheme: () => void;
		onOpenShare: () => void;
		onOpenSync: () => void;
		onOpenSettings: () => void;
	} = $props();

	const currentYear = new Date().getFullYear();

	let presenceOpen = $state(false);

	const presence = $derived(appState.presence ?? null);
	const presenceCountry = $derived(presence ? appState.countries[presence.country] : null);
	const streak = $derived(presence ? getCurrentStreak(appState, presence.country) : 0);

	function choose(code: string | null) {
		setPresence(code);
		presenceOpen = false;
	}
</script>

<header class="h-12 shrink-0 flex items-center gap-3 px-4 bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-zinc-800 z-20">
	<span class="flex items-center gap-1.5 font-brand font-bold text-[15px] tracking-tight text-stone-900 dark:text-zinc-100 select-none">
		<IconWorld size={17} class="text-amber-500" />
		<span class="hidden sm:inline">Day Counter</span>
	</span>

	<div class="flex items-center bg-stone-100 dark:bg-zinc-800 rounded-full px-1 ml-1">
		<button onclick={() => selectedYear--} class="w-7 h-7 flex items-center justify-center text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors rounded-full" title="Previous year"><IconChevronLeft size={14} /></button>
		<button
			onclick={() => selectedYear = currentYear}
			class="font-mono text-[13px] font-semibold w-12 text-center tabular-nums select-none transition-colors cursor-pointer
				{selectedYear === currentYear ? 'text-stone-800 dark:text-zinc-100' : 'text-amber-500 dark:text-amber-400'}"
			title="Jump to current year"
		>{selectedYear}</button>
		<button onclick={() => selectedYear++} class="w-7 h-7 flex items-center justify-center text-stone-400 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-200 transition-colors rounded-full" title="Next year"><IconChevronRight size={14} /></button>
	</div>

	<div class="ml-auto flex items-center gap-0.5">
		<!-- Where I am now -->
		{#if Object.keys(appState.countries).length > 0}
		<div class="relative">
			<button
				onclick={() => presenceOpen = !presenceOpen}
				class="flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-semibold transition-all mr-1
					{presence && presenceCountry
						? 'bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-200 hover:bg-stone-200 dark:hover:bg-zinc-700'
						: 'text-stone-400 dark:text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-800 border border-dashed border-stone-300 dark:border-zinc-700'}"
				title="Where I am now. Days auto-fill until you change it."
			>
				{#if presence && presenceCountry}
					<span class="w-2 h-2 rounded-full shrink-0" style="background:{presenceCountry.color}"></span>
					{#if getCountryEmoji(presence.country, presenceCountry)}<span class="leading-none">{getCountryEmoji(presence.country, presenceCountry)}</span>{/if}
					<span class="hidden sm:inline max-w-24 truncate">{presenceCountry.name}</span>
					<span class="font-mono tabular-nums text-stone-400 dark:text-zinc-500">· {streak}d</span>
				{:else}
					<IconMapPin size={14} />
					<span class="hidden sm:inline">Where am I?</span>
				{/if}
			</button>

			{#if presenceOpen}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="fixed inset-0 z-30" onclick={() => presenceOpen = false}></div>
			<div class="absolute right-0 top-full mt-1.5 z-40 w-52 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden">
				<div class="px-3 py-2 text-[9px] font-brand font-bold uppercase tracking-widest text-stone-400 dark:text-zinc-500 border-b border-stone-100 dark:border-zinc-700/60">
					Where I am now
				</div>
				{#each Object.entries(appState.countries) as [code, country]}
				<button
					onclick={() => choose(code)}
					class="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 dark:hover:bg-zinc-700/60 flex items-center gap-2.5 transition-colors"
				>
					<span class="w-2 h-2 rounded-full shrink-0" style="background:{country.color}"></span>
					{#if getCountryEmoji(code, country)}<span class="leading-none">{getCountryEmoji(code, country)}</span>{/if}
					<span class="flex-1 truncate">{country.name}</span>
					{#if presence?.country === code}<IconCheck size={14} class="text-amber-500 shrink-0" />{/if}
				</button>
				{/each}
				{#if presence}
				<button
					onclick={() => choose(null)}
					class="w-full text-left px-3 py-2 text-sm border-t border-stone-100 dark:border-zinc-700/60 text-stone-400 dark:text-zinc-500 hover:bg-stone-50 dark:hover:bg-zinc-700/60 transition-colors"
				>Clear (stop auto-filling)</button>
				{/if}
			</div>
			{/if}
		</div>
		{/if}

		<button onclick={onToggleTheme} class={iconBtn} title="Toggle theme">
			{#if isDark}<IconSun size={16} />{:else}<IconMoon size={16} />{/if}
		</button>
		<div class="w-px h-4 bg-stone-200 dark:bg-zinc-700 mx-1"></div>
		<button onclick={onOpenShare} class={iconBtn} title="Share / Import"><IconShare size={16} /></button>
		<button onclick={onOpenSync} class={iconBtn} title="Sync devices"><IconDevices size={16} /></button>
		<button onclick={onOpenSettings} class={iconBtn} title="Settings"><IconSettings size={16} /></button>
	</div>
</header>
