<script lang="ts">
	import { page } from '$app/stores';
	import LiveStatusIndicator from '$lib/components/layout/LiveStatusIndicator.svelte';

	type StaffRole = 'manager' | 'reception' | 'housekeeping';

	interface TabItem {
		href: string;
		label: string;
		icon: string;
	}

	interface Props {
		role: StaffRole;
	}

	let { role }: Props = $props();

	const tabMap: Record<StaffRole, TabItem[]> = {
		reception: [
			{ href: '/rooms', label: 'Phòng', icon: '🏠' },
			{ href: '/bookings', label: 'Đặt phòng', icon: '📋' },
			{ href: '/attendance', label: 'Chấm công', icon: '📊' }
		],
		manager: [
			{ href: '/dashboard', label: 'Dashboard', icon: '📊' },
			{ href: '/staff', label: 'Nhân viên', icon: '👥' },
			{ href: '/reports', label: 'Báo cáo', icon: '📈' }
		],
		housekeeping: [{ href: '/my-rooms', label: 'Phòng', icon: '🏠' }]
	};

	let tabs = $derived(tabMap[role]);
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white md:hidden"
	aria-label="Thanh điều hướng"
>
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<div class="flex h-14 items-center justify-around">
		<div class="absolute right-2 top-1">
			<LiveStatusIndicator />
		</div>
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				class="flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 px-3 font-sans text-xs transition-colors motion-reduce:transition-none {$page.url.pathname.startsWith(
					tab.href
				)
					? 'font-semibold text-primary'
					: 'text-gray-500'}"
			>
				<span class="text-lg">{tab.icon}</span>
				<span>{tab.label}</span>
			</a>
		{/each}
	</div>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</nav>
