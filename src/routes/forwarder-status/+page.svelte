<script lang="ts">
	import { getForwarderStatus } from '$lib/backend/main';

	let statusPromise = getForwarderStatus();
</script>

<svelte:head>
	<title>Forwarder Status</title>
</svelte:head>

<section>
	<div class="header">
		<h1>Forwarder Status</h1>
	</div>
	<div class="content">
		{#await statusPromise}
			<p>Loading ...</p>
		{:then status}
			<table class="pure-table">
				<thead>
					<tr>
						<th>Item</th>
						<th>Value</th>
					</tr>
				</thead>
				<tbody>
					{#each Object.entries(status) as [key, value], idx}
						<tr class={idx % 2 === 0 ? 'pure-table-odd' : undefined}>
							<td>{key}</td>
							{#if key.endsWith('Timestamp')}
								<td>{new Date(value).toLocaleString()}</td>
							{:else}
								<td>{value}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/await}
	</div>
</section>
