<script lang="ts">
	import InventoryList from '$lib/components/inventory/InventoryList.svelte';
	import StockInForm from '$lib/components/inventory/StockInForm.svelte';
	import StockOutForm from '$lib/components/inventory/StockOutForm.svelte';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { realtimeStatusStore } from '$lib/stores/realtimeStatus';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let lowStockCount = $derived(
		data.items.filter((item) => item.current_stock <= item.low_stock_threshold).length
	);

	let activeTab = $state<'list' | 'stock-in' | 'stock-out'>('list');

	async function handleFormSuccess() {
		await invalidateAll();
		activeTab = 'list';
	}
</script>

<svelte:head>
	<title>Kho hàng — Smeraldo Hotel</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-6">
	<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="font-sans text-xl font-bold text-high-contrast">Kho hàng</h1>
			<div class="mt-1 flex items-center gap-2">
				<p class="font-sans text-sm text-gray-500">
					{data.items.length} sản phẩm
				</p>
				{#if lowStockCount > 0}
					<span
						class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-sans text-xs font-medium text-amber-800"
					>
						{lowStockCount} sắp hết
					</span>
				{/if}
			</div>
		</div>

		<!-- Inventory Report Button (Manager only) -->
		{#if data.role === 'manager'}
			<a
				href="/inventory-report"
				class="flex min-h-[48px] items-center gap-2 rounded-lg bg-primary px-4 font-sans text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 motion-reduce:transition-none"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="h-5 w-5"
				>
					<path
						d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z"
					/>
				</svg>
				Báo cáo kho hàng
			</a>
		{/if}
	</div>

	{#if !$realtimeStatusStore.connected}
		<div class="mb-4 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-sans text-sm text-gray-700">
			Ngoại tuyến — đang hiển thị dữ liệu đã đồng bộ gần nhất
		</div>
	{/if}

	<!-- Tab Navigation -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8" aria-label="Tabs">
			<button
				type="button"
				onclick={() => (activeTab = 'list')}
				class="border-b-2 px-1 py-4 font-sans text-sm font-medium transition-colors"
				class:border-primary={activeTab === 'list'}
				class:text-primary={activeTab === 'list'}
				class:border-transparent={activeTab !== 'list'}
				class:text-gray-500={activeTab !== 'list'}
				class:hover:border-gray-300={activeTab !== 'list'}
				class:hover:text-gray-700={activeTab !== 'list'}
				aria-current={activeTab === 'list' ? 'page' : undefined}
			>
				Danh sách tồn kho
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'stock-in')}
				class="border-b-2 px-1 py-4 font-sans text-sm font-medium transition-colors"
				class:border-primary={activeTab === 'stock-in'}
				class:text-primary={activeTab === 'stock-in'}
				class:border-transparent={activeTab !== 'stock-in'}
				class:text-gray-500={activeTab !== 'stock-in'}
				class:hover:border-gray-300={activeTab !== 'stock-in'}
				class:hover:text-gray-700={activeTab !== 'stock-in'}
				aria-current={activeTab === 'stock-in' ? 'page' : undefined}
			>
				Nhập kho
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'stock-out')}
				class="border-b-2 px-1 py-4 font-sans text-sm font-medium transition-colors"
				class:border-primary={activeTab === 'stock-out'}
				class:text-primary={activeTab === 'stock-out'}
				class:border-transparent={activeTab !== 'stock-out'}
				class:text-gray-500={activeTab !== 'stock-out'}
				class:hover:border-gray-300={activeTab !== 'stock-out'}
				class:hover:text-gray-700={activeTab !== 'stock-out'}
				aria-current={activeTab === 'stock-out' ? 'page' : undefined}
			>
				Xuất kho
			</button>
		</nav>
	</div>

	<!-- Tab Content -->
	<div class="mt-6">
		{#if activeTab === 'list'}
			{#if data.items.length === 0}
				<div class="rounded-lg border border-gray-200 p-8 text-center">
					<p class="font-sans text-sm text-gray-500">Chưa có sản phẩm nào.</p>
				</div>
			{:else}
				<InventoryList
					items={data.items}
					userRole={data.role ?? ''}
					thresholdForm={data.thresholdForm}
				/>
			{/if}
		{:else if activeTab === 'stock-in'}
			<div class="mx-auto max-w-lg">
				<h2 class="mb-4 font-sans text-lg font-semibold text-high-contrast">Nhập kho</h2>
				<StockInForm
					data={data.stockInForm}
					items={data.items}
					onSuccess={handleFormSuccess}
				/>
			</div>
		{:else if activeTab === 'stock-out'}
			<div class="mx-auto max-w-lg">
				<h2 class="mb-4 font-sans text-lg font-semibold text-high-contrast">Xuất kho</h2>
				<StockOutForm
					data={data.stockOutForm}
					items={data.items}
					onSuccess={handleFormSuccess}
				/>
			</div>
		{/if}
	</div>
</div>
