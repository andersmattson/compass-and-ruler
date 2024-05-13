
let pixelWidth = 800;
let pixelHeight = 800;
let ratio = pixelWidth / pixelHeight;
let imgScale = 1;
let DEBUG = true;

const STATES = {
	SELECT: 0,
	DRAWLINE: 1,
	DRAWCIRCLE: 2,
	PAN: 3,
	DISPLAY: 4
};

const EPSILON = 0.001;
const MAXDIST = 1000000;
const EPSILONANGLE = 0.001;
const SELECTDISTANCE = 10;

const LINETYPES = {
	SEGMENT: 0,
	LINE: 1,
	// RAY: 2, // Seems a bit too much for now
};

const CountLineTypes = Object.keys(LINETYPES).length;

const STYLES = {
	BASE: {
		stroke: 'black',
		strokeWeight: 1
	},
	HELPER: {
		stroke: '#cccccc',
		strokeWeight: 1
	},
	SELECTED: {
		stroke: '#0000FF',
		strokeWeight: 2
	},
	SELECTEDHELPER: {
		stroke: '#AAAAFF',
		strokeWeight: 2
	},
	DRAWINGITEM: {
		stroke: 'green',
		strokeWeight: 2
	},
	DRAWINGITEMHELPER: {
		stroke: 'lightgreen',
		strokeWeight: 2
	},
	CLOSEST: {
		stroke: 'purple',
		strokeWeight: 2
	},
	POINT: {
		stroke: '#660000',
		strokeWeight: 5
	},
	CLOSESTPOINT: {
		stroke: 'green',
		strokeWeight: 10
	},
};
