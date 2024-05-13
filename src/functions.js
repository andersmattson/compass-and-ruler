
let itemId = 0;
function getItemId() {
  return (new Date).getTime() + ('' + itemId++);
}

function orthogonalProjection1(a, b, p) {

  d1 = p5.Vector.sub(b, a).normalize()
  d2 = p5.Vector.sub(p, a)

  d1.mult(d2.dot(d1))

  return p5.Vector.add(a, d1)
}

function orthogonalProjection2(a, b, p) {

  d1 = p5.Vector.sub(b, a);
  d2 = p5.Vector.sub(p, a);
  l1 = d1.mag();

  dotp = constrain(d2.dot(d1.normalize()), 0, l1);

  return p5.Vector.add(a, d1.mult(dotp));
}

function point_is_on_arc(arc, p) {
  let baseVector = createVector(1, 0);
  let v = createVector(p.x - arc.p1.x, p.y - arc.p1.y);
  let angle = baseVector.angleBetween(v);
  if(angle < 0) angle += TWO_PI;
  
  let start = arc.start;
  let stop = arc.stop - arc.start;
  angle = angle - start;
  if(angle < 0) angle += TWO_PI;
  if(stop < 0) stop += TWO_PI;

  return angle <= stop && angle >= 0;
}

function distance_point_line(p1, p2, p, type = LINETYPES.SEGMENT) {
  if (type == LINETYPES.LINE)
    return orthogonalProjection1(p1, p2, p).dist(p);
  else
    return orthogonalProjection2(p1, p2, p).dist(p);
}

function distance_point_point(p1, p2) {
  return sqrt(pow(p1.x - p2.x, 2) + pow(p1.y - p2.y, 2));
}

function distance_point_circle(c, p) {
  return abs(dist(c.p1.x, c.p1.y, p.x, p.y) - c.r);
}

function distance_point_arc(arc, p) {
  if(point_is_on_arc(arc, p)){
    return Math.abs(createVector(p.x - arc.p1.x, p.y - arc.p1.y).mag() - arc.r);
  } else {
    return Math.min(
      distance_point_point(p, arc.startPoint),
      distance_point_point(p, arc.stopPoint)
    );
  }
}

function intersect_lines(point1, point2, type1, point3, point4, type2) {
  const ua = ((point4.x - point3.x) * (point1.y - point3.y) -
    (point4.y - point3.y) * (point1.x - point3.x)) /
    ((point4.y - point3.y) * (point2.x - point1.x) -
      (point4.x - point3.x) * (point2.y - point1.y));

  const ub = ((point2.x - point1.x) * (point1.y - point3.y) -
    (point2.y - point1.y) * (point1.x - point3.x)) /
    ((point4.y - point3.y) * (point2.x - point1.x) -
      (point4.x - point3.x) * (point2.y - point1.y));

  if(type1 == LINETYPES.SEGMENT && type2 == LINETYPES.SEGMENT && (ua > 1 || ub > 1 || ua < 0 || ub < 0)) return false;
  else if( type1 == LINETYPES.SEGMENT && ( ua > 1 || ua < 0 ) ) return false;
  else if( type2 == LINETYPES.SEGMENT && ( ub > 1 || ub < 0 ) ) return false;
  
  // if ((type1 == LINETYPES.SEGMENT || type2 == LINETYPES.SEGMENT) && (ua > 1 || ub > 1 || ua < 0 || ub < 0)) {
  //   console.log(type1, type2, ua, ub);
  //   return false;
  // }

  const retp = {
    x: point1.x + ua * (point2.x - point1.x),
    y: point1.y + ua * (point2.y - point1.y)
  };

  if(distance_point_point(retp, point1) > MAXDIST || distance_point_point(retp, point2) > MAXDIST) return false;
  
  const x = point1.x + ua * (point2.x - point1.x);
  const y = point1.y + ua * (point2.y - point1.y);

  return { x: x, y: y }
}

let in_between = function (p1, p2, px) {

  let v = p2.copy().sub(p1);
  let d = v.mag();
  v = v.normalize();

  let vx = px.copy().sub(p1);
  let dx = v.dot(vx);

  return dx >= 0 && dx <= d;
}

function intersect_line_circle(p1, p2, cpt, r, type = LINETYPES.SEGMENT) {

  let sign = function (x) { return x < 0.0 ? -1 : 1; };

  let x1 = p1.copy().sub(cpt);
  let x2 = p2.copy().sub(cpt);

  let dv = x2.copy().sub(x1)
  let dr = dv.mag();
  let D = x1.x * x2.y - x2.x * x1.y;

  // evaluate if there is an intersection
  let di = r * r * dr * dr - D * D;
  if (di < 0.0)
    return [];

  let t = sqrt(di);

  ip = [];
  let np1 = new p5.Vector(D * dv.y + sign(dv.y) * dv.x * t, -D * dv.x + abs(dv.y) * t).div(dr * dr).add(cpt);
  if (type == LINETYPES.LINE) {
    ip.push(np1);
  } else if (in_between(p1, p2, np1)) {
    ip.push(np1);
  }
  if (di > 0.0) {
    let np2 = new p5.Vector(D * dv.y - sign(dv.y) * dv.x * t, -D * dv.x - abs(dv.y) * t).div(dr * dr).add(cpt);
    if (type == LINETYPES.LINE) {
      ip.push(np2);
    }
    else if (in_between(p1, p2, np2)) {
      ip.push(np2);
    }
  }
  return ip;
}

function intersect_circles(c1, c2) {

  let p1 = createVector(c1.p1.x, c1.p1.y);
  let p2 = createVector(c2.p1.x, c2.p1.y);
  let r1 = c1.r;
  let r2 = c2.r;

  let d = p1.dist(p2);
  let ret = [];
  
  if (d <= (r1 + r2)) {
    
    let a = (pow(r1, 2) - pow(r2, 2) + pow(d, 2)) / (2 * d);

    let h = sqrt(pow(r1, 2) - pow(a, 2));
    if(!h) h = 0;
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;

    let x5 = p1.x + (a / d) * dx;
    let y5 = p1.y + (a / d) * dy;

    ret.push({
      x: x5 + (h * dy / d), 
      y: y5 - (h * dx / d)
    });

    ret.push({
      x: x5 - (h * dy / d),
      y: y5 + (h * dx / d)
    });
  }

  return ret;
}

function intersect_line_arc(p1, p2, arc, type = LINETYPES.SEGMENT) {
  let points = intersect_line_circle(p1, p2, createVector(arc.p1.x, arc.p1.y), arc.r, type);
  return points.filter(p => point_is_on_arc(arc, p));
}

function intersect_circle_arc(c, a) {
  let points = intersect_circles(c, a);
  return points.filter(p => point_is_on_arc(a, p));
}

function intersect_arcs(a1, a2) {
  let points = intersect_circles(a1, a2);
  return points.filter(p => point_is_on_arc(a1, p) && point_is_on_arc(a2, p));
}

function split_line( item ){
  let lines = [];
  let ps = points.filter(p => p.items.includes(item.id));
  if( item.p1.x == item.p2.x ){
    ps = ps.sort((a,b) => a.y - b.y);
  } else {
    ps = ps.sort((a,b) => a.x - b.x);
  }

  for( let i = 0; i < ps.length - 1; i++ ){
    let p1 = ps[i];
    let p2 = ps[i+1];
    if(distance_point_point(p1, p2) < EPSILON) continue;
    let l = {
      id: getItemId(),
      type: 'L',
      p1: {x: p1.x, y: p1.y},
      p2: {x: p2.x, y: p2.y},
      helper: currentState.createHelper,
      lineType: LINETYPES.SEGMENT,
    }
    lines.push(l);
  }

  return lines;
}

function split_circle( item ){
  let arcs = [];
  let ps = points.filter(p => p.items.includes(item.id));
  let baseVector = createVector(1, 0);

  ps = ps.map(p => {
    let a = baseVector.angleBetween(createVector(p.x - item.p1.x, p.y - item.p1.y));
    if(a < 0) a += TWO_PI;
    return {
      x: p.x,
      y: p.y,
      angle: a
    }
  }).sort((a,b) => a.angle - b.angle);

  for( let i = 0; i < ps.length; i++ ){

    let p1, p2;
    p1 = ps[i];
    p2 = ps[(i+1) % ps.length];
    if(Math.abs(p1.angle - p2.angle) < EPSILONANGLE) continue;
    
    let arc = {
      id: getItemId(),
      type: 'A',
      p1: {x: item.p1.x, y: item.p1.y},
      r: item.r,
      start: p1.angle,
      stop: p2.angle,
      startPoint: {x: p1.x, y: p1.y},
      stopPoint: {x: p2.x, y: p2.y},
      helper: currentState.createHelper,
    }
    arcs.push(arc);
  }

  return arcs;
}

function split_arc( item ){
  let arcs = [];
  let ps = points.filter(p => p.items.includes(item.id));
  let baseVector = createVector(item.startPoint.x - item.p1.x, item.startPoint.y - item.p1.y);
  ps = ps.map(p => {
    let a = baseVector.angleBetween(createVector(p.x - item.p1.x, p.y - item.p1.y));
    if(a < 0) a += TWO_PI;
    return {
      x: p.x,
      y: p.y,
      angle: a + item.start,
      sortAngle: a
    }
  }).sort((a,b) => a.start > a.stop ? b.sortAngle - a.sortAngle : a.sortAngle - b.sortAngle);
  console.log(ps);
  console.log(item);

  for( let i = 0; i < ps.length - 1; i++ ){

    let p1, p2;
    p1 = ps[i];
    p2 = ps[i+1];
    if(Math.abs(p1.angle - p2.angle) < EPSILONANGLE) continue;
    
    let arc = {
      id: getItemId(),
      type: 'A',
      p1: {x: item.p1.x, y: item.p1.y},
      r: item.r,
      start: p1.angle,
      stop: p2.angle,
      startPoint: {x: p1.x, y: p1.y},
      stopPoint: {x: p2.x, y: p2.y},
      helper: currentState.createHelper,
    }
    arcs.push(arc);
  }

  return arcs;
}