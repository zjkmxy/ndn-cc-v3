<script lang="ts">
	import { page } from '$app/stores';
	import type { FaceStatus } from '@ucla-irl/ndnts-aux/nfd-mgmt';
	import { getFaceList, getFibList } from '$lib/backend/main';
	import { invoke, localhostPrefix } from '@ndn/nfdmgmt';
	import { digestSigning } from '@ndn/packet';

	type ResponseType = {
		list: FaceStatus[];
		stCode?: number;
		stText?: string;
		routeData: { route: string; cost: number }[];
		faceData?: FaceStatus;
	};

	$: faceIdStr = $page.url.searchParams.get('faceId');

	const run = async (faceIdStr: string | null) => {
		const faceList = await getFaceList();
		const ret: ResponseType = {
			list: faceList.faces,
			stCode: undefined,
			stText: undefined,
			routeData: [],
			faceData: undefined
		};

		if (faceIdStr) {
			const faceId = parseInt(faceIdStr);
			ret.faceData = faceList.faces.find((v) => v.faceId === faceId);
			if (ret.faceData) {
				const fibList = await getFibList();
				ret.routeData = fibList.fibEntries
					.map((entry) => ({
						name: entry.name,
						cost: entry.nextHopRecords.find((record) => record.faceId === faceId)?.cost
					}))
					.filter((entry) => entry.cost !== undefined)
					.map((entry) => ({
						route: entry.name.toString(),
						cost: entry.cost ?? 0
					}));
			}
		}

		return ret;
	};

	$: facesPromise = run(faceIdStr);

	let newFaceIp = '';
	const addFace = async () => {
		let uri = newFaceIp;
		if (uri[-1] == '/') {
			uri = uri.substring(0, uri.length - 1);
		}
		if (uri.search('://') < 0) {
			uri = 'udp4://' + uri;
		}
		if (uri.split(':').length < 3) {
			uri = uri + ':6363';
		}

		const response = await invoke(
			'faces/create' as any,
			{ uri },
			{
				prefix: localhostPrefix,
				signer: digestSigning
			}
		);
		const newFaces = await run(faceIdStr);
		return { ...newFaces, stCode: response.statusCode, stText: response.statusText };
	};

	const removeFace = async (faceId: number) => {
		const response = await invoke(
			'faces/destroy' as any,
			{ faceId },
			{
				prefix: localhostPrefix,
				signer: digestSigning
			}
		);
		const newFaces = await run(faceIdStr);
		return { ...newFaces, stCode: response.statusCode, stText: response.statusText };
	};
</script>

<svelte:head>
	<title>Faces</title>
</svelte:head>

<section>
	<div class="header">
		<h1>Faces</h1>
	</div>
	<div class="content">
		{#await facesPromise}
			<p>Loading ...</p>
		{:then faces}
			<div class="pure-g">
				<div id="left-side" class="pure-u-1-2">
					<br />
					<form class="pure-form">
						<input
							type="text"
							id="face_search"
							class="pure-input-3-4"
							placeholder="Search Faces... (TBD)"
							title="Type in a keyword"
						/>
					</form>
					<br />
					<table class="pure-table">
						<thead>
							<tr>
								<th>Face ID</th>
								<th>URI</th>
								<th hidden>Local URI</th>
								<th>Delete</th>
							</tr>
						</thead>
						<tbody id="div_face_list">
							{#each faces.list as item, idx}
								<tr class={idx % 2 === 0 ? 'pure-table-odd' : undefined}>
									<td><a href="/faces?faceId={item.faceId}">{item.faceId}</a></td>
									<td>{item.uri}</td>
									<td hidden>{item.localUri}</td>
									<td>
										<div class="pure-form">
											<button
												on:click={() => {
													facesPromise = removeFace(item.faceId);
												}}
											>
												Remove
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					<div class="pure-form">
						<p>
							<label for="ip">IP Addr</label>
							<input type="text" name="ip" id="ip" bind:value={newFaceIp} />
						</p>
						<p>
							<button
								on:click={() => {
									facesPromise = addFace();
								}}
							>
								Create
							</button>
						</p>
					</div>
					{#if faces.stCode}
						<p>{faces.stCode} {faces.stText}</p>
					{/if}
				</div>
				<div id="right-side" class="pure-u-1-2">
					{#if faces.faceData}
						<h2>Face {faces.faceData.faceId}</h2>
						<table class="pure-table">
							<tbody>
								<tr class="pure-table-odd">
									<td><b>Local</b></td>
									<td>{faces.faceData.localUri}</td>
								</tr>
								<tr>
									<td><b>Remote</b></td>
									<td>{faces.faceData.uri}</td>
								</tr>
								<tr class="pure-table-odd">
									<td><b>MTU</b></td>
									<td>{faces.faceData.mtu}</td>
								</tr>
								<tr>
									<td><b>Flags</b></td>
									<td>{faces.faceData.flags}</td>
								</tr>
								<tr class="pure-table-odd">
									<td><b>RX Interest</b></td>
									<td>{faces.faceData.nInInterests}</td>
								</tr>
								<tr>
									<td><b>RX Data</b></td>
									<td>{faces.faceData.nInData}</td>
								</tr>
								<tr class="pure-table-odd">
									<td><b>RX Nack</b></td>
									<td>{faces.faceData.nInNacks}</td>
								</tr>
								<tr>
									<td><b>TX Interest</b></td>
									<td>{faces.faceData.nOutInterests}</td>
								</tr>
								<tr class="pure-table-odd">
									<td><b>TX Data</b></td>
									<td>{faces.faceData.nOutData}</td>
								</tr>
								<tr>
									<td><b>TX Nack</b></td>
									<td>{faces.faceData.nOutNacks}</td>
								</tr>
							</tbody>
						</table>
					{/if}
					{#if faces.routeData.length > 0}
						<h2>FIB Entries</h2>
						<table class="pure-table">
							<thead>
								<tr>
									<th>Route</th>
									<th>Cost</th>
								</tr>
							</thead>
							<tbody>
								{#each faces.routeData as route, idx}
									<tr class={idx % 2 === 0 ? 'pure-table-odd' : undefined}>
										<td><a href="/routing?name={encodeURIComponent(route.route)}">{route.route}</a></td>
										<td>{route.cost}</td>
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
