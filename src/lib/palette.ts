export interface Palette extends Uint32Array {
	description: string;
}

export function makeColor(r: number, g: number, b: number, a = 255) {
	// ABGR packing
	return ((a | 0) << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
}

export function makePalette(calcColor: (i: number) => number, description = ''): Palette {
	return Object.assign(
		new Uint32Array(256).map((_value, i) => calcColor(i)),
		{ description }
	);
}

export function makePaletteGraySlice(
	low = 0,
	high = 255,
	description = `Grayscale slice[${low}:${high}]`
) {
	return makePalette((i) => {
		if (i < low) {
			return makeColor(i >> 1, i, 255);
		} else if (i <= high) {
			return makeColor(i, i, i);
		}
		return makeColor(255, i, i >> 1);
	}, description);
}

export const paletteGray = makePaletteGraySlice(0, 255, 'Grayscale');

export const paletteCyan = makePalette((i) => {
	const g = i,
		b = i,
		a = 255;
	return (a << 24) | (b << 16) | (g << 8);
}, 'Cyan');

export function makeFirePalette(options: { blue?: boolean; extended?: boolean } = {}) {
	options = {
		blue: false,
		extended: false,
		...options
	};

	const paletteLength = 256 + (options.extended ? 768 : 512);

	let palette = Object.assign(new Uint32Array(paletteLength), {
		description: `Fire${paletteLength} ${options.blue ? 'blue' : ''}`
	});

	palette.fill(makeColor(0, 0, 0));

	let i = paletteLength;
	let r = 255,
		g = 255,
		b = 255;

	b++;
	console.log('Y', { i, r, g, b });
	while (b > 0) {
		b -= 1;
		palette[i] = makeColor(r, g, b);
		i--;
	}
	console.log('Y', { i, r, g, b });

	g++;
	console.log('O', { i, r, g, b });
	while (g > 128) {
		g -= 0.5;
		if (!options.extended) {
			g -= 0.5;
		}

		palette[i] = makeColor(r, g, b);
		i--;
	}
	console.log('O', { i, r, g, b });

	r++;
	console.log('B', { i, r, g, b });
	while (g > 0) {
		r -= 1;
		g -= 0.5;

		if (!options.extended) {
			r -= 1;
			g -= 0.5;
		}

		palette[i] = makeColor(r, g, b);
		i--;
	}
	console.log('B', { i, r, g, b });

	if (options.blue) {
		// Use blue channel to track fire intensity value.
		palette = Object.assign(
			palette.map((value, index) => value | ((((index / paletteLength) * 256) | 0) << 16)),
			{ description: palette.description }
		);
	}
	///console.log({ i });
	///console.log(palette);

	return palette;
}

export function rotateRight(arr: Palette) {
	const last = arr[arr.length - 1];
	for (let i = arr.length - 1; i > 0; i--) {
		arr[i] = arr[i - 1];
	}
	arr[0] = last;
	return arr;
}

export function rotateLeft(arr: Palette) {
	const first = arr[0];
	for (let i = 0; i < arr.length - 1; i++) {
		arr[i] = arr[i + 1];
	}
	arr[arr.length - 1] = first;
	return arr;
}
