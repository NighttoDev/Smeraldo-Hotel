<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	interface Props {
		form: ActionData;
	}

	let { form }: Props = $props();
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Đăng nhập — Smeraldo Hotel</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
	<div class="w-full max-w-sm">
		<!-- Logo / Branding -->
		<div class="mb-8 text-center">
			<h1 class="font-sans text-2xl font-bold text-primary">Smeraldo Hotel</h1>
			<p class="mt-1 font-sans text-sm text-body-text">Hệ thống quản lý khách sạn</p>
		</div>

		<!-- Login Form -->
		<form
			method="POST"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					isSubmitting = false;
					update();
				};
			}}
			class="rounded-lg bg-white p-6 shadow-md"
		>
			<h2 class="mb-6 text-center font-sans text-lg font-semibold text-high-contrast">
				Đăng nhập
			</h2>

			<!-- Error message -->
			{#if form?.error}
				<div
					class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
					role="alert"
				>
					{form.error}
				</div>
			{/if}

			<!-- Email field -->
			<div class="mb-4">
				<label for="email" class="mb-1 block font-sans text-sm font-medium text-high-contrast">
					Email
				</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					value={form?.email ?? ''}
					aria-invalid={form?.error ? 'true' : undefined}
					class="w-full rounded-md border border-gray-300 px-3 py-2 font-sans text-sm text-high-contrast placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					placeholder="email@smeraldo.vn"
				/>
			</div>

			<!-- Password field -->
			<div class="mb-6">
				<label for="password" class="mb-1 block font-sans text-sm font-medium text-high-contrast">
					Mật khẩu
				</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					minlength="6"
					aria-invalid={form?.error ? 'true' : undefined}
					class="w-full rounded-md border border-gray-300 px-3 py-2 font-sans text-sm text-high-contrast placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					placeholder="••••••••"
				/>
			</div>

			<!-- Submit button -->
			<button
				type="submit"
				disabled={isSubmitting}
				class="w-full rounded-md bg-primary px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isSubmitting}
					<span class="inline-flex items-center gap-2">
						<svg
							class="h-4 w-4 animate-spin"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Đang đăng nhập...
					</span>
				{:else}
					Đăng nhập
				{/if}
			</button>
		</form>
	</div>
</div>
