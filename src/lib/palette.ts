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

	let r = 0,
		g = 0,
		b = 0;

	let palette = Object.assign(new Uint32Array(256), {
		description: `Fire256 ${options.extended ? 'extended' : ''} ${options.blue ? 'blue' : ''}`
	});
	palette.fill(makeColor(r, g, b));

	let i = 255;
	r = b = g = 255;

	while (i > 223) {
		palette[i] = makeColor(r, g, b);
		///console.log('A', { i, r, g, b });
		i--;
	}

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
		if (!options.extended) {
			g -= 4;
		}

		palette[i] = makeColor(r, g, b);
		///console.log('B', { i, r, g, b });
		i--;
	}

	r++;
	while (g > 0) {
		r -= 8;
		g -= 4;

		if (!options.extended) {
			r -= 8;
			g -= 4;
		}

		palette[i] = makeColor(r, g, b);
		///console.log('C', { i, r, g, b });
		i--;
	}

	if (options.blue) {
		// Use blue channel to track fire intensity value.
		palette = Object.assign(
			palette.map((value, index) => value | (index << 16)),
			{ description: palette.description }
		);
	}

	return palette;
}

export function makeFirePalette2048(options: { blue?: boolean; extended?: boolean } = {}) {
	options = {
		blue: false,
		extended: false,
		...options
	};

	let r = 0,
		g = 0,
		b = 0;

	let palette = Object.assign(new Uint32Array(2048), {
		description: `Fire2048 ${options.extended ? 'extended' : ''} ${options.blue ? 'blue' : ''}`
	});

	palette.fill(makeColor(r, g, b));

	let i = 2048;
	r = b = g = 255;

	while (i > 1792) {
		palette[i] = makeColor(r, g, b);
		///console.log('A', { i, r, g, b });
		i--;
	}

	b++;
	while (b > 0) {
		b -= 1;
		palette[i] = makeColor(r, g, b);
		///console.log('A', { i, r, g, b });
		i--;
	}

	g++;
	while (g > 128) {
		g -= 0.5;
		if (!options.extended) {
			g -= 0.5;
		}

		palette[i] = makeColor(r, g, b);
		///console.log('B', { i, r, g, b });
		i--;
	}

	r++;
	while (g > 0) {
		r -= 1;
		g -= 0.5;

		if (!options.extended) {
			r -= 1;
			g -= 0.5;
		}

		palette[i] = makeColor(r, g, b);
		///console.log('C', { i, r, g, b });
		i--;
	}

	if (options.blue) {
		// Use blue channel to track fire intensity value.
		palette = Object.assign(
			palette.map((value, index) => value | (((index / 8) | 0) << 16)),
			{ description: palette.description }
		);
	}

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
