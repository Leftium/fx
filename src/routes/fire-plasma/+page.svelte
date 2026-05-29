<script lang="ts">
	import { textMask, type Mask } from '$lib/draw';
	import { createOpaqueImageData, type FxState } from '$lib/fx-harness.svelte';
	import GraphicalEffect from '$lib/GraphicalEffect.svelte';
	import { makeColor, makeFirePalette, paletteGray } from '$lib/palette';

	type FxFire = {
		fireSeedIndex: number;
		fireKernelIndex: number;
		text: string;
	};

	let imageData: ImageData;

	let heatPrev = new Float32Array(0);
	let heatNext = new Float32Array(0);

	let mask: Mask | null = null;

	const padTop = 1;
	const padBottom = 6;

	let heatWidth = 0;
	let heatHeight = 0;

	let paddedWidth = 0;
	let paddedHeight = 0;

	let minimalHeatThreshold = 0;

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	function withDescription<T extends Function>(
		fn: T,
		description: string
	): T & { description: string } {
		return Object.assign(fn, { description });
	}

	let fireKernels = [
		withDescription(fireKernelNull, 'Null'),
		withDescription(fireKernelDefault, 'Default'),
		withDescription(fireKernelWide, 'Wide'),
		withDescription(fireKernelSkinny, 'Skinny')
	];

	let fireSeeds = [
		withDescription(seedFireNull, 'Null'),
		withDescription(seedFireDefault, 'Default'),
		withDescription(seedFireClamped, 'Clamped'),
		withDescription(seedFireRandom, 'Random'),
		withDescription(seedFireSin, 'Sin'),
		withDescription(seedFireSinRandom, 'SinRandom')
	];

	const colorPurple = makeColor(255, 0, 255);
	const colorGreen = makeColor(0, 255, 0);
	const colorBlack = makeColor(0, 0, 0);
	const colorWhite = makeColor(255, 255, 255);

	// Utility: create fire buffer with padding
	function createFireBuffer(width: number, height: number) {
		paddedWidth = width;
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
	function fireKernelDefault(x: number, y: number, heatPrev: Float32Array) {
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

		return total / 12.065;
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

		return total / 12.1;
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
		return sum / 8.075;
	}

	function seedFireNull() {
		return;
	}

	function seedFireDefault(heatPrev: Float32Array<ArrayBuffer>) {
		// Add heat to bottom rows (fuel source)
		const heatRows = 6;
		const bottomStart = heatHeight + padTop - heatRows;
		const bottomEnd = heatHeight + padTop;

		for (let y = bottomStart; y <= bottomEnd; y++) {
			for (let x = 0; x < heatWidth; x++) {
				const index = y * paddedWidth + x;
				heatPrev[index] = Math.random() < 0.5 ? 5 : -4;
			}
		}
	}

	function seedFireSin(heatPrev: Float32Array<ArrayBuffer>, fx: FxState) {
		// Add heat to bottom rows (fuel source)

		if (!fx) return;

		const bottom = heatHeight + padTop - 40;
		for (let x = 0; x < heatWidth; x++) {
			const deltaBottom = (20 * Math.sin(((fx.frame / 7) * Math.PI) / 180)) | 0;
			const height = 20 * Math.sin(((fx.frame / 5) * Math.PI) / 180);
			const deltaY = (Math.sin(((x + (fx.frame / 23) * Math.PI) / 180) * 7) * height) | 0;
			const index = (bottom + deltaBottom + deltaY) * paddedWidth + x;
			heatPrev[index] += 0.35;
		}

		// /*
		for (let x = 0; x < heatWidth; x++) {
			const height = 20 * Math.sin((fx.frame * Math.PI) / 180);
			const deltaY = (Math.sin(((x - (fx.frame / 17) * Math.PI) / 180) * 5) * height) | 0;
			const index = (bottom + deltaY) * paddedWidth + x;
			heatPrev[index] += 0.2;
		}
		/**/
	}

	function seedFireSinRandom(heatPrev: Float32Array<ArrayBuffer>, fx: FxState) {
		// Add heat to bottom rows (fuel source)

		if (!fx) return;

		const bottom = heatHeight + padTop - 40;
		for (let x = 0; x < heatWidth; x++) {
			const deltaBottom = (20 * Math.sin(((fx.frame / 7) * Math.PI) / 180)) | 0;
			const height = 20 * Math.sin(((fx.frame / 5) * Math.PI) / 180);
			const deltaY = (Math.sin(((x + (fx.frame / 23) * Math.PI) / 180) * 7) * height) | 0;
			const index = (bottom + deltaBottom + deltaY) * paddedWidth + x;
			heatPrev[index] += Math.random() < 0.5 ? 1.7 : -1.3;
		}

		// /*
		for (let x = 0; x < heatWidth; x++) {
			const height = 20 * Math.sin((fx.frame * Math.PI) / 180);
			const deltaY = (Math.sin(((x - (fx.frame / 17) * Math.PI) / 180) * 5) * height) | 0;
			const index = (bottom + deltaY) * paddedWidth + x;
			heatPrev[index] += Math.random() < 0.5 ? 1.7 : -1.3;
		}
		/**/
	}

	function seedFireClamped(heatPrev: Float32Array<ArrayBuffer>) {
		// Add heat to bottom rows (fuel source)
		const heatRows = 6;
		const bottomStart = heatHeight + padTop - heatRows;
		const bottomEnd = heatHeight + padTop;

		for (let y = bottomStart; y <= bottomEnd; y++) {
			for (let x = 0; x < heatWidth; x++) {
				const index = y * paddedWidth + x;
				heatPrev[index] = Math.random() < 0.5 ? 1 : 0;
			}
		}
	}

	function seedFireRandom(heatPrev: Float32Array<ArrayBuffer>) {
		// Add heat to bottom rows (fuel source)
		const heatRows = 6;
		const bottomStart = heatHeight + padTop - heatRows;
		const bottomEnd = heatHeight + padTop;

		for (let y = bottomStart; y <= bottomEnd; y++) {
			for (let x = 0; x < heatWidth; x++) {
				const index = y * paddedWidth + x;
				heatPrev[index] = Math.random();
			}
		}
	}

	// Advance one frame: compute nextFire from prevFire
	function stepFire(fx: FxState) {
		//console.log('stepFire');

		[heatPrev, heatNext] = [heatNext, heatPrev];

		fireSeeds[(fx as FxState<FxFire>).fireSeedIndex](heatPrev, fx);

		if (mask) {
			const deltaY = Math.cos((((fx.frame / 17) * Math.PI) / 180) * 13) * 30;
			const deltaX = Math.sin((((fx.frame / 23) * Math.PI) / 180) * 11) * 70;
			const y =
				(fx.active && fx.mouseY
					? fx.mouseY - mask.height * 0.75
					: heatHeight + padTop - 150 + deltaY) | 0;
			const x =
				(fx.active && fx.mouseX
					? fx.mouseX - mask.width / 2
					: fx.width / 2 - mask.width / 2 + deltaX) | 0;

			for (const { u, v } of mask.data) {
				heatPrev[(y + v) * paddedWidth + (x + u)] += 0.03;
			}
		}

		for (let y = heatHeight; y > 0; y--) {
			let maxHeat = 0;

			for (let x = 0; x < heatWidth; x++) {
				const index = y * paddedWidth + x;
				const heatValue = fireKernels[(fx as FxState<FxFire>).fireKernelIndex](x, y, heatPrev);
				heatNext[index] = heatValue;

				maxHeat = Math.max(maxHeat, heatValue);
			}

			if (y < fx.height - 100 && maxHeat < minimalHeatThreshold) {
				//console.log('break:', { y });
				// Fill the rest of heatNext efficiently
				heatNext.fill(minimalHeatThreshold, 0, (y - 1) * paddedWidth);
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
		const paddedWidth = heatWidth;

		let dst = 0; // index into imageData
		let y = padTop;
		while (y < heatHeight + padTop - 20) {
			const rowStart = y * paddedWidth;
			for (let x = 0; x < heatWidth; x++) {
				const heat = (heatArray[rowStart + x] * (palette.length - 1)) | 0;
				data32[dst++] = heat >= palette.length ? colorOver : heat < 0 ? colorUnder : palette[heat];
			}
			y++;
		}

		let lastRow: number[] = [];
		const rowStart = paddedWidth * y;
		for (let x = 0; x < heatWidth; x++) {
			lastRow[x] = heatArray[rowStart + x];
		}

		while (y < heatHeight + padTop) {
			lastRow = lastRow.map((value, index) => {
				return (
					(value +
						lastRow[(index + 1) % heatWidth] +
						lastRow[(index - 1 + heatWidth) % heatWidth]) /
					3.2
				);
			});
			for (let x = 0; x < heatWidth; x++) {
				const heat = (lastRow[x] * (palette.length - 1)) | 0;
				data32[dst++] = heat >= palette.length ? colorOver : heat < 0 ? colorUnder : palette[heat];
			}
			y++;
		}
		return imageData;
	}
</script>

<main>
	<GraphicalEffect
		oninit={(fxBase) => {
			const fx = fxBase as FxState<FxFire>;

			fx.standardSize = true;
			//fx.standardWidth = 500;
			fx.standardHeight = 800;
			//fx.pixelAspectRatio = .5

			fx.crtScanlines = false;
			fx.scalingFactor = 1 / 2;

			//fx.paused = true;

			fx.palettes.push(makeFirePalette());
			fx.palettes.push(makeFirePalette({ extended: true }));
			fx.palettes.push(makeFirePalette({ blue: true }));
			fx.palettes.push(makeFirePalette({ extended: true, blue: true }));

			fx.low = 140;
			fx.high = 140;

			fx.fireSeedIndex = 1;
			fx.fireKernelIndex = 1;

			fx.text = 'Leftium';
		}}
		onresize={(fx, width, height, isSameSize) => {
			console.log('resizeHandler', { width, height });
			switch (fx.paletteIndex) {
				case 1:
					minimalHeatThreshold = 0.3;
					break;
				case 2:
					minimalHeatThreshold = 0.2;
					break;
				default:
					minimalHeatThreshold = 0;
			}

			mask = textMask((fx as FxState<FxFire>).text);

			if (!isSameSize) {
				imageData = createOpaqueImageData(width, height);

				heatWidth = width;
				heatHeight = height;

				heatPrev = createFireBuffer(width, height);
				heatNext = createFireBuffer(width, height);

				heatPrev.fill(minimalHeatThreshold); // Invisible background heat.
				heatNext.fill(minimalHeatThreshold); // Invisible background heat.
				//console.log('resize', { maxHeatThreshold });
			}
		}}
		onupdate={(fx) => {
			//console.log('onupdate')
			stepFire(fx);
		}}
		onrender={(fx) => {
			//stepFire()

			const [colorOver, colorUnder] =
				fx.paletteIndex >= 1 && fx.paletteIndex <= 4
					? [colorWhite, colorBlack]
					: [colorPurple, colorGreen];

			return renderFire(heatNext, imageData, fx.palettes[fx.paletteIndex], colorOver, colorUnder);
		}}
		oninfo={(fxBase, info) => {
			const fx = fxBase as FxState<FxFire>;
			const x = fx.mouseX | 0;
			const y = fx.mouseY | 0;
			const value = heatNext[y * heatWidth + x];

			const rowStart = y * paddedWidth;
			const paletteLength = fx.palettes[fx.paletteIndex].length;
			const heat = (heatNext[rowStart + x] * (paletteLength - 1)) | 0;

			return `${info}
			Seed: ${fx.fireSeedIndex} ${fireSeeds[fx.fireSeedIndex].description}
			Kernel: ${fx.fireKernelIndex} ${fireKernels[fx.fireKernelIndex].description}
			[${x}, ${y}] heat: ${heat} value: ${value.toFixed(4)}`;
		}}
		onkeydown={(fxBase, event) => {
			const fx = fxBase as FxState<FxFire>;
			if (event.key === '.') {
				fx.fireKernelIndex = (fx.fireKernelIndex + 1) % fireKernels.length;
			}

			if (event.key === ',') {
				fx.fireKernelIndex = (fx.fireKernelIndex - 1 + fireKernels.length) % fireKernels.length;
			}

			if (event.key === ']') {
				fx.fireSeedIndex = (fx.fireSeedIndex + 1) % fireSeeds.length;
			}

			if (event.key === '[') {
				fx.fireSeedIndex = (fx.fireSeedIndex - 1 + fireSeeds.length) % fireSeeds.length;
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
