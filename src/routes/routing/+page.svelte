<script lang="ts">
	import { page } from '$app/stores';
	import type { FibEntry, NextHopRecord } from '$lib/backend/fib-status';
	import { getFaceList, getFibList, getRibList } from '$lib/backend/main';
	import type { RibEntry, Route } from '$lib/backend/rib-status';
	import { ControlCommand } from '@ndn/nfdmgmt';
	import RouteListTable from './RouteListTable.svelte';
	import { Name, digestSigning } from '@ndn/packet';
	import { routeOriginRepr } from '$lib/backend/enums';

	type ResponseType = {
		stCode?: number;
		stText?: string;
		faceMap: Record<number, string>;
		fibList: FibEntry[];
		ribList: RibEntry[];
		fibRoutes: NextHopRecord[];
		ribRoutes: Route[];
	};

	$: requestName = $page.url.searchParams.get('name');

	const run = async (requestName: string | null) => {
		const faceList = await getFaceList();
		const fibList = await getFibList();
		const ribList = await getRibList();
		const ret: ResponseType = {
			faceMap: {},
			fibList: fibList.fibEntries,
			ribList: ribList.entries,
			fibRoutes: [],
			ribRoutes: []
		};

		for (const face of faceList.faces) {
			ret.faceMap[face.faceId] = face.uri;
		}
		if (requestName) {
			for (const ent of fibList.fibEntries) {
				if (ent.name.toString() == requestName) {
					ret.fibRoutes = ent.nextHopRecords;
					break;
				}
			}
			for (const ent of ribList.entries) {
				if (ent.name.toString() == requestName) {
					ret.ribRoutes = ent.routes;
					break;
				}
			}
		}

		return ret;
	};

	$: dataPromise = run(requestName);

	let newRouteName = '';
	let newRouteFaceId = 0;

	const addRoute = async (prefix: string, faceId: number) => {
		const response = await ControlCommand.call(
			'rib/register',
			{ name: new Name(prefix), faceId: faceId },
			{
				commandPrefix: ControlCommand.localhostPrefix,
				signer: digestSigning
			}
		);
		const newData = await run(requestName);
		return { ...newData, stCode: response.statusCode, stText: response.statusText };
	};

	const removeRoute = async (prefix: string, faceId: number) => {
		const response = await ControlCommand.call(
			'rib/unregister',
			{ name: new Name(prefix), faceId: faceId },
			{
				commandPrefix: ControlCommand.localhostPrefix,
				signer: digestSigning
			}
		);
		const newData = await run(requestName);
		return { ...newData, stCode: response.statusCode, stText: response.statusText };
	};
</script>

<svelte:head>
	<title>Routes</title>
</svelte:head>

<section>
	<div class="header">
		<h1>Routing</h1>
	</div>
	<div class="content">
		{#await dataPromise}
			<p>Loading ...</p>
		{:then data}
			<div class="pure-g">
				<div id="left-side" class="pure-u-1-2">
					<RouteListTable
						title="Forwarding Table (FIB)"
						entriesList={data.fibList.map((entry) => ({
							name: entry.name.toString(),
							count: entry.nextHopRecords.length
						}))}
					/>
					<br />
					<RouteListTable
						title="Routing Table (RIB)"
						entriesList={data.ribList.map((entry) => ({
							name: entry.name.toString(),
							count: entry.routes.length
						}))}
					/>
					<br />
					<div>
						<p>
							<label for="name">Prefix</label>
							<input type="text" name="name" id="name" bind:value={newRouteName} />
						</p>
						<p>
							<label for="faceId">Face ID</label>
							<input type="text" name="faceId" id="faceId" bind:value={newRouteFaceId} />
						</p>
						<p>
							<button
								on:click={() => {
									dataPromise = addRoute(newRouteName, newRouteFaceId);
								}}
							>
								Add
							</button>
						</p>
					</div>
					{#if data.stCode}
						<p>{data.stCode} {data.stText}</p>
					{/if}
				</div>
				<div id="right-side" class="pure-u-1-2">
					{#if data.fibRoutes.length > 0}
						<h2>FIB Entry for {requestName}</h2>
						<table class="pure-table">
							<thead>
								<tr>
									<th>Face</th>
									<th>URI</th>
									<th>Cost</th>
								</tr>
							</thead>
							<tbody>
								{#each data.fibRoutes as route, idx}
									<tr class={idx % 2 === 0 ? 'pure-table-odd' : undefined}>
										<td><a href="/faces?faceId={route.faceId}">{route.faceId}</a></td>
										<td>{data.faceMap[route.faceId]}</td>
										<td>{route.cost}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
					{#if data.ribRoutes.length > 0}
						<h2>RIB Entry for {requestName}</h2>
						<table class="pure-table">
							<thead>
								<tr>
									<th>Face</th>
									<th>URI</th>
									<th>Origin</th>
									<th>Cost</th>
									<th>Flags</th>
									<th>Delete</th>
								</tr>
							</thead>
							<tbody>
								{#each data.ribRoutes as route, idx}
									<tr class={idx % 2 === 0 ? 'pure-table-odd' : undefined}>
										<td><a href="/faces?faceId={route.faceId}">{route.faceId}</a></td>
										<td>{data.faceMap[route.faceId]}</td>
										<td>{routeOriginRepr(route.origin)}</td>
										<td>{route.cost}</td>
										<td>{route.flags}</td>
										<td>
											<div>
												<button on:click={() => {
														dataPromise = removeRoute(requestName!, route.faceId);
													}}>
													Remove
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			</div>
		{/await}
	</div>
</section>
