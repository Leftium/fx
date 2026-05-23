<script lang="ts">
	import { createOpaqueImageData, type FxState } from '$lib/fx-harness.svelte';
	import { generateNoiseUint8, renderNoisePalette } from '$lib/generateNoise';
	import GraphicalEffect from '$lib/GraphicalEffect.svelte';
	import { makeFirePalette, paletteCyan, makePaletteGraySlice } from '$lib/palette';

	let imageData: ImageData;
	let noisePrev = new Uint8Array(0);
	let noiseNext = new Uint8Array(0);

	let noiseMask = new Uint8Array(0);
	let randValues = new Uint8Array(0);
</script>

<main>
	<GraphicalEffect
		oninit={(fx: FxState) => {
			//console.log('init', $state.snapshot(fx));
			fx.scalingFactor = 1 / 2;
			// Pixel ratio based on NTSC 440x486 resolution stretched to 4:3 aspect ratio.
			fx.pixelAspectRatio = ((4 / 440) * 486) / 3;

			fx.palettes.push(makePaletteGraySlice(0, 255, 'Black & White'));
			fx.palettes.push(paletteCyan);
			fx.palettes.push(makeFirePalette({ extended: true }));
		}}
		onresize={(fx, width, height) => {
			console.log('resizeHandler', { width, height });
			if (imageData && imageData.height === height && imageData.width === width) {
				return;
			}

			imageData = createOpaqueImageData(width, height);
			noisePrev = new Uint8Array(width * height);
			noiseNext = new Uint8Array(width * height);
			noiseMask = new Uint8Array(width * height);
			randValues = new Uint8Array(width * height);

			generateNoiseUint8(noisePrev);
			generateNoiseUint8(noiseNext);

			for (let j = 0; j < imageData.height; j++) {
				for (let i = 0; i < imageData.width; i++) {
					const gridX = Math.floor(i / (100 / fx.pixelAspectRatio)) % 2;
					const gridY = Math.floor(j / 100) % 2;
					const index = i + j * imageData.width;

					if (gridX == 0 && gridY == 0) {
						noiseMask[index] = 255;
					}

					if (gridX == 1 && gridY == 1) {
						noiseMask[index] = 255 * 0.8;
					}
				}
			}
		}}
		onupdate={() => {
			[noisePrev, noiseNext] = [noiseNext, noisePrev];

			generateNoiseUint8(noiseNext);
			generateNoiseUint8(randValues);

			for (let i = 0; i < noiseNext.length; i++) {
				if (randValues[i] <= noiseMask[i]) {
					noiseNext[i] = noisePrev[i];
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
