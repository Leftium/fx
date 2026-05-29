<script lang="ts">
	import { page } from '$app/state';
	import { makeFxHarness, type FxState } from './fx-harness.svelte';

	const { fx, fxHarness, getInfoString } = makeFxHarness(page.url);

	interface Props {
		oninit?: (fx: FxState) => void;
		onupdate?: (fx: FxState) => void;
		onresize?: (fx: FxState, width: number, height: number, isSameSize?: boolean) => void;
		onrender: (fx: FxState) => ImageData;
		oninfo?: (fx: FxState, info: string) => string;
		style?: string;
		onkeydown?: (fx: FxState, event: KeyboardEvent) => void;
		onmousemove?: (fx: FxState, event: MouseEvent) => void;
	}

	const {
		oninit: initHandler,
		onupdate: updateHandler,
		onrender: renderHandler,
		onresize: resizeHandler,
		oninfo: infoHandler,
		onkeydown: keydownHandler,
		onmousemove: mousemoveHandler,
		style = 'width: 100%; height: 100%'
	}: Props = $props();
</script>

<graphical-effect
	{@attach fxHarness({
		initHandler,
		updateHandler,
		renderHandler,
		resizeHandler,
		infoHandler,
		keydownHandler,
		mousemoveHandler
	})}
	{style}
>
	<wrap-effect>
		<effect-background style:background-color={fx.bgColor}></effect-background>
		<div class="crt-overlay" hidden={!fx.crtScanlines}></div>
		<div class="info" hidden={fx.infoHidden}>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html getInfoString().replaceAll('\n', '<br>')}
		</div>
	</wrap-effect>
</graphical-effect>

<style>
	graphical-effect,
	graphical-effect > wrap-effect {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	/* CRT scanlines */
	.crt-overlay {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			to bottom,
			transparent 0px,
			transparent 2px,
			rgba(0, 0, 0, 0.12) 2px,
			rgba(0, 0, 0, 0.12) 4px
		);
		z-index: 10;
		pointer-events: none;
	}

	.info {
		position: absolute;
		top: 8px;
		left: 8px;
		padding: 8px;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.8);
		background-color: rgba(0, 0, 0, 0.4);
		font-family: monospace;
		font-size: clamp(12px, 2vw, 18px);
		pointer-events: none;
		z-index: 20;
	}

	wrap-effect {
		z-index: 0;
		background-color: white; /* fallback */

		background-image:
			linear-gradient(45deg, #ccc 25%, transparent 25%),
			linear-gradient(-45deg, #ccc 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #ccc 75%),
			linear-gradient(-45deg, transparent 75%, #ccc 75%);
		background-size: 20px 20px;
		background-position:
			0 0,
			0 10px,
			10px -10px,
			-10px 0px;
	}

	effect-background {
		display: block;
		position: absolute;
		inset: 0;
		z-index: -10;
	}
</style>
