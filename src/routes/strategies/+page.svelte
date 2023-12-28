<script lang="ts">
	import { getStrategyChoiceList } from '$lib/backend/main';
	import type { StrategyChoice } from '$lib/backend/strategy-choice';
	import * as nfdmgmt from '@ndn/nfdmgmt';
	import { Name, digestSigning } from '@ndn/packet';

	type ResponseType = {
		stCode?: number;
		stText?: string;
		strategies: Array<{ name: string; strategy: string }>;
	};

	const run = async () => {
		const scList = await getStrategyChoiceList();
		const ret: ResponseType = {
			strategies: scList.strategyChoices.map((value) => ({
				name: value.name.toString(),
				strategy: value.strategy.name.toString()
			}))
		};
		return ret;
	};

	$: dataPromise = run();

	let newStrategyPrefix = '';
	let newStrategyValue = '';

	const setStrategy = async (prefix: string, strategy: string) => {
		const response = await nfdmgmt.invoke(
			'strategy-choice/set',
			{ name: new Name(prefix), strategy: new Name(strategy) },
			{
				prefix: nfdmgmt.localhostPrefix,
				signer: digestSigning
			}
		);
		const newData = await run();
		return { ...newData, stCode: response.statusCode, stText: response.statusText };
	};

	const unsetStrategy = async (prefix: string) => {
		const response = await nfdmgmt.invoke(
			'strategy-choice/unset',
			{ name: new Name(prefix) },
			{
				prefix: nfdmgmt.localhostPrefix,
				signer: digestSigning
			}
		);
		const newData = await run();
		return { ...newData, stCode: response.statusCode, stText: response.statusText };
	};
</script>

<svelte:head>
	<title>Strategy List</title>
</svelte:head>

<section>
	<div class="header">
		<h1>Strategy List</h1>
	</div>
	<div class="content">
		{#await dataPromise}
			<p>Loading ...</p>
		{:then data}
			<table class="pure-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Strategy</th>
						<th>Delete</th>
					</tr>
				</thead>
				<tbody>
					{#each data.strategies as item, idx}
						<tr class={idx % 2 === 0 ? 'pure-table-odd' : undefined}>
							<td>{item.name}</td>
							<td>{item.strategy}</td>
							<td>
								<div>
									<button
										on:click={() => {
											dataPromise = unsetStrategy(item.name);
										}}
									>
										Unset
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<div class="pure-form">
				<p>
					<label for="name">Name</label>
					<input type="text" name="name" id="name" bind:value={newStrategyPrefix} />
				</p>
				<p>
					<label for="strategy">Strategy</label>
					<select name="strategy" id="strategy" bind:value={newStrategyValue}>
						<option value="/localhost/nfd/strategy/multicast">Multicast</option>
						<option value="/localhost/nfd/strategy/best-route">Best Route</option>
						<option value="/localhost/nfd/strategy/access">Access Router</option>
						<option value="/localhost/nfd/strategy/asf">ASF (Adaptive SRTT-based Forwarding)</option>
						<option value="/localhost/nfd/strategy/self-learning">Self-Learning</option>
						<option value="/localhost/nfd/strategy/ncc">NCC (CCNx default)</option>
					</select>
				</p>
				<p>
					<button
						on:click={() => {
							dataPromise = setStrategy(newStrategyPrefix, newStrategyValue);
						}}
					>
						Set
					</button>
				</p>
			</div>
			{#if data.stCode}
				<p>{data.stCode} {data.stText}</p>
			{/if}
		{/await}
	</div>
</section>
