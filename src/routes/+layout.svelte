<script>
	import Header from './Header.svelte';
	import './styles.css';
	import './side-menu.css';
</script>

<div class="app" id="layout">
	<Header />

	<main>
		<slot />
	</main>
</div>

<style>
</style>
