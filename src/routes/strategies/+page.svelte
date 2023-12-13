<script lang="ts">
	import { getStrategyChoiceList } from '$lib/backend/main';
	import type { StrategyChoice } from '$lib/backend/strategy-choice';

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
								<form action="/strategies/unset" method="post">
									<input type="hidden" name="name" value={item.name} />
									<button type="submit">Unset</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<form class="pure-form" action="/strategies/set" method="post">
				<p>
					<label for="name">Name</label>
					<input type="text" name="name" id="name" />
				</p>
				<p>
					<label for="strategy">Strategy</label>
					<select name="strategy" id="strategy">
						<option value="/localhost/nfd/strategy/multicast">Multicast</option>
						<option value="/localhost/nfd/strategy/best-route">Best Route</option>
						<option value="/localhost/nfd/strategy/access">Access Router</option>
						<option value="/localhost/nfd/strategy/asf">ASF (Adaptive SRTT-based Forwarding)</option
						>
						<option value="/localhost/nfd/strategy/self-learning">Self-Learning</option>
						<option value="/localhost/nfd/strategy/ncc">NCC (CCNx default)</option>
					</select>
				</p>
				<p>
					<button type="submit">Set</button>
				</p>
			</form>
			{#if data.stCode}
				<p>{data.stCode} {data.stText}</p>
			{/if}
		{/await}
	</div>
</section>
