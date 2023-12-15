<script context="module">
	import { connectToNfd, monitorFaceEvents } from '$lib/backend/main';

	connectToNfd().then(monitorFaceEvents);
	// onDestroy(disconnectFromNfd);  // Not allowed. In component only.
</script>

<script>
	import MenuItem from './MenuItem.svelte';
</script>

<header>
	<!-- Menu toggle -->
	<a href="#menu" id="menuLink" class="menu-link">
		<!-- Hamburger icon -->
		<span></span>
	</a>

	<nav id="menu">
		<div class="pure-menu">
			<a class="pure-menu-heading" href="/">NDN Fwder Manager</a>
			<form class="pure-form">
				<input
					type="text"
					id="menu_search"
					class="pure-input-1"
					placeholder="Search (TBD) ..."
					title="Type in a keyword"
				/>
			</form>

			<ul id="div_menu_items" class="pure-menu-list">
				<MenuItem linkName="/forwarder-status" pageName="Forwarder Status" />
				<MenuItem linkName="/faces" pageName="Faces" />
				<MenuItem linkName="/routing" pageName="Routing" />
				<MenuItem linkName="/strategies" pageName="Strategies" />
				<MenuItem linkName="/face-events" pageName="Face Events" />
				<!-- <MenuItem linkName="/autoconf" pageName="Auto Configuration" />
				<MenuItem linkName="/certificate-requests" pageName="Certificate Requests" />
				{// Key management needs SQLite WASM and local file access, which is only doable in some browsers.}
				<MenuItem linkName="/key-management" pageName="Key Management" /> -->
				<MenuItem linkName="/ndn-ping" pageName="NDN Ping" />
			</ul>
		</div>
	</nav>
</header>

<style>
</style>
