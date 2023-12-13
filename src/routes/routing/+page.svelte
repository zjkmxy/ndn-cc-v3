<script lang="ts">
	import { page } from '$app/stores';
	import type { FibEntry, NextHopRecord } from '$lib/backend/fib-status';
	import { getFaceList, getFibList, getRibList } from '$lib/backend/main';
	import type { RibEntry, Route } from '$lib/backend/rib-status';
	import RouteListTable from './RouteListTable.svelte';

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
					<form action="/routing/add" method="post">
						<p>
							<label for="name">Prefix</label>
							<input type="text" name="name" id="name" />
						</p>
						<p>
							<label for="face_id">Face ID</label>
							<input type="text" name="face_id" id="face_id" />
						</p>
						<p>
							<button type="submit">Add</button>
						</p>
					</form>
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
										<td><a href="/faces?face_id={route.faceId}">{route.faceId}</a></td>
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
										<td><a href="/faces?face_id={route.faceId}">{route.faceId}</a></td>
										<td>{data.faceMap[route.faceId]}</td>
										<td>{route.origin}</td>
										<td>{route.cost}</td>
										<td>{route.flags}</td>
										<td>
											<form action="/routing/remove" method="post">
												<input type="hidden" name="name" value={requestName} />
												<input type="hidden" name="face_id" value={route.faceId} />
												<button type="submit">Remove</button>
											</form>
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