import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { makePaletteGraySlice, type Palette } from '$lib/palette';

type FxRecord = Record<string, boolean | number | string | Palette[]>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type FxState<Extra extends FxRecord = {}> = {
	paused: boolean;
	infoHidden: boolean;
	active: boolean;
	crtScanlines: boolean;

	standardSize: boolean;
	standardWidth: number;
	standardHeight: number;

	scalingFactor: number;
	pixelAspectRatio: number;

	palettes: Palette[];
	paletteIndex: number;

	low: number;
	high: number;

	fpsTarget: number;
	fpsMin: number;

	frame: number;

	width: number;
	height: number;

	mouseX: number;
	mouseY: number;
} & Extra;

type FxHarnessOptions = {
	initHandler?: (fx: FxState) => void;
	updateHandler?: (fx: FxState) => void;
	renderHandler: (fx: FxState) => ImageData;
	resizeHandler?: (fx: FxState, width: number, height: number, isSameSize?: boolean) => void;
	infoHandler?: (fx: FxState, infoString: string) => string;
	keydownHandler?: (fx: FxState, event: KeyboardEvent) => void;
	mousemoveHandler?: (fx: FxState, event: MouseEvent) => void;
};

export function createOpaqueImageData(width: number, height: number) {
	const imageData = new ImageData(width, height);
	const data = imageData.data;

	for (let i = 3; i < data.length; i += 4) {
		data[i] = 255; // A
	}
	return imageData;
}

export function makeFxHarness(searchParams: URLSearchParams) {
	// Frame counter based on: https://stackoverflow.com/a/5111475
	// The higher this value, the less the fps will reflect temporary variations
	// A value of 1 will only keep the last value
	const filterStrength = 10;

	class FrameRate {
		private averageFrameTime = $state(2222);
		private lastLoop = performance.now();
		private currLoop = 0;

		recordFrame() {
			this.currLoop = performance.now();
			const deltaFrameTime = this.currLoop - this.lastLoop;
			this.averageFrameTime += (deltaFrameTime - this.averageFrameTime) / filterStrength;
			this.lastLoop = this.currLoop;
		}

		get frameTime(): number {
			return this.averageFrameTime === 2222 ? 0 : this.averageFrameTime;
		}

		get fps(): number {
			return 1000 / this.averageFrameTime;
		}

		toString(): string {
			return `${this.fps.toFixed(0)}FPS ${this.frameTime.toFixed(1)}ms`;
		}
	}
	const frameRateUpdate = new FrameRate();
	const frameRateRender = new FrameRate();

	let dimensions = $state('WxH (WxH)');
	let infoString = $state('info');

	const fx = $state<FxState>({
		paused: false,
		infoHidden: false,
		active: false,
		crtScanlines: true,

		standardSize: false,
		standardWidth: 800,
		standardHeight: 500,

		scalingFactor: 1,
		pixelAspectRatio: 1,

		palettes: [makePaletteGraySlice()],
		paletteIndex: 1,

		low: 128,
		high: 128,

		fpsTarget: 1000, // 1000 for perf test; lower to achievable value like 60 for consistent output.
		fpsMin: 75, // Ideally the refresh rate of the monitor.

		frame: 0,

		width: 0,
		height: 0,

		mouseX: 0,
		mouseY: 0
	});

	const step = $derived(1000 / fx.fpsTarget);
	const maxFrameTime = $derived(1000 / fx.fpsMin / 1.1);

	function fxHarness({
		initHandler,
		updateHandler,
		renderHandler,
		resizeHandler,
		infoHandler,
		keydownHandler,
		mousemoveHandler
	}: FxHarnessOptions): Attachment {
		return (element) => {
			console.log('attaching');

			const canvas = document.createElement('canvas');
			const container = element.getElementsByTagName('wrap-effect')[0] as HTMLElement;
			container.appendChild(canvas);

			const context = canvas.getContext('2d');
			function internalRender(fx: FxState) {
				if (context) {
					context.putImageData(renderHandler(fx), 0, 0);
				}
			}

			function internalKeydown(fx: FxState, event: KeyboardEvent) {
				if (event.key === 'Enter') {
					// Check if we're in fullscreen mode
					if (document.fullscreenElement) {
						document.exitFullscreen();
						internalResize(fx);
					} else if (fx.active) {
						// Otherwise enter fullscreen mode
						container.requestFullscreen().catch((err) => {
							console.error(`Error enabling fullscreen: ${err.message}`);
						});
					}
				}

				if (!fx.active) return;

				if (event.key === 'i') {
					fx.infoHidden = !fx.infoHidden;
				}

				if (event.key === 's') {
					fx.standardSize = !fx.standardSize;
					internalResize(fx);
				}

				if (event.key === 'c') {
					fx.crtScanlines = !fx.crtScanlines;
				}

				if (event.key === ' ') {
					fx.paused = !fx.paused;
				}

				if (event.key === '=') {
					fx.paletteIndex = (fx.paletteIndex + 1) % fx.palettes.length;
				}

				if (event.key === '-') {
					fx.paletteIndex = (fx.paletteIndex - 1 + fx.palettes.length) % fx.palettes.length;
				}

				// Convert event.key to number if it's between '0' and '9'
				if (event.key >= '0' && event.key <= '9') {
					const number = Number(event.key);

					if (number === 0 && fx.paletteIndex === 0) {
						if (fx.low === 0 && fx.high === 255) {
							fx.low = 128;
							fx.high = 128;
						} else {
							fx.low = 0;
							fx.high = 255;
						}
					}

					fx.paletteIndex = Math.min(number, fx.palettes.length - 1);
				}

				if (event.key === 'ArrowUp') {
					const delta = event.shiftKey ? 10 : event.altKey ? 255 - fx.low : 1;

					fx.low = Math.min(255, fx.low + delta);
					fx.high = Math.min(255, fx.high + delta);
				}

				if (event.key === 'ArrowDown') {
					const delta = event.shiftKey ? -10 : event.altKey ? -fx.low : -1;

					fx.low = Math.max(0, fx.low + delta);
					fx.high = Math.max(0, fx.high + delta);
				}

				if (event.key === 'ArrowRight') {
					const delta = event.shiftKey ? 10 : event.altKey ? 255 - fx.high : 1;

					fx.high = Math.min(255, fx.high + delta);
					fx.low = Math.min(fx.low, fx.high);
				}

				if (event.key === 'ArrowLeft') {
					const delta = event.shiftKey ? -10 : event.altKey ? fx.low - fx.high : -1;

					fx.high = Math.max(0, fx.high + delta);
					fx.low = Math.min(fx.low, fx.high);
				}
				fx.palettes[0] = makePaletteGraySlice(fx.low, fx.high);
				if (resizeHandler) {
					resizeHandler(fx, canvas.width, canvas.height, true);
				}

				if (keydownHandler) {
					keydownHandler(fx, event);
				}
				internalRender(fx);
				renderInfo();
			}

			function internalMousemove(fx: FxState, event: MouseEvent) {
				fx.mouseX = (event.offsetX * fx.scalingFactor) / fx.pixelAspectRatio;
				fx.mouseY = event.offsetY * fx.scalingFactor;

				if (mousemoveHandler) {
					mousemoveHandler(fx, event);
				}
			}

			function internalClick(fx: FxState) {
				if (fx.active) {
					fx.paused = !fx.paused;
				}
			}

			// Resize canvas as needed.
			function internalResize(fx: FxState) {
				const canvasWidth = fx.standardSize
					? fx.standardWidth
					: document.fullscreenElement
						? window.innerWidth
						: element.clientWidth;
				const canvasHeight = fx.standardSize
					? fx.standardHeight
					: document.fullscreenElement
						? window.innerHeight
						: element.clientHeight;

				canvas.width = (fx.scalingFactor * canvasWidth) / fx.pixelAspectRatio;
				canvas.height = fx.scalingFactor * canvasHeight;
				canvas.style.width = `${canvasWidth}px`;
				canvas.style.height = `${canvasHeight}px`;

				container.style.width = `${canvasWidth}px`;
				container.style.height = `${canvasHeight}px`;

				dimensions = `${canvasWidth}x${canvasHeight} (${canvas.width}x${canvas.height})`;

				fx.width = canvas.width;
				fx.height = canvas.height;

				if (resizeHandler) {
					resizeHandler(fx, canvas.width, canvas.height);
				}
				internalRender(fx);
			}

			function internalUpdate(fx: FxState) {
				if (updateHandler) {
					updateHandler(fx);
				}
			}

			// Untrack to prevent this attachment from being run twice.
			untrack(() => {
				if (initHandler) {
					initHandler(fx);
				}

				fx.palettes[0] = makePaletteGraySlice(fx.low, fx.high);
				fx.paletteIndex = Math.min(fx.paletteIndex, fx.palettes.length - 1);

				// Apply URL params to fx state:
				for (const name of Object.keys(fx) as (keyof FxState)[]) {
					const paramValue = searchParams.get(name);
					if (paramValue !== null) {
						setParam(fx, name, paramValue);
					}
				}

				internalResize(fx);
			});

			// Utility function to set fx fields in type-safe way.
			function setParam<K extends keyof FxRecord>(fx: FxRecord, key: K, value: string) {
				const numValue = Number(value);
				const current = fx[key];

				if (typeof current === 'boolean') {
					fx[key] = value.toLowerCase() === 'true' || value === '1';
				} else if (typeof current === 'number') {
					if (Number.isFinite(numValue)) {
						fx[key] = numValue;
					}
				} else if (typeof current === 'string') {
					fx[key] = value;
				}
				// skip arrays like palettes
			}

			function renderInfo() {
				infoString = `${frameRateUpdate} (${frameRateRender})
					${dimensions}
					Palette: ${fx.paletteIndex} ${fx.palettes[fx.paletteIndex].description}`;

				if (infoHandler) {
					infoString = infoHandler(fx, infoString);
				}
			}
			setTimeout(renderInfo);

			function doUpdate() {
				if (!document.fullscreenElement || document.fullscreenElement == container) {
					if (!fx.paused) {
						internalUpdate(fx);
						fx.frame++;
					}
					frameRateUpdate.recordFrame();
				}
			}

			const intervalIds = [setInterval(renderInfo, 500)];

			let rafId: number | null = null;
			let lastTime = performance.now();
			let accumulator = 0;

			function loop(now: number) {
				accumulator += now - lastTime;
				lastTime = now;

				const frameStart = performance.now();

				while (accumulator >= step) {
					doUpdate();
					accumulator -= step;

					// Exit early if we've spent too long updating
					if (performance.now() - frameStart > maxFrameTime) {
						//console.warn('Skipping updates to maintain render FPS');
						accumulator = 0; // drop remaining accumulated time
						break;
					}
				}

				internalRender(fx);
				frameRateRender.recordFrame();
				rafId = requestAnimationFrame(loop);
			}
			rafId = requestAnimationFrame(loop);

			const abortController = new AbortController();
			const { signal } = abortController;

			window.addEventListener('keydown', (e) => internalKeydown(fx, e), { signal });
			window.addEventListener('resize', () => internalResize(fx), { signal });

			element.addEventListener('resize', () => internalResize(fx), { signal });
			element.addEventListener('click', () => internalClick(fx), { signal });

			container.addEventListener('mouseenter', () => (fx.active = true), { signal });
			container.addEventListener('mouseleave', () => (fx.active = false), { signal });

			container.addEventListener('mousemove', (e) => internalMousemove(fx, e), { signal });

			return () => {
				// Clean up
				abortController.abort();
				for (const intervalId of intervalIds) {
					clearInterval(intervalId);
				}
				if (rafId !== null) {
					cancelAnimationFrame(rafId);
					rafId = null;
				}
			};
		};
	}

	return {
		fx,
		fxHarness,
		getInfoString: () => infoString
	};
}
