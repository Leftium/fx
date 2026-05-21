<script lang="ts">
	import { createOpaqueImageData, type FxState } from '$lib/fx-harness.svelte';
	import GraphicalEffect from '$lib/GraphicalEffect.svelte';
	import { makeColor, makeFirePalette, makeFirePalette2048, paletteGray } from '$lib/palette';
	import { onMount } from 'svelte';

	let imageData: ImageData;

	let heatPrev = new Float32Array(0);
	let heatNext = new Float32Array(0);

	const padSides = 0;
	const padTop = 1;
	const padBottom = 6;

	let heatWidth = 0;
	let heatHeight = 0;

	let paddedWidth = 0;
	let paddedHeight = 0;

	let minimalHeatThreshold = 0;

	let fireKernels = [
		fireKernelNull,
		fireKernel,
		fireKernelWide,
		fireKernelSkinny,
		fireKernelTruncated
	];
	let fireKernelIndex = $state(1);

	let fireSeeds = [seedFire, seedFireClamped, seedFireRandom];
	let fireSeedIndex = $state(0);

	const colorPurple = makeColor(255, 0, 255);
	const colorGreen = makeColor(0, 255, 0);
	const colorBlack = makeColor(0, 0, 0);
	const colorWhite = makeColor(255, 255, 255);

	// Utility: create fire buffer with padding
	function createFireBuffer(width: number, height: number) {
		paddedWidth = width + padSides * 2;
		paddedHeight = height + padTop + padBottom;
		return new Float32Array(paddedWidth * paddedHeight);
	}

	// Helper: get fire value at (x, y) with padding-aware indexing
	function getFire(fire: Float32Array, x: number, y: number) {
		// Wrap x around using modulo
		return fire[y * paddedWidth + ((x + heatWidth) % heatWidth)];
	}

	// Null kernel.
	function fireKernelNull(x: number, y: number, heatPrev: Float32Array) {
		return getFire(heatPrev, x, y);
	}

	// Kernel: compute next fire value at (x, y)
	function fireKernel(x: number, y: number, heatPrev: Float32Array) {
		let total = 0;

		total += getFire(heatPrev, x + 0, y - 1);

		total += getFire(heatPrev, x - 1, y + 0);
		total += getFire(heatPrev, x + 0, y + 0) * 2;
		total += getFire(heatPrev, x + 1, y + 0);

		total += getFire(heatPrev, x + 0, y + 1);

		total += getFire(heatPrev, x - 1, y + 2);
		total += getFire(heatPrev, x + 1, y + 2);

		total += getFire(heatPrev, x + 0, y + 3);

		total += getFire(heatPrev, x - 1, y + 4);
		total += getFire(heatPrev, x + 0, y + 4);
		total += getFire(heatPrev, x + 1, y + 4);

		return total / 12.02;
	}

	// Kernel: compute next fire value at (x, y)
	function fireKernelWide(x: number, y: number, heatPrev: Float32Array) {
		let total = 0;

		total += getFire(heatPrev, x + 0, y - 1);

		total += getFire(heatPrev, x - 2, y + 0);
		total += getFire(heatPrev, x + 0, y + 0) * 2;
		total += getFire(heatPrev, x + 2, y + 0);

		total += getFire(heatPrev, x + 0, y + 1);

		total += getFire(heatPrev, x - 1, y + 2);
		total += getFire(heatPrev, x + 1, y + 2);

		total += getFire(heatPrev, x + 0, y + 3);

		total += getFire(heatPrev, x - 1, y + 4);
		total += getFire(heatPrev, x + 0, y + 4);
		total += getFire(heatPrev, x + 1, y + 4);

		return total / 12.02;
	}

	// Kernel: compute next fire value at (x, y)
	function fireKernelTruncated(x: number, y: number, heatPrev: Float32Array) {
		let total = 0;

		total += getFire(heatPrev, x + 0, y - 1);

		total += getFire(heatPrev, x - 1, y + 0);
		total += getFire(heatPrev, x + 0, y + 0) * 2;
		total += getFire(heatPrev, x + 1, y + 0);

		total += getFire(heatPrev, x + 0, y + 1);

		total += getFire(heatPrev, x - 1, y + 2);
		total += getFire(heatPrev, x + 1, y + 2);

		total += getFire(heatPrev, x + 0, y + 3);

		total += getFire(heatPrev, x - 1, y + 4);
		total += getFire(heatPrev, x + 0, y + 4);
		total += getFire(heatPrev, x + 1, y + 4);

		return (((256 * total) / 12) | 0) / 256; // integer division
	}

	// Fire Kernal from: https://github.com/Leftium/fire/blob/41a6144234a7837767454e9669f4a3a6423431f2/src/main.cpp#L89-L100
	function fireKernelSkinny(x: number, y: number, heatPrev: Float32Array) {
		//return getFire(heatPrev, x, y);

		let sum =
			getFire(heatPrev, x + 0, y + 1) +
			getFire(heatPrev, x + 0, y + 2) +
			getFire(heatPrev, x + 0, y + 3) +
			getFire(heatPrev, x + 0, y + 4) +
			getFire(heatPrev, x - 1, y + 5) +
			getFire(heatPrev, x + 0, y + 5) +
			getFire(heatPrev, x + 1, y + 5) +
			getFire(heatPrev, x + 0, y + 6);
		//return sum / 8 - sum / 4096;
		return sum / 8.02;
	}

	function seedFire(heatPrev: Float32Array<ArrayBuffer>) {
		// Add heat to bottom rows (fuel source)
		const heatRows = 6;
		const bottomStart = heatHeight + padTop - heatRows;
		const bottomEnd = heatHeight + padTop;

		for (let y = bottomStart; y <= bottomEnd; y++) {
			for (let x = padSides; x < heatWidth + padSides; x++) {
				const index = y * paddedWidth + x;
				heatPrev[index] = (Math.random() < 0.5 ? 505 : -145) / 256;
			}
		}
	}

	function seedFireClamped(heatPrev: Float32Array<ArrayBuffer>) {
		// Add heat to bottom rows (fuel source)
		const heatRows = 6;
		const bottomStart = heatHeight + padTop - heatRows;
		const bottomEnd = heatHeight + padTop;

		for (let y = bottomStart; y <= bottomEnd; y++) {
			for (let x = padSides; x < heatWidth + padSides; x++) {
				const index = y * paddedWidth + x;
				heatPrev[index] = Math.random() < 0.73 ? 1 : 0;
			}
		}
	}

	function seedFireRandom(heatPrev: Float32Array<ArrayBuffer>) {
		// Add heat to bottom rows (fuel source)
		const heatRows = 6;
		const bottomStart = heatHeight + padTop - heatRows;
		const bottomEnd = heatHeight + padTop;

		for (let y = bottomStart; y <= bottomEnd; y++) {
			for (let x = padSides; x < heatWidth + padSides; x++) {
				const index = y * paddedWidth + x;
				heatPrev[index] = (Math.random() * 2000 - 825) / 256;
			}
		}
	}

	// Advance one frame: compute nextFire from prevFire
	function stepFire() {
		//console.log('stepFire');

		[heatPrev, heatNext] = [heatNext, heatPrev];

		fireSeeds[fireSeedIndex](heatPrev);

		for (let y = heatHeight; y > 0; y--) {
			let maxHeat = 0;

			for (let x = padSides; x < heatWidth + padSides; x++) {
				const index = y * paddedWidth + x;
				const heatValue = fireKernels[fireKernelIndex](x, y, heatPrev);
				heatNext[index] = heatValue;

				maxHeat = Math.max(maxHeat, heatValue);
			}

			if (maxHeat < minimalHeatThreshold) {
				//console.log('break:', {y})
				break;
			}
		}
	}

	function renderFire(
		heatArray: Float32Array,
		imageData: ImageData,
		palette = paletteGray,
		colorOver = colorWhite,
		colorUnder = colorBlack
	) {
		const data32 = new Uint32Array(imageData.data.buffer);
		const paddedWidth = heatWidth + padSides * 2;

		let dst = 0; // index into imageData
		for (let y = padTop; y < heatHeight + padTop; y++) {
			const rowStart = y * paddedWidth + padSides;
			for (let x = 0; x < heatWidth; x++) {
				const heat = (heatArray[rowStart + x] * palette.length) | 0;
				data32[dst++] = heat > palette.length ? colorOver : heat < 0 ? colorUnder : palette[heat];
			}
		}

		return imageData;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === '.') {
			fireKernelIndex = (fireKernelIndex + 1) % fireKernels.length;
		}

		if (event.key === ',') {
			fireKernelIndex = (fireKernelIndex - 1 + fireKernels.length) % fireKernels.length;
		}

		if (event.key === ']') {
			fireSeedIndex = (fireSeedIndex + 1) % fireSeeds.length;
		}

		if (event.key === '[') {
			fireSeedIndex = (fireSeedIndex - 1 + fireSeeds.length) % fireSeeds.length;
		}
	}

	onMount(() => {
		const abortController = new AbortController();
		const { signal } = abortController;

		window.addEventListener('keydown', handleKeydown, { signal });

		return () => {
			// Clean up
			abortController.abort();
		};
	});
</script>

<main>
	<GraphicalEffect
		oninit={(fx: FxState) => {
			fx.standardSize = true;
			fx.standardWidth = 500;
			fx.standardHeight = 800;
			//fx.pixelAspectRatio = .5

			fx.crtScanlines = false;
			fx.scalingFactor = 1 / 2;

			//fx.paused = true;

			fx.palettes.push(makeFirePalette2048());
			fx.palettes.push(makeFirePalette());

			fx.palettes.push(makeFirePalette2048({ extended: true }));
			fx.palettes.push(makeFirePalette({ extended: true }));

			fx.palettes.push(makeFirePalette2048({ blue: true }));
			fx.palettes.push(makeFirePalette({ blue: true }));

			fx.palettes.push(makeFirePalette2048({ extended: true, blue: true }));
			fx.palettes.push(makeFirePalette({ extended: true, blue: true }));

			fx.low = 140;
			fx.high = 140;
		}}
		onresize={(fx, width, height) => {
			console.log('resizeHandler', { width, height });
			imageData = createOpaqueImageData(width, height);

			heatWidth = width;
			heatHeight = height;

			heatPrev = createFireBuffer(width, height);
			heatNext = createFireBuffer(width, height);

			switch (fx.paletteIndex) {
				case 1:
				case 2:
					minimalHeatThreshold = 140 / 256;
					break;
				case 3:
				case 4:
					minimalHeatThreshold = 120 / 256;
					break;
				default:
					minimalHeatThreshold = 0;
			}
			heatPrev.fill(minimalHeatThreshold); // Invisible background heat.
			heatNext.fill(minimalHeatThreshold); // Invisible background heat.
			//console.log('resize', { maxHeatThreshold });
		}}
		onupdate={() => {
			//console.log('onupdate')
			stepFire();
		}}
		onrender={(fx) => {
			//stepFire()

			const [colorOver, colorUnder] =
				fx.paletteIndex >= 1 && fx.paletteIndex <= 4
					? [colorWhite, colorBlack]
					: [colorPurple, colorGreen];

			return renderFire(
				heatNext,
				imageData,
				fx.palettes[fx.paletteIndex] as Uint32Array<ArrayBuffer>,
				colorOver,
				colorUnder
			);
		}}
		oninfo={(info) => {
			return `${info}
			Seed: ${fireSeedIndex} Kernel: ${fireKernelIndex}`;
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
