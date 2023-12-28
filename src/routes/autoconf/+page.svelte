<script lang="ts">
	import { queryFaceId } from '$lib/backend/main';
	import { fchQuery } from '@ndn/autoconfig';
	import * as nfdmgmt from '@ndn/nfdmgmt';
	import { Name, digestSigning } from '@ndn/packet';

	let msg = '';

	const onAutoconfig = async () => {
		const fchRes = await fchQuery({
			transport: 'udp',
			network: 'ndn'
		});
		if (fchRes.routers.length <= 0) {
			msg = 'No hub found.';
			return;
		}
		const url = new URL('http://' + fchRes.routers[0].connect);
		console.log(url);

		// DNS resolution
		const dnsResponse = await fetch(`https://dns.google/resolve?name=${url.hostname}`);
		const dnsJson = await dnsResponse.json();
		const ip = dnsJson.Answer[0].data;

		const uri = 'udp4://' + ip + ':' + url.port;
		console.log(uri);
		const response = await nfdmgmt.invoke(
			'faces/create' as any,
			{ uri },
			{
				prefix: nfdmgmt.localhostPrefix,
				signer: digestSigning
			}
		);
		if (response.statusCode !== 200) {
			msg = `Failed to add face: ${response.statusCode} ${response.statusText}`;
			return;
		}

		let faceId;
		try {
			faceId = await queryFaceId(uri);
		} catch (e) {
			msg = `Unable to obtain face ID: ${e}`;
			return;
		}

		await nfdmgmt.invoke(
			'rib/register',
			{ name: new Name('/ndn'), faceId: faceId, origin: 66, cost: 100 },
			{
				prefix: nfdmgmt.localhostPrefix,
				signer: digestSigning
			}
		);

		await nfdmgmt.invoke(
			'rib/register',
			{ name: new Name('/localhop/nfd'), faceId: faceId, origin: 66, cost: 100 },
			{
				prefix: nfdmgmt.localhostPrefix,
				signer: digestSigning
			}
		);

		msg = `Auto-configuration finished: ${url.hostname} ${uri} added`;
	};
</script>

<svelte:head>
	<title>Auto Configuration</title>
</svelte:head>

<section>
	<div class="header">
		<h1>Auto Configuration</h1>
	</div>
	<div class="content">
		<div class="center">
			<button class="pure-button pure-button-primary" on:click={onAutoconfig}>
				Connect to NDN Testbed through the closest NDN router.
			</button>
		</div>
		{#if msg}
			<p class="center">{msg}</p>
		{/if}
	</div>
</section>

<style>
	.center {
		text-align: center;
	}
	.center-text {
		text-align: center;
		font-size: xx-large;
	}
</style>
