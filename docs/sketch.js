let currentState = {
  tool: STATES.SELECT,
  lineType: 0,
  createHelper: false,
  pan: { x: 0, y: 0 },
  panStart: { x: 0, y: 0 },
  isPanning: false,
  displayHelpers: true,
  isDrawing: () => currentState.tool == STATES.DRAWLINE || currentState.tool == STATES.DRAWCIRCLE,
  store: () => storeItem('currentState', {
    _tool: currentState.tool,
    lineType: currentState.lineType,
    createHelper: currentState.createHelper,
    pan: currentState.pan,
    displayHelpers: currentState.displayHelpers
  }),
  load: () => {
    let storedState = getItem('currentState');
    if (storedState) {
      currentState = {
        ...currentState,
        ...storedState
      };
    }
  }
};

let testItems = [
  {
    type: 'L',
    p1: { x: 450, y: 500 },
    p2: { x: 600, y: 500 },
    lineType: LINETYPES.SEGMENT
  },
  {
    type: 'C',
    p1: { x: 450, y: 500 },
    r: 150
  },
  {
    type: 'C',
    p1: { x: 600, y: 500 },
    r: 150
  }
];

let items = [];
let points = [];
let drawingItem = null;
let closestPoint = null;
let closestItem = null;
let selectedItems = [];

let frame_rate = 60;

let dataInterval = setInterval(() => {
  frame_rate = round(frameRate());
}, 500);

function addItem(item, store = true) {

  let doAdd = true;
  let itemId;

  if (!item.id) {
    itemId = getItemId();
    item.id = itemId;
  }

  // Check item for errors
  if (item.type == 'L') {
    if (item.p1?.x == null || item.p1?.y == null || item.p2?.x == null || item.p2?.y == null || dist(item.p1.x, item.p1.y, item.p2.x, item.p2.y) < EPSILON) {
      return -1;
    }
  } else if (item.type == 'C') {
    if (item.r < EPSILON) {
      return -1;
    }
  } else if (item.type == 'A') {
    if (item.r < EPSILON || Math.abs(item.start - item.stop) < EPSILON) {
      return -1;
    }
  }

  // First, find the intersections between the new item and all existing items and add points
  if (item.type == 'L') {
    for (let other of items) {
      if (other.type == 'L') {
        let res = intersect_lines(item.p1, item.p2, item.lineType, other.p1, other.p2, other.lineType);
        if (res) {
          let p = addPoint(res, [item.id, other.id]);
        }
      } else if (other.type == 'C') {
        let res = intersect_line_circle(createVector(item.p1.x, item.p1.y), createVector(item.p2.x, item.p2.y), createVector(other.p1.x, other.p1.y), other.r, item.lineType);
        for (let r of res) {
          let p = addPoint({ x: r.x, y: r.y }, [item.id, other.id]);
        }
      } else if (other.type == 'A') {
        let res = intersect_line_arc(createVector(item.p1.x, item.p1.y), createVector(item.p2.x, item.p2.y), other, item.lineType);
        for (let r of res) {
          let p = addPoint({ x: r.x, y: r.y }, [item.id, other.id]);
        }
      }
    }
    addPoint(item.p1, [item.id]);
    addPoint(item.p2, [item.id]);
  } else if (item.type == 'C') {
    for (let other of items) {
      if (other.type == 'L') {
        let res = intersect_line_circle(createVector(other.p1.x, other.p1.y), createVector(other.p2.x, other.p2.y), createVector(item.p1.x, item.p1.y), item.r, other.lineType);
        for (let r of res) {
          let p = addPoint({ x: r.x, y: r.y }, [item.id, other.id]);
        }
      } else if (other.type == 'C') {
        let res = intersect_circles(item, other);
        for (let r of res) {
          let p = addPoint(r, [item.id, other.id]);
        }
      } else if (other.type == 'A') {
        let res = intersect_circle_arc(item, other);
        for (let r of res) {
          let p = addPoint(r, [item.id, other.id]);
        }
      }
    }
  } else if (item.type == 'A') {
    for (let other of items) {
      if (other.type == 'A') {
        let res = intersect_arcs(item, other);
        for (let r of res) {
          let p = addPoint(r, [item.id, other.id]);
        }
      } else if (other.type == 'L') {
        let res = intersect_line_arc(createVector(other.p1.x, other.p1.y), createVector(other.p2.x, other.p2.y), item, other.lineType);
        for (let r of res) {
          let p = addPoint({ x: r.x, y: r.y }, [item.id, other.id]);
        }
      } else if (other.type == 'C') {
        let res = intersect_circle_arc(other, item);
        for (let r of res) {
          let p = addPoint(r, [item.id, other.id]);
        }
      }
    }
    addPoint({ x: item.p1.x + cos(item.start) * item.r, y: item.p1.y + sin(item.start) * item.r }, [item.id]);
    addPoint({ x: item.p1.x + cos(item.stop) * item.r, y: item.p1.y + sin(item.stop) * item.r }, [item.id]);
  }
  // Then add the item to the stack
  items.push(item);

  // Update the stored items
  if (store) {
    updateStoredItems();
  }

  return itemId;
}

function loadTestItems() {
  let items = [
    ...testItems
  ];
  for (let item of items) {
    addItem(item, false);
  }
  updateStoredItems();
}

function addItems(_items) {
  for (let item of _items) {
    addItem(item, false);
  }
  updateStoredItems();
}

function addPoint(p, items = []) {
  p.id = getItemId();
  p.items = items;
  points.push(p);
  return itemId;
}

function updateStoredItems() {
  storeItem('storedItems', items);
}

function deleteItem(item) {
  let idx = items.indexOf(item);
  if (idx >= 0) {
    items.splice(idx, 1);
  }

  let ps = points.filter(p => p.items.includes(item.id));
  for (let _p of ps) {
    let idx = points.indexOf(_p);
    if (idx >= 0) {
      points.splice(idx, 1);
    }
  }

  if (closestItem == item) {
    closestItem = null;
  }

  updateStoredItems();
}

function selectItem(item, multiple = true) {
  if (multiple) {
    selectedItems.push(item);
  } else {
    selectedItems = [item];
  }
}

function selectItems(_items) {
  selectedItems = _items;
}

function selectItemById(id) {
  let item = items.find(i => i.id == id);
  if (item) {
    console.log(item);
    selectItem(item);
  }
}

function selectItemsById(ids) {
  selectedItems = items.filter(i => ids.includes(i.id));
}

function deselectItem(item) {
  let idx = selectedItems.indexOf(item);
  if (idx >= 0) {
    selectedItems.splice(idx, 1);
  }
}

function deselectAllItems() {
  selectedItems = [];
}

function drawLine(x1, y1, x2, y2, t = LINETYPES.SEGMENT) {

  if (t == LINETYPES.SEGMENT) {
    line(x1, y1, x2, y2);
    return;
  }

  p1 = new p5.Vector(x1, y1);
  p2 = new p5.Vector(x2, y2);

  let dia_len = new p5.Vector(windowWidth, windowHeight).mag();
  let dir_v = p5.Vector.sub(p2, p1).setMag(dia_len);

  switch (t) {
    case LINETYPES.RAY:
      let lp = p5.Vector.add(p1, dir_v);
      line(p1.x, p1.y, lp.x, lp.y);
      break;
    case LINETYPES.LINE:
      let lp1 = p5.Vector.add(p1, dir_v);
      let lp2 = p5.Vector.sub(p1, dir_v);
      line(lp1.x, lp1.y, lp2.x, lp2.y);
      break;
  }
}


function drawItem(item, style = STYLES.BASE) {

  if (!currentState.displayHelpers && item.helper || item.hidden) {
    return;
  }

  stroke(style.stroke);
  strokeWeight(style.strokeWeight);


  if (item.type == 'L') {
    drawLine(item.p1.x, item.p1.y, item.p2.x, item.p2.y, item.lineType);
  } else if (item.type == 'C') {
    circle(item.p1.x, item.p1.y, item.r * 2)
  } else if (item.type == 'A') {
    arc(item.p1.x, item.p1.y, item.r * 2, item.r * 2, item.start, item.stop);
  }
}

function setup() {
  pixelWidth = windowWidth;
  pixelHeight = windowHeight;

  currentState.load();

  createCanvas(pixelWidth, pixelHeight);

  let storedItems = getItem('storedItems');
  if (storedItems === null) {
    storedItems = [];
  } else {
    for (let item of storedItems) {
      addItem(item, false);
    }
  }

}

function draw() {
  translate(currentState.pan.x, currentState.pan.y);
  background(220, 230, 255);
  noFill();

  for (let item of items) {
    drawItem(item, item.helper ? STYLES.HELPER : STYLES.BASE);
  }

  if (drawingItem) {
    drawItem(drawingItem, currentState.createHelper ? STYLES.DRAWINGITEMHELPER : STYLES.DRAWINGITEM);
  }

  if (currentState.displayHelpers) {
    stroke(STYLES.POINT.stroke);
    strokeWeight(STYLES.POINT.strokeWeight);
    for (let p of points) {
      point(p.x, p.y);
    }
  }

  if (closestItem) {
    drawItem(closestItem, STYLES.CLOSEST);
  }

  if (selectedItems.length) {
    for (let item of selectedItems) {
      drawItem(item, item.helper ? STYLES.SELECTEDHELPER : STYLES.SELECTED);
    }
    // drawItem(selectedItem, selectedItem.helper ? STYLES.SELECTEDHELPER : STYLES.SELECTED);
  }

  if (closestPoint) {
    stroke(STYLES.CLOSESTPOINT.stroke);
    strokeWeight(STYLES.CLOSESTPOINT.strokeWeight);
    point(closestPoint.x, closestPoint.y);
  }

  // Display the state
  translate(-currentState.pan.x, -currentState.pan.y);
  stroke('black');
  strokeWeight(1);
  textSize(16);
  switch (currentState.tool) {
    case STATES.SELECT:
      text('V', 10, 20);
      break;
    case STATES.DRAWLINE:
      text(`L${currentState.lineType}`, 10, 20);
      break;
    case STATES.DRAWCIRCLE:
      text('C', 10, 20);
      break;
    case STATES.PAN:
      text('H', 10, 20);
      break;
  }

  text(`${currentState.createHelper ? 'S' : ''}`, 10, 40);

  if (DEBUG) {
    stroke('black');
    strokeWeight(1);
    text(frame_rate, width - 30, 20)
  }
}

let startX = -1;
let startY = -1;

function getMouseCoords(x, y) {
  return { mx: x - currentState.pan.x, my: y - currentState.pan.y };
}

function mousePressed() {
  let { mx, my } = getMouseCoords(mouseX, mouseY);
  if (currentState.isDrawing()) {
    if (!drawingItem) {
      if (currentState.tool == STATES.DRAWCIRCLE) {
        if (closestPoint) {
          startX = closestPoint.x;
          startY = closestPoint.y;
        } else {
          startX = mx;
          startY = my;
        }
        drawingItem = {
          type: 'C',
          p1: { x: startX, y: startY },
          r: dist(startX, startY, mx, my),
          helper: currentState.createHelper
        }
      } else if (currentState.tool == STATES.DRAWLINE) {
        if (closestPoint) {
          startX = closestPoint.x;
          startY = closestPoint.y;
        } else {
          startX = mx;
          startY = my;
        }
        drawingItem = {
          type: 'L',
          p1: { x: startX, y: startY },
          p2: { x: mx, y: my },
          helper: currentState.createHelper,
          lineType: currentState.lineType
        }
      }
    } else {
      // Check that the new item isn't too small, ie. that it's not just a point
      if (dist(drawingItem.p1.x, drawingItem.p1.y, mx, my) > 1) {
        addItem(drawingItem);
        drawingItem = null;
      }
    }
  } else if (currentState.tool == STATES.SELECT) {
    if (closestItem) {
      if (selectedItems.includes(closestItem)) {
        deselectItem(closestItem);
      } else {
        selectItem(closestItem, keyIsDown(SHIFT));
      }
    } else {
      selectedItems = [];
    }
  } else if (currentState.tool == STATES.PAN && !currentState.isPanning) {
    startX = mouseX;
    startY = mouseY;
    currentState.panStart = { x: currentState.pan.x, y: currentState.pan.y };
    currentState.isPanning = true;
  }
}

function mouseMoved() {
  let { mx, my } = getMouseCoords(mouseX, mouseY);
  closestPoint = null;
  let minDist = Infinity;

  if (currentState.isDrawing()) {
    for (let p of points) {
      let d = dist(p.x, p.y, mx, my);
      if (d < minDist) {
        minDist = d;
        closestPoint = p;
      }
    }
  }

  closestItem = null;
  if (currentState.tool == STATES.SELECT) {
    minDist = SELECTDISTANCE;
    for (let item of items) {
      if (item.hidden) continue;
      if (item.type == 'L') {
        let d = distance_point_line(createVector(item.p1.x, item.p1.y), createVector(item.p2.x, item.p2.y), createVector(mx, my), item.lineType);
        if (d < minDist) {
          minDist = d;
          closestItem = item;
        }
      } else if (item.type == 'C') {
        let d = distance_point_circle(item, { x: mx, y: my });
        if (d < minDist) {
          minDist = d;
          closestItem = item;
        }
      } else if (item.type == 'A') {
        let d = distance_point_arc(item, { x: mx, y: my });
        if (d < minDist) {
          minDist = d;
          closestItem = item;
        }
      }
    }
  }
}

function mouseDragged() {
  let { mx, my } = getMouseCoords(mouseX, mouseY);
  if (drawingItem) {
    let endX = mx;
    let endY = my;

    if (points.length > 0) {
      closestPoint = null;
      let minDist = Infinity;
      for (let p of points) {
        let d = dist(p.x, p.y, mx, my);
        if (d < minDist) {
          minDist = d;
          closestPoint = p;
        }
      }
      endX = closestPoint.x;
      endY = closestPoint.y;
    }
    if (currentState.tool == STATES.DRAWCIRCLE) {
      drawingItem.r = dist(startX, startY, endX, endY);
    } else if (currentState.tool == STATES.DRAWLINE) {
      drawingItem.p2 = { x: endX, y: endY };
    }
  } else if (currentState.isPanning) {
    currentState.pan.x = currentState.panStart.x + mouseX - startX;
    currentState.pan.y = currentState.panStart.y + mouseY - startY;
  } else {

  }
}

function mouseReleased() {
  let { mx, my } = getMouseCoords(mouseX, mouseY);
  if (currentState.isDrawing() && drawingItem) {
    // Check that the new item isn't too small, ie. that it's not just a point
    if (dist(drawingItem.p1.x, drawingItem.p1.y, mx, my) > 1) {
      addItem(drawingItem);
      drawingItem = null;
    }
  } else if (currentState.tool == STATES.PAN && currentState.isPanning) {
    currentState.isPanning = false;
    startX = -1;
    startY = -1;
    currentState.store();
  }

}

function changeStyle() {
  if (selectedItems.length) {
    for (let selectedItem of selectedItems) {
      selectedItem.helper = !selectedItem.helper;
    }
    updateStoredItems();
  } else if (currentState.isDrawing()) {
    currentState.createHelper = !currentState.createHelper;
    if (drawingItem) {
      drawingItem.helper = currentState.createHelper;
    }
  }
}

function toggleLineType() {
  if (currentState.tool == STATES.SELECT && selectedItems.length) {
    for (let item of selectedItems) {
      item.lineType = (item.lineType + 1) % CountLineTypes;
      // Quickest way to update the points is to delete and re-add the item
      deleteItem(item);
      addItem(item);
    }
    // selectedItem.lineType = (selectedItem.lineType + 1) % CountLineTypes;
    updateStoredItems();
  } else if (currentState.tool == STATES.DRAWLINE) {
    currentState.lineType = (currentState.lineType + 1) % CountLineTypes;
  }

  if (drawingItem) {
    drawingItem.lineType = currentState.lineType;
  }

}

function setTool(tool) {
  currentState.tool = tool;
  switch (tool) {
    case STATES.SELECT:
      cursor(ARROW);
      break;
    case STATES.DRAWLINE:
      cursor(CROSS);
      break;
    case STATES.DRAWCIRCLE:
      cursor(CROSS);
      break;
    case STATES.PAN:
      cursor('grab');
      break;
  }
}

function setDisplayHelpers(displayHelpers) {
  currentState.displayHelpers = displayHelpers;
}

function toggleDisplayHelpers() {
  currentState.displayHelpers = !currentState.displayHelpers;
}

function cutSelectedItems() {
  if (selectedItems.length) {
    let newSelectedItems = [];
    for (let selectedItem of selectedItems) {
      if (selectedItem.type == 'L') {
        let lines = split_line(selectedItem);
        if (lines.length > 0) {
          for (let l of lines) {
            newSelectedItems.push(l);
          }
        }
        deleteItem(selectedItem);
        addItems(lines);
      } else if (selectedItem.type == 'C') {
        let arcs = split_circle(selectedItem);
        if (arcs.length > 0) {
          for (let a of arcs) {
            newSelectedItems.push(a);
          }
        }
        deleteItem(selectedItem);
        addItems(arcs);
      } else if (selectedItem.type == 'A') {
        let arcs = split_arc(selectedItem);
        console.log(arcs);
        if (arcs.length > 0) {
          for (let a of arcs) {
            newSelectedItems.push(a);
          }
        }
        deleteItem(selectedItem);
        addItems(arcs);
      }
    }
    deselectAllItems();
    selectItems(newSelectedItems);
  }
}

function deleteSelectedItems() {
  if (selectedItems.length) {
    for (let selectedItem of selectedItems) {
      deleteItem(selectedItem);
    }
    selectedItems = [];
  }
}

function keyPressed() {
  switch (key) {
    case 'd':
      toggleDisplayHelpers();
      break;
    case 'v':
      setTool(STATES.SELECT);
      break;
    case 'l':
      if (currentState.tool == STATES.DRAWLINE) {
        currentState.lineType = (currentState.lineType + 1) % CountLineTypes;
      } else {
        currentState.lineType = LINETYPES.SEGMENT;
      }
      if (drawingItem) {
        drawingItem.lineType = currentState.lineType;
      }
      setTool(STATES.DRAWLINE);
      break;
    case 't':
      toggleLineType();
      break;
    case 'c':
      setTool(STATES.DRAWCIRCLE);
      break;
    case 'h':
      setTool(STATES.PAN);
    case 's':
      changeStyle();
      break;
    case 'x':
      cutSelectedItems();
      break;
    case 'Escape':
      drawingItem = null;
      break;
    case 'Backspace':
      deleteSelectedItems();
      break;
    case ' ':
      DEBUG = !DEBUG;
      break;
  }
}

function windowResized() {
  pixelWidth = windowWidth;
  pixelHeight = windowHeight;

  resizeCanvas(pixelWidth, pixelHeight);
} 