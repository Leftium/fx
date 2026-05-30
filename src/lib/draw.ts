export type Mask = {
	width: number;
	height: number;
	minU: number;
	minV: number;
	maxU: number;
	maxV: number;
	data: { u: number; v: number }[];
};

export function textMask(text: string, font = '70px sans-serif', fill = false): Mask | null {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx || !text) return null;
	ctx.font = font;

	const metrics = ctx.measureText(text);
	const width = Math.ceil(metrics.width);

	// Try to use precise ascent/descent if available
	const ascent = metrics.fontBoundingBoxAscent || 0;
	const descent = metrics.fontBoundingBoxDescent || 0;

	const height =
		ascent && descent
			? Math.ceil(ascent + descent)
			: // Fallback: rough line height multiplier
				Math.ceil(parseInt(font, 10) * 1.5);

	canvas.width = width;
	canvas.height = height;

	// Redraw text after resizing
	ctx.font = font;
	ctx.textBaseline = 'top';
	if (fill) {
		ctx.fillText(text, 0, 0);
	} else {
		ctx.strokeText(text, 0, 0);
	}

	const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

	const data = [];

	let minU = Number.MAX_SAFE_INTEGER;
	let minV = Number.MAX_SAFE_INTEGER;
	let maxU = 0;
	let maxV = 0;

	for (let v = 0; v < imgData.height; v++) {
		for (let u = 0; u < imgData.width; u++) {
			const alpha = imgData.data[(v * imgData.width + u) * 4 + 3];
			if (alpha > 0) {
				minU = Math.min(u, minU);
				minV = Math.min(v, minV);
				maxU = Math.max(u, maxU);
				maxV = Math.max(v, maxV);
				data.push({ u, v });
			}
		}
	}
	return {
		width,
		height,
		minU,
		minV,
		maxU,
		maxV,
		data
	};
}
