<script lang="ts">
	import { createNoise2D, createNoise3D } from 'simplex-noise';
	import { fbm2D, fbm3D, type FbmOptions } from 'fractal-brownian-noise';

	import { createOpaqueImageData, type FxState } from '$lib/fx-harness.svelte';
	import GraphicalEffect from '$lib/GraphicalEffect.svelte';
	import { type Palette, paletteGray, makeFirePalette } from '$lib/palette';

	type FxNoise = {
		use3D: boolean;

		octaves: number;
		lacunarity: number;
		gain: number;
		ampltude: number;
		frequency: number;

		min: number;
		max: number;

		fbmOptions: FbmOptions;
	};

	let imageData: ImageData;
	let noise = new Float32Array(0);

	const noise2D = createNoise2D();
	const noise3D = createNoise3D();

	const fractalNoise2D = (fx: FxState<FxNoise>, x: number, y: number) =>
		fbm2D(x * 8, y + fx.frame * 2, fx.fbmOptions, noise2D);

	const fractalNoise3D = (fx: FxState<FxNoise>, x: number, y: number) =>
		fbm3D(x * 8, y + fx.frame * 2, fx.frame * 2, fx.fbmOptions, noise3D);

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
			fx.use3D = true;

			// Number of noise layers
			fx.octaves = 6;
			// Frequency multiplier per octave
			fx.lacunarity = 3;
			// Amplitude multiplier per octave
			fx.gain = 0.9;
			// Initial amplitude
			fx.ampltude = 0.1;
			// Initial frequency
			fx.frequency = 0.001;
		}}
		onresize={(fxBase, width, height) => {
			const fx = fxBase as FxState<FxNoise>;
			console.log('resizeHandler', { width, height }, fx.octaves);

			fx.fbmOptions = {
				octaves: fx.octaves,
				lacunarity: fx.lacunarity,
				gain: fx.gain,
				amplitude: fx.ampltude,
				frequency: fx.frequency
			};

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
					const value = fx.use3D ? fractalNoise3D(fx, x, y) : fractalNoise2D(fx, x, y);
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
					3D: ${fx.use3D}
					min: ${fx.min}
					max: ${fx.max}`;
		}}
		onkeydown={(fxBase, event) => {
			const fx = fxBase as FxState<FxNoise>;

			if (event.key === 'd') {
				fx.use3D = !fx.use3D;
			}
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
