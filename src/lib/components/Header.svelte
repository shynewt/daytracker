<script lang="ts">
	import IconWorld        from '@tabler/icons-svelte/icons/world';
	import IconChevronLeft  from '@tabler/icons-svelte/icons/chevron-left';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';
	import IconSun          from '@tabler/icons-svelte/icons/sun';
	import IconMoon         from '@tabler/icons-svelte/icons/moon';
	import IconShare        from '@tabler/icons-svelte/icons/share';
	import IconSettings     from '@tabler/icons-svelte/icons/settings';
	import { iconBtn } from '$lib/styles';

	let {
		selectedYear = $bindable(),
		isDark,
		onToggleTheme,
		onOpenShare,
		onOpenSettings,
	}: {
		selectedYear: number;
		isDark: boolean;
		onToggleTheme: () => void;
		onOpenShare: () => void;
		onOpenSettings: () => void;
	} = $props();

	function prevYear() { selectedYear--; }
	function nextYear() { selectedYear++; }
</script>

<header class="h-12 shrink-0 flex items-center gap-2 px-4 bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-zinc-800 z-20">
	<span class="flex items-center gap-1.5 font-brand font-bold text-[15px] tracking-tight text-stone-900 dark:text-zinc-100 select-none">
		<IconWorld size={18} class="text-amber-500" />
		<span class="hidden sm:inline">Day Counter</span>
	</span>

	<div class="flex items-center gap-0.5 ml-3">
		<button onclick={prevYear} class={iconBtn} title="Previous year"><IconChevronLeft size={16} /></button>
		<button
			onclick={() => selectedYear = new Date().getFullYear()}
			class="font-mono text-sm font-medium w-12 text-center tabular-nums select-none hover:text-amber-500 transition-colors cursor-pointer {selectedYear === new Date().getFullYear() ? '' : 'underline decoration-dotted underline-offset-4 decoration-stone-300 dark:decoration-zinc-600'}"
			title="Jump to current year"
		>{selectedYear}</button>
		<button onclick={nextYear} class={iconBtn} title="Next year"><IconChevronRight size={16} /></button>
	</div>

	<div class="ml-auto flex items-center gap-0.5">
		<button onclick={onToggleTheme} class={iconBtn} title="Toggle theme">
			{#if isDark}<IconSun size={17} />{:else}<IconMoon size={17} />{/if}
		</button>
		<button onclick={onOpenShare} class={iconBtn} title="Share / Import"><IconShare size={17} /></button>
		<button onclick={onOpenSettings} class={iconBtn} title="Settings"><IconSettings size={17} /></button>
	</div>
</header>
