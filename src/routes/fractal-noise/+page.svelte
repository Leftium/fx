<script lang="ts">
	import { createNoise2D } from 'simplex-noise';
	import { fbm2D } from 'fractal-brownian-noise';

	import { createOpaqueImageData, type FxState } from '$lib/fx-harness.svelte';
	import GraphicalEffect from '$lib/GraphicalEffect.svelte';
	import { type Palette, paletteGray, makeFirePalette } from '$lib/palette';

	type FxNoise = {
		min: number;
		max: number;
	};

	let imageData: ImageData;
	let noise = new Float32Array(0);

	const noise2d = createNoise2D();

	function renderNoise(noise: Float32Array, imageData: ImageData, palette: Palette = paletteGray) {
		// reinterpret the buffer as 32‑bit words
		const data32 = new Uint32Array(imageData.data.buffer);

		for (let i = 0; i < noise.length; i++) {
			const intensity = (((noise[i] + 1) / 2) * palette.length) | 0;
			data32[i] = palette[intensity];
		}
		return imageData;
	}
</script>

<main>
	<GraphicalEffect
		oninit={(fxBase) => {
			const fx = fxBase as FxState<FxNoise>;

			fx.standardSize = true;
			fx.standardWidth = 800;
			fx.standardHeight = 200;

			fx.scalingFactor = 1 / 2;

			fx.palettes.push(makeFirePalette());
			fx.palettes.push(makeFirePalette({ extended: true }));

			fx.crtScanlines = false;

			fx.min = Number.MAX_VALUE;
			fx.max = 0;
		}}
		onresize={(fx, width, height) => {
			console.log('resizeHandler', { width, height });
			if (imageData && imageData.height === height && imageData.width === width) {
				return;
			}

			imageData = createOpaqueImageData(width, height);
			noise = new Float32Array(width * height);
		}}
		onupdate={(fxBase) => {
			const fx = fxBase as FxState<FxNoise>;
			for (let y = 0; y < fx.height; y++) {
				for (let x = 0; x < fx.width; x++) {
					const value = fbm2D(
						x * 3,
						y + fx.frame,
						{
							// Number of noise layers (default: 4)
							octaves: 6,
							// Frequency multiplier per octave (default: 2.0)
							lacunarity: 3,
							// Amplitude multiplier per octave (default: 0.5)
							gain: 0.9,
							// Initial amplitude (default: 1.0)
							amplitude: 0.1,
							// Initial frequency (default: 1.0)
							frequency: 0.001
						},
						noise2d
					);
					noise[y * fx.width + x] = value;
					fx.min = Math.min(value, fx.min);
					fx.max = Math.max(value, fx.max);
				}
			}
		}}
		onrender={(fx) => renderNoise(noise, imageData, fx.palettes[fx.paletteIndex])}
		oninfo={(fxBase, info) => {
			const fx = fxBase as FxState<FxNoise>;
			return `${info}
					frame: ${fxBase.frame}
					min: ${fx.min}
					max: ${fx.max}`;
		}}
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
