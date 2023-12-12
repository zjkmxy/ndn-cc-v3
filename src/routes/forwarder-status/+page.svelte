<script lang="ts">
	import { GeneralStatus } from '$lib/backend/general-status';
	import { endpoint } from '$lib/backend/main';
	import { Interest } from '@ndn/packet';
	import { Decoder } from '@ndn/tlv';

	const checkStatus = async () => {
		const result = await endpoint.consume(
			new Interest(
				'/localhost/nfd/status/general',
				Interest.CanBePrefix,
				Interest.MustBeFresh,
				Interest.Lifetime(1000)
			)
		);
		console.log(result.content);
		return Decoder.decode(result.content, GeneralStatus);
	};
	let statusPromise = checkStatus();
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
