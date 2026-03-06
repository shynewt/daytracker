<script lang="ts">
	import IconWorld        from '@tabler/icons-svelte/icons/world';
	import IconChevronLeft  from '@tabler/icons-svelte/icons/chevron-left';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';
	import IconSun          from '@tabler/icons-svelte/icons/sun';
	import IconMoon         from '@tabler/icons-svelte/icons/moon';
	import IconShare        from '@tabler/icons-svelte/icons/share';
	import IconDevices      from '@tabler/icons-svelte/icons/devices';
	import IconSettings     from '@tabler/icons-svelte/icons/settings';
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
</script>

<header class="h-12 shrink-0 flex items-center gap-3 px-4 bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-zinc-800 z-20">
	<span class="flex items-center gap-1.5 font-brand font-bold text-[15px] tracking-tight text-stone-900 dark:text-zinc-100 select-none">
		<IconWorld size={17} class="text-amber-500" />
		Day Counter
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
		<button onclick={onToggleTheme} class={iconBtn} title="Toggle theme">
			{#if isDark}<IconSun size={16} />{:else}<IconMoon size={16} />{/if}
		</button>
		<div class="w-px h-4 bg-stone-200 dark:bg-zinc-700 mx-1"></div>
		<button onclick={onOpenShare} class={iconBtn} title="Share / Import"><IconShare size={16} /></button>
		<button onclick={onOpenSync} class={iconBtn} title="Sync devices"><IconDevices size={16} /></button>
		<button onclick={onOpenSettings} class={iconBtn} title="Settings"><IconSettings size={16} /></button>
	</div>
</header>
