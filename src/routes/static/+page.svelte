<script lang="ts">
	import { textMask, type Mask } from '$lib/draw';
	import { createOpaqueImageData, type FxState } from '$lib/fx-harness.svelte';
	import { generateNoiseUint8, renderNoisePalette } from '$lib/generateNoise';
	import GraphicalEffect from '$lib/GraphicalEffect.svelte';
	import { makeFirePalette, paletteCyan, makePaletteGraySlice } from '$lib/palette';

	type FxStatic = {
		text: string;
	};

	let imageData: ImageData;
	let noisePrev = new Uint8Array(0);
	let noiseNext = new Uint8Array(0);

	let mask: Mask | null = null;
</script>

<main>
	<GraphicalEffect
		oninit={(fxBase) => {
			const fx = fxBase as FxState<FxStatic>;
			//console.log('init', $state.snapshot(fx));
			fx.scalingFactor = 1 / 2;
			// Pixel ratio based on NTSC 440x486 resolution stretched to 4:3 aspect ratio.
			fx.pixelAspectRatio = ((4 / 440) * 486) / 3;

			fx.palettes.push(makePaletteGraySlice(0, 255, 'Black & White'));
			fx.palettes.push(paletteCyan);
			fx.palettes.push(makeFirePalette({ extended: true }));

			fx.text = 'SECRET';
		}}
		onresize={(fx, width, height) => {
			console.log('resizeHandler', { width, height });
			if (imageData && imageData.height === height && imageData.width === width) {
				return;
			}

			mask = textMask((fx as FxState<FxStatic>).text, '36px sans-serif', true);

			imageData = createOpaqueImageData(width, height);
			noisePrev = new Uint8Array(width * height);
			noiseNext = new Uint8Array(width * height);

			generateNoiseUint8(noisePrev);
			generateNoiseUint8(noiseNext);
		}}
		onupdate={(fx) => {
			[noisePrev, noiseNext] = [noiseNext, noisePrev];

			generateNoiseUint8(noiseNext);

			if (mask) {
				const x = ((fx.active ? fx.mouseX : fx.width / 2) - mask.width / 2) | 0;
				const y =
					((fx.active ? fx.mouseY - mask.height * 0.25 : fx.height / 2) - mask.height / 2) | 0;
				for (const { u, v } of mask.data) {
					const index = (y + v) * fx.width + (x + u);
					noiseNext[index] = noisePrev[index];
				}
			}
		}}
		onrender={(fx) => renderNoisePalette(noisePrev, imageData, fx.palettes[fx.paletteIndex])}
	></GraphicalEffect>
</main>

<style>
	main {
		display: flex;
		height: 100%;
		align-items: center;
		justify-content: center;
	}
</style>
