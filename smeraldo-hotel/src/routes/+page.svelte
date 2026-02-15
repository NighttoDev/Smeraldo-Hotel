<script lang="ts">
	// Root page — authenticated users are redirected to role-appropriate home
	// via +page.server.ts. Unauthenticated users are redirected to /login
	// via hooks.server.ts auth gate. This page is a fallback only.
</script>

<div class="flex min-h-screen items-center justify-center bg-background">
	<div class="text-center">
		<h1 class="font-sans text-2xl font-semibold text-primary">Smeraldo Hotel</h1>
		<p class="mt-2 font-sans text-sm text-body-text">Hệ thống quản lý khách sạn</p>
		<p class="mt-4 font-sans text-xs text-gray-400">Đang chuyển hướng...</p>
	</div>
</div>
