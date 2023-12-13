<script lang="ts">
	export let title: string;
	export let entriesList: Array<{
		name: string;
		count: number;
	}>;
</script>

<h2>{title}</h2>
<table class="pure-table pure-table-bordered">
	<thead>
		<tr>
			<th>Prefix</th>
			<th>#Route</th>
		</tr>
	</thead>
	<tbody>
		{#each entriesList as entry, idx}
			<tr class={idx % 2 === 0 ? 'pure-table-odd' : undefined}>
				<td><a href="/routing?name={encodeURIComponent(entry.name)}">{entry.name}</a></td>
				<td>{entry.count}</td>
			</tr>
		{/each}
	</tbody>
</table>
