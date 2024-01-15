<script lang="ts">
	import {
		faceEventKindToString,
		facePersistencyToString,
		faceScopeToString,
		linkTypeToString
	} from '@ucla-irl/ndnts-aux/nfd-mgmt';
	import { faceEvents } from '$lib/backend/main';
</script>

<svelte:head>
	<title>Face Events</title>
</svelte:head>

<section>
	<div class="header">
		<h1>Face Events</h1>
	</div>
	<div class="content">
		<table class="pure-table pure-table-bordered" id="chat-log">
			<thead>
				<tr>
					<th>Seq ID</th>
					<th>Event Recved Time</th>
					<th>Face ID</th>
					<th>Local URI</th>
					<th>Event Kind</th>
					<th>Remote URI</th>
					<th>Face Scope</th>
					<th>Face Persistency</th>
					<th>Link Type</th>
					<th>Flags</th>
				</tr>
			</thead>
			<tbody>
				{#each $faceEvents as event, idx}
					<tr>
						<td>{idx}</td>
						<td>{new Date(event.time).toLocaleString()}</td>
						<td>{event.faceId}</td>
						<td>{event.localUri}</td>
						<td>{faceEventKindToString(event.faceEventKind)}</td>
						<td>{event.uri}</td>
						<td>{faceScopeToString(event.faceScope)}</td>
						<td>{facePersistencyToString(event.facePersistency)}</td>
						<td>{linkTypeToString(event.linkType)}</td>
						<td>{event.flags}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<style>
	table.pure-table {
		margin-left: -130px;
		font-size: 16px;
		white-space: nowrap;
	}

	.pure-table thead {
		text-align: center;
	}

	.pure-table td,
	.pure-table th {
		padding: 2px 2px;
	}
</style>
