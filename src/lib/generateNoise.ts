// Precompute grayscale palette

import { paletteGray, type Palette } from '$lib/palette';

const MAX_BYTES = 65536;

export function generateNoise(data: Uint32Array) {
	const pixels = data.length;
	// 3 random bytes per pixel (R,G,B)
	const noiseRGB = new Uint8Array(pixels * 3);

	// Bulk fill in chunks of MAX_BYTES bytes
	for (let i = 0; i < noiseRGB.length; i += MAX_BYTES) {
		crypto.getRandomValues(noiseRGB.subarray(i, i + MAX_BYTES));
	}

	// Pack RGB into Uint32 words, alpha not set yet
	let j = 0;
	for (let i = 0; i < pixels; i++) {
		const r = noiseRGB[j++];
		const g = noiseRGB[j++];
		const b = noiseRGB[j++];
		data[i] = r | (g << 8) | (b << 16);
	}

	return data;
}

export function generateNoiseUint8(data: Uint8Array) {
	// Bulk fill in chunks of MAX_BYTES bytes
	for (let i = 0; i < data.length; i += MAX_BYTES) {
		crypto.getRandomValues(data.subarray(i, i + MAX_BYTES) as Uint8Array<ArrayBuffer>);
	}
	return data;
}

export function renderNoiseColor(noise: Uint32Array, imageData: ImageData) {
	// reinterpret the buffer as 32‑bit words
	const data32 = new Uint32Array(imageData.data.buffer);
	for (let i = 0; i < noise.length; i++) {
		data32[i] = noise[i] | 0xff000000;
	}
	return imageData;
}

export function renderNoisePalette(
	noise: Uint8Array | Uint32Array,
	imageData: ImageData,
	palette: Palette = paletteGray
) {
	// reinterpret the buffer as 32‑bit words
	const data32 = new Uint32Array(imageData.data.buffer);

	for (let i = 0; i < noise.length; i++) {
		const intensity = noise[i] & 0xff; // Extract one byte of noise
		data32[i] = palette[intensity];
	}
	return imageData;
}

export function renderNoiseGray(noise: Uint32Array, imageData: ImageData) {
	// reinterpret the buffer as 32‑bit words
	const data32 = new Uint32Array(imageData.data.buffer);

	for (let i = 0; i < noise.length; i++) {
		// Convert simulation value to 0–255 intensity
		const intensity = noise[i] & 0xff;

		// Pack into ABGR (alpha=0xff, R=G=B=intensity)
		data32[i] = (0xff << 24) | (intensity << 16) | (intensity << 8) | intensity;
	}

	return imageData;
}
