<script lang="ts">
	import { contentTypeRepr, signatureTypeRepr } from '$lib/backend/enums';
	import { endpoint } from '$lib/backend/main';
	import { Interest, Name } from '@ndn/packet';

	let intNameStr = '';
	let canBePrefix = true;
	let mustBeFresh = true;
	let intLifetime = 4000;
	let downloadUrl = '';

	let response:
		| {
				time: number;
				type: string;
				name: string;
				contentType?: string | number;
				freshnessPeriod?: number;
				finalBlockId?: string;
				signatureType?: string | number;
				reason?: string | number;
				download?: string;
		  }
		| undefined = undefined;

	const expressInterest = async () => {
		const interest = new Interest(new Name(intNameStr), Interest.Lifetime(intLifetime));
		interest.canBePrefix = canBePrefix;
		interest.mustBeFresh = mustBeFresh;
		const tic = performance.now();
		try {
			const result = await endpoint.consume(interest);
			const toc = performance.now();
			if (downloadUrl !== '') {
				URL.revokeObjectURL(downloadUrl);
			}
			downloadUrl = URL.createObjectURL(
				new Blob([result.content], { type: 'application/octet-stream' })
			);
			response = {
				time: toc - tic,
				type: 'Data',
				name: result.name.toString(),
				contentType: contentTypeRepr(result.contentType),
				freshnessPeriod: result.freshnessPeriod,
				finalBlockId: result.finalBlockId?.toString(),
				signatureType: signatureTypeRepr(result.sigInfo.type),
				download: downloadUrl
			};
		} catch (e) {
			const toc = performance.now();
			response = {
				time: toc - tic,
				type: 'Error',
				name: intNameStr,
				reason: (e as Error).message
			};
		}
	};
</script>

<svelte:head>
	<title>NDN Peek</title>
</svelte:head>

<section>
	<div class="header">
		<h1>NDN Peek</h1>
	</div>
	<div class="content">
		<div class="pure-form pure-form-aligned">
			<div class="pure-control-group">
				<label for="name">Name</label>
				<input
					type="text"
					class="pure-u-2-3"
					name="name"
					id="name"
					required
					bind:value={intNameStr}
				/>
			</div>
			<div class="pure-control-group">
				<label for="can_be_prefix">CanBePrefix</label>
				{#each [true, false] as value}
					<input
						type="radio"
						name="can_be_prefix"
						id="can_be_prefix"
						{value}
						bind:group={canBePrefix}
					/>
					{value ? 'True' : 'False'}
				{/each}
			</div>
			<div class="pure-control-group">
				<label for="must_be_fresh">MustBeFresh</label>
				{#each [true, false] as value}
					<input
						type="radio"
						name="must_be_fresh"
						id="must_be_fresh"
						{value}
						bind:group={mustBeFresh}
					/>
					{value ? 'True' : 'False'}
				{/each}
			</div>
			<div class="pure-control-group">
				<label for="interest_lifetime">InterestLifetime (ms)</label>
				<input
					type="number"
					name="interest_lifetime"
					id="interest_lifetime"
					min="0"
					max="120000"
					step="1000"
					value={intLifetime}
					required
				/>
			</div>
			<div class="pure-controls">
				<button on:click={expressInterest} class="pure-button pure-button-primary">
					Express Interest
				</button>
			</div>
		</div>

		{#if response}
			<h2 style="text-align: center">Response</h2>
			<form class="pure-form pure-form-aligned">
				<fieldset>
					<div class="pure-control-group">
						<span>Response Time</span>
						<span class="pure-form-message-inline">{response.time}</span>
					</div>
					<div class="pure-control-group">
						<span>Response Type</span>
						<span class="pure-form-message-inline">{response.type}</span>
					</div>
					<div class="pure-control-group">
						<label for="res_name">Name</label>
						<input
							type="text"
							class="pure-u-2-3"
							name="res_name"
							id="res_name"
							value={response.name}
							readonly
						/>
					</div>
					{#if response.contentType}
						<div class="pure-control-group">
							<span>ContentType</span>
							<span class="pure-form-message-inline">{response.contentType}</span>
						</div>
					{/if}
					{#if response.freshnessPeriod}
						<div class="pure-control-group">
							<span>FreshnessPeriod</span>
							<span class="pure-form-message-inline">{response.freshnessPeriod}</span>
						</div>
					{/if}
					{#if response.finalBlockId}
						<div class="pure-control-group">
							<label for="res_finalblockid">FinalBlockId</label>
							<input
								type="text"
								class="pure-u-2-3"
								name="res_finalblockid"
								id="res_finalblockid"
								value={response.finalBlockId}
								readonly
							/>
						</div>
					{/if}
					{#if response.signatureType}
						<div class="pure-control-group">
							<span>SignatureType</span>
							<span class="pure-form-message-inline">{response.signatureType}</span>
						</div>
					{/if}
					{#if response.reason}
						<div class="pure-control-group">
							<span>Reason Code</span>
							<span class="pure-form-message-inline">{response.reason}</span>
						</div>
					{/if}
					{#if response.download}
						<div class="pure-controls">
							<a class="pure-button pure-button-primary" href={response.download}>Download</a>
						</div>
					{/if}
				</fieldset>
			</form>
		{/if}
	</div>
</section>

<style>
	.pure-form-message-inline {
		font-size: 1.2em;
	}
</style>
