<script lang="ts">
	import { createOpaqueImageData, type FxState } from '$lib/fx-harness.svelte';
	import { renderNoisePalette } from '$lib/generateNoise';
	import GraphicalEffect from '$lib/GraphicalEffect.svelte';
	import { makeColor, type Palette } from '$lib/palette';

	let imageData: ImageData;
	let grid = new Uint8Array(0);

	const factor = 1.5;

	const gradients = {
		rgb: [
			{ offset: '0%', color: 'rgb(0,0,0)' },
			{ offset: '25%', color: 'rgb(128,64,0)' },
			{ offset: '50%', color: 'rgb(255,128,0)' },
			{ offset: '75%', color: 'rgb(255,255,0)' },
			{ offset: '100%', color: 'rgb(255,255,255)' }
		],
		rgbSoft: [
			{ offset: '0%', color: 'rgb(0,0,0)' },
			{ offset: '25%', color: 'rgb(120,60,0)' },
			{ offset: '50%', color: 'rgb(240,120,50)' },
			{ offset: '75%', color: 'rgb(240,240,100)' },
			{ offset: '100%', color: 'rgb(255,255,255)' }
		],

		oklch: [
			{ offset: '0%', color: 'oklch(0% 0 0)' },
			{ offset: '25%', color: 'oklch(0.4249 0.1042 55.82)' }, // dark orange/brown
			{ offset: '50%', color: 'oklch(0.701 0.1681 47.3)' }, // orange
			{ offset: '75%', color: 'oklch(0.9291 0.1601 109.15)' }, // yellow
			{ offset: '100%', color: 'oklch(1 0 0)' } // white
		],
		boosted: [
			{ offset: '0%', color: 'oklch(0% 0 0)' },
			{ offset: '25%', color: `oklch(0.4249 calc(${factor} * 0.1042) 55.82)` }, // chroma boosted
			{ offset: '50%', color: `oklch(0.701  calc(${factor} * 0.1681) 47.3` }, // more vivid orange
			{ offset: '75%', color: `oklch(0.9291 calc(${factor} * 0.1601) 109.15)` }, // brighter yellow
			{ offset: '100%', color: 'oklch(1 0 0)' }
		]
	};

	const order = ['rgb', 'rgbSoft', 'oklch', 'boosted'];

	function generateGradient(data: Uint8Array) {
		const width = imageData.width;
		const height = imageData.height;

		const size = 255;

		for (let j = 0; j < height; j++) {
			for (let i = 0; i < width; i++) {
				const value = size - Math.abs(i - j - size);
				grid[i + j * width] = value;
				grid[i + j * width] = j - i;
				grid[i + j * width] = i;
			}
		}
		return data;
	}

	/*
	         255: white  [255, 255, 255]
	 512 +32 223: white  [255, 255, 255]
	 512 +32 191: yellow [255, 255,   0]
	 256 +16 175: orange [255, 128,   0]
	 256 +16 159: black  [0,     0,   0]
	1536  96
	*/

	import { onMount } from 'svelte';

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function makeFirePalette256() {
		let r = 0,
			g = 0,
			b = 0;

		let palette = new Uint32Array(256);
		palette.fill(makeColor(r, g, b));

		let i = 255;
		r = g = b = 255;

		// White → Yellow (reduce blue)
		b += 4;
		while (b > 0) {
			b -= 4; // smaller decrement so it spans ~255 steps
			if (b < 4) b = 0;
			palette[i] = makeColor(r, g, b);
			console.log({ i, r, g, b });
			i--;
		}

		// Yellow → Orange (reduce green)
		g++;
		while (g > 128) {
			g -= 2; // smaller decrement
			if (g < 128) g = 128;
			palette[i] = makeColor(r, g, b);
			console.log({ i, r, g, b });
			i--;
		}

		// Orange → Red (reduce both r and g)
		r++;
		while (g > 0) {
			r -= 2; // gentler decrement
			g -= 1;
			if (r < 0) r = 0;
			if (g < 0) g = 0;
			palette[i] = makeColor(r, g, b);
			console.log({ i, r, g, b });
			i--;
		}

		return palette;
	}

	function makeFirePalette(extended = false) {
		let r = 0,
			g = 0,
			b = 0;

		let palette = Object.assign(new Uint32Array(256), { description: 'fire palette' });
		palette.fill(makeColor(r, g, b));

		let i = 128;
		r = b = g = 255;

		/*
		while (i > 223) {
			palette[i] = makeColor(r, g, b);
			///console.log('A', { i, r, g, b });
			i--;
		}
		*/

		b++;
		while (b > 0) {
			b -= 8;
			palette[i] = makeColor(r, g, b);
			///console.log('A', { i, r, g, b });
			i--;
		}

		g++;
		while (g > 128) {
			g -= 4;
			if (!extended) {
				g -= 4;
			}

			palette[i] = makeColor(r, g, b);
			///console.log('B', { i, r, g, b });
			i--;
		}

		r++;
		while (g > 0) {
			r -= 4;
			g -= 2;

			if (!extended) {
				r -= 8 + 4;
				g -= 4 + 2;
			}

			palette[i] = makeColor(r, g, b);
			///console.log('C', { i, r, g, b });
			i--;
		}
		return palette;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function makeFirePalette256Soft() {
		let r = 0,
			g = 0,
			b = 0;
		const palette = new Uint32Array(256);
		let i = 0;

		// Stage 1: Black → Dark Orange (0% → 25%)
		// r: 0 → 120, g: 0 → 60, b stays 0
		while (r < 120 || g < 60) {
			if (r < 120) r += 5;
			if (g < 60) g += 3;
			if (r > 120) r = 120;
			if (g > 60) g = 60;
			palette[i++] = makeColor(r, g, b);
		}

		// Stage 2: Dark Orange → Orange (25% → 50%)
		// r: 120 → 240, g: 60 → 120, b: 0 → 50
		while (r < 240 || g < 120 || b < 50) {
			if (r < 240) r += 4;
			if (g < 120) g += 2;
			if (b < 50) b += 2;
			if (r > 240) r = 240;
			if (g > 120) g = 120;
			if (b > 50) b = 50;
			palette[i++] = makeColor(r, g, b);
		}

		// Stage 3: Orange → Soft Yellow (50% → 75%)
		// r: 240 → 240, g: 120 → 240, b: 50 → 100
		while (g < 240 || b < 100) {
			if (g < 240) g += 2;
			if (b < 100) b += 2;
			if (g > 240) g = 240;
			if (b > 100) b = 100;
			palette[i++] = makeColor(r, g, b);
		}

		// Stage 4: Soft Yellow → White (75% → 100%)
		// r: 240 → 255, g: 240 → 255, b: 100 → 255
		while (r < 255 || g < 255 || b < 255) {
			if (r < 255) r += 1;
			if (g < 255) g += 1;
			if (b < 255) b += 3;
			if (r > 255) r = 255;
			if (g > 255) g = 255;
			if (b > 255) b = 255;
			palette[i++] = makeColor(r, g, b);
		}

		return palette;
	}

	let paletteFire = $state<Palette>(makeFirePalette(false));

	function paletteStops(palette: Uint32Array, positions = [0, 64, 128, 192, 255]) {
		return positions.map((pos) => {
			const color = palette[pos];
			const r = color & 0xff;
			const g = (color >> 8) & 0xff;
			const b = (color >> 16) & 0xff;
			const offset = Math.round((pos / 255) * 100) + '%';
			return { pos, offset, color: `rgb(${r},${g},${b})` };
		});
	}

	const rgbStops = paletteStops(paletteFire);
	console.log(rgbStops);

	let palette = $state(paletteFire);

	// Array of refs to SVG elements
	let svgRefs: SVGSVGElement[] = [];

	let firePalettes: Palette[] = [];

	onMount(async () => {
		for (const [i, svgEl] of svgRefs.entries()) {
			if (!svgEl) continue;

			// Ensure namespace so the decoder accepts it
			svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
			const svgString = svgEl.outerHTML;

			// Create an <img> with base64-encoded SVG
			const img = new Image();
			img.src = 'data:image/svg+xml;base64,' + btoa(svgString);

			await new Promise((res) => (img.onload = res));

			// Draw into canvas
			const canvas = document.createElement('canvas');
			canvas.width = 512;
			canvas.height = 1;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.drawImage(img, 0, 0);

			// Extract pixel data
			const data = ctx.getImageData(0, 0, 512, 1).data;
			const arr = new Uint32Array(256);
			for (let j = 0; j < 256; j++) {
				const r = data[2 * j * 4 + 0];
				const g = data[2 * j * 4 + 1];
				const b = data[2 * j * 4 + 2];
				const a = 255;
				arr[j] = (a << 24) | (b << 16) | (g << 8) | r; // ABGR packing

				if (i === 1) {
					//console.log({ j, r, g, b });
				}
			}
			console.log(`Palette ${i} ready:`, arr);
			firePalettes.push(Object.assign(arr, { description: 'Palette extracted from image' }));
		}
	});
</script>

<!-- Define a snippet for rendering a palette -->
{#snippet Palette(type: keyof typeof gradients, ref: SVGSVGElement[], index: number)}
	<div style="display: flex; margin-top:1rem">
		<svg bind:this={ref[index]} xmlns="http://www.w3.org/2000/svg" width="256" height="120">
			<defs>
				<linearGradient id={type} x1="0%" y1="0%" x2="100%" y2="0%">
					{#each gradients[type] as stop, index (index)}
						<stop offset={stop.offset} stop-color={stop.color} />
					{/each}
				</linearGradient>
			</defs>
			<rect x="0" y="0" width="256" height="120" fill={`url(#${type})`} />
		</svg>

		<div>
			<ul style:margin="0">
				<li><b>{type} stops</b></li>
				{#each gradients[type] as stop, index (index)}
					<li>{stop.offset}: {stop.color}</li>
				{/each}
			</ul>
		</div>
	</div>
{/snippet}

<main>
	<GraphicalEffect
		style="justify-content: start;"
		oninit={(fx: FxState) => {
			fx.standardSize = true;
			fx.standardWidth = 512;
			fx.standardHeight = 120;

			fx.crtScanlines = false;
			fx.infoHidden = true;
			fx.scalingFactor = 1 / 2;

			fx.paused = true;
		}}
		onresize={(_fx, width, height) => {
			console.log('resizeHandler', { width, height });
			imageData = createOpaqueImageData(width, height);
			grid = new Uint8Array(width * height);

			generateGradient(grid);
			palette = firePalettes[0] ? firePalettes[0] : paletteFire;
		}}
		onupdate={() => {
			//rotateLeft(palette);
		}}
		onrender={() => renderNoisePalette(grid, imageData, palette)}
	></GraphicalEffect>

	<!-- Use the snippet for each palette -->
	{#each order as type, i (i)}
		{@render Palette(type as keyof typeof gradients, svgRefs, i)}
	{/each}
</main>
