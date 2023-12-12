<script lang='ts'>
	import { page } from '$app/stores';
	export let linkName: string;
	export let pageName: string;
</script>

<li
	class={$page.url.pathname === linkName ? 'pure-menu-item pure-menu-selected' : 'pure-menu-item'}
>
	<a href={linkName} class="pure-menu-link">{pageName}</a>
</li>
