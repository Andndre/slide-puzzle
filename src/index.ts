let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let scaledSize: number;
let img: CanvasImageSource;
let puzzleSize = 4;
let cells: number[][] = [];
let cellWidth: number;
let animating = false;
let lastDir = -1;
let lastLastDir = -1;
let track: number[][] = [];
let dirs = [
	[-1, 0],
	[1, 0],
	[0, -1],
	[0, 1],
];

(function main() {
	loadImg();
	window.onresize = render;
	window.onload = function () {
		canvas = document.getElementById("canvas") as HTMLCanvasElement;
		img = document.getElementById("img") as CanvasImageSource;
		ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		cellWidth = (canvas.width as number) / puzzleSize;
		ctx.fillStyle = "#6e6e6e";
		for (let i = 0; i < puzzleSize; i++) {
			cells.push([]);
			for (let j = 0; j < puzzleSize; j++) {
				cells[i].push(j + i * puzzleSize);
			}
		}
		cells[puzzleSize - 1][puzzleSize - 1] = -1;
		canvas.onclick = function (ev: MouseEvent) {
			if (animating) return;
			let [x, y] = getClickedCoords(ev);
			let empty = getEmpty();
			let diff = [Math.abs(x - empty[0]), Math.abs(y - empty[1])];
			if ((diff[0] == 0 && diff[1] == 1) || (diff[0] == 1 && diff[1] == 0)) {
				swapAnimate(x, y, empty[0], empty[1]);
			}
		};
		render();
		["", "webkit", "moz", "ms"].forEach((prefix) =>
			document.addEventListener(prefix + "fullscreenchange", render, false)
		);
	};
})();

function choose<T>(arr: T[]) {
	return arr[randomInt(0, arr.length - 1)];
}

function loadImg() {
	fetch(
		"https://source.unsplash.com/random/300x300/?" +
			choose([
				"animal",
				"object",
				"cartoon",
				"cartoon%20robot",
				"fruit",
				"bright",
			])
	).then((res) => {
		// canvas img source
		let imgSource = document.getElementById("img") as HTMLImageElement;
		imgSource.src = res.url;
		imgSource.onload = () => {
			randomMove(Math.pow(puzzleSize, 4));
			render();
		};
		// correct order (preview) img
		(document.querySelector(".img") as HTMLImageElement).src = res.url;
	});
}

function render() {
	let sz = Math.min(window.innerWidth, window.innerHeight) / 2;
	canvas.width = sz;
	canvas.height = sz;
	cellWidth = canvas.width / puzzleSize;
	ctx.font = "bold " + cellWidth / 4 + "px Arial";
	for (let i = 0; i < puzzleSize; i++)
		for (let j = 0; j < puzzleSize; j++) drawPart(i, j);
}

function drawPart(i: number, j: number) {
	drawPartAt(i, j, j * cellWidth, i * cellWidth);
}

function drawPartAt(i: number, j: number, x: number, y: number) {
	let val = cells[i][j];
	if (val == -1) {
		return;
	}
	let [sx, sy] = getCoords(val);
	let imgSize = Math.min(img.height as number, img.width as number);
	let singleSize = imgSize / puzzleSize;
	sx *= singleSize;
	sy *= singleSize;
	ctx.drawImage(
		img,
		sx,
		sy,
		singleSize,
		singleSize,
		x,
		y,
		cellWidth,
		cellWidth
	);

	ctx.fillStyle = "#FFFFFF";
	ctx.fillRect(
		x + cellWidth / 2 - cellWidth / 8,
		y + cellWidth / 2 - cellWidth / 8,
		(cellWidth / 4) * (val + 1).toString().length,
		cellWidth / 4
	);
	ctx.fillStyle = "#000000";
	ctx.fillText(
		(val + 1).toString(),
		x + cellWidth / 2 - cellWidth / 16,
		y + cellWidth / 2 + cellWidth / 16
	);
}

async function randomMove(recursive: number) {
	if (recursive <= 0) {
		render();
		return;
	}
	let empty = getEmpty();
	let dir: number;
	let add: number[];
	do {
		dir = randomInt(0, dirs.length - 1);
		add = [empty[0] + dirs[dir][0], empty[1] + dirs[dir][1]];
	} while (
		dir == lastLastDir ||
		add[0] < 0 ||
		add[0] >= puzzleSize ||
		add[1] < 0 ||
		add[1] >= puzzleSize
	);
	lastLastDir = lastDir;
	lastDir = dir;
	await swapAnimate(add[0], add[1], empty[0], empty[1]);
	randomMove(--recursive);
}

async function backTrack() {
	if (track.length == 0) return;
	let [x, y] = track.pop();
	let [emptyJ, emptyI] = getEmpty();
	await swapAnimate(x, y, emptyJ, emptyI, true);
	backTrack();
}

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function isInOrder(): boolean {
	let last = puzzleSize - 1;
	if (cells[last][last] != -1) return false;
	let prev = -1;
	for (let i = 0; i <= last; i++) {
		for (let j = 0; j <= last; j++) {
			if (i == last && j == last) break;
			if (cells[i][j] - prev != 1) return false;
			prev = cells[i][j];
		}
	}
	return true;
}

function getMousePos(ev: MouseEvent): number[] {
	var rect = canvas.getBoundingClientRect();
	return [ev.clientX - rect.left, ev.clientY - rect.top];
}

function getClickedCoords(ev: MouseEvent): number[] {
	let [x, y] = getMousePos(ev);
	return [Math.floor(x / cellWidth), Math.floor(y / cellWidth)];
}

function swap(
	x: number,
	y: number,
	emptyX: number,
	emptyY: number,
	noRender = false,
	backTrack = false
) {
	if (!backTrack) track.push([emptyX, emptyY]);
	[cells[y][x], cells[emptyY][emptyX]] = [cells[emptyY][emptyX], cells[y][x]];
	if (noRender) return;
	drawPart(y, x);
	drawPart(emptyY, emptyX);
}

async function swapAnimate(
	j2: number,
	i2: number,
	emptyJ: number,
	emptyI: number,
	backTrack = false
) {
	let dir = [emptyI - i2, emptyJ - j2];
	let animateI = i2 * cellWidth;
	let animateJ = j2 * cellWidth;
	let speed = 20;
	dir[0] *= speed;
	dir[1] *= speed;
	let target = [emptyI * cellWidth, emptyJ * cellWidth];
	animating = true;
	while (
		!(
			Math.abs(animateI - target[0]) < speed &&
			Math.abs(animateJ - target[1]) < speed
		)
	) {
		drawBox(i2, j2);
		drawBox(emptyI, emptyJ);
		animateI += dir[0];
		animateJ += dir[1];
		drawPartAt(i2, j2, animateJ, animateI);
		await sleep(2);
	}
	animating = false;
	drawBox(i2, j2);
	swap(j2, i2, emptyJ, emptyI, false, backTrack);
}

function isClose(a: number, b: number) {
	return Math.abs(a - b) < 30;
}

function sleep(millisecondsDuration: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, millisecondsDuration);
	});
}

function drawBox(i: number, j: number) {
	ctx.fillRect(j * cellWidth, i * cellWidth, cellWidth, cellWidth);
}

function getEmpty(): [number, number] {
	for (let y = 0; y < puzzleSize; y++) {
		for (let x = 0; x < puzzleSize; x++) {
			if (cells[y][x] == -1) return [x, y];
		}
	}

	return [-1, -1];
}

function getCoords(index: number): [number, number] {
	return [index % puzzleSize, Math.floor(index / puzzleSize)];
}
