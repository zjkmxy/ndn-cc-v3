<script>
	import { face } from '$lib/backend/main';

	/** Whether the face is connected */
	$: connected = $face !== undefined;
</script>

<svelte:head>
	<title>NDN Forwarder Manager</title>
	<meta name="description" content="NDN Forwarder Manager" />
</svelte:head>

<section>
	<div class="header">
		<h1>NDN Forwarder Manager</h1>
	</div>
	<div class="content">
		{#if connected}
			<div id="green-text" class="center-text">NFD is running.</div>
		{:else}
			<div id="red-text" class="center-text">NFD is not running.</div>
		{/if}
	</div>
</section>

<style>
	#green-text {
		color: green;
	}

	#red-text {
		color: red;
	}

	.center-text {
		text-align: center;
		font-size: xx-large;
	}
</style>
