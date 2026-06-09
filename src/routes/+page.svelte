<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@leftium/nimble.css/dist/nimble.min.css" />
</svelte:head>

<main>
	<ul>
		<li><a href={resolve('/fractal-noise')}>fractal noise</a></li>
		<li><a href={resolve('/static')}>static</a></li>
		<li><a href={resolve('/double-static')}>double static</a></li>
		<li><a href={resolve('/gradient')}>gradient</a></li>
		<li><a href={resolve('/fire-plasma')}>fire plasma</a></li>
	</ul>

	<ul>
		<li><a href={resolve('/fire-palette')}>fire palette</a></li>
	</ul>

	Static effect based on:<a href="https://codepen.io/matthewhudson/pen/KOPxNv"
		>https://codepen.io/matthewhudson/pen/KOPxNv</a
	>

	<hr />

	<a href="https://github.com/Leftium/fx">https://github.com/Leftium/fx</a>
</main>
