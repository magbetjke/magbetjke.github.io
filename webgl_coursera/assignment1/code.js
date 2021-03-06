var gl;
var verticies;
var quad_verticies;
var points;
var numTimesToSubdivide = 0;
var angle = 0;
var angle_loc;
var shape_index = 0;
var show_frame = false;

window.onload = function init() {
  var canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  //shape
  var start = vec2(0.0, 0.5);
  vertices = [
    start,
    rotatePoint(start, radians(120)),
    rotatePoint(start, radians(240))
  ];

  quad_verticies = [
    vec2(-0.5, -0.5),
    vec2(-0.5, 0.5),
    vec2(0.5, -0.5),
    vec2(-0.5, 0.5),
    vec2(0.5, 0.5),
    vec2(0.5, -0.5)
  ];

  //
  //  Configure WebGL
  //
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  //  Load shaders and initialize attribute buffers

  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  angle_loc = gl.getUniformLocation(program, "angle");
  // Load the data into the GPU

  var bufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferData(gl.ARRAY_BUFFER, 16 * 2048 * 4, gl.STATIC_DRAW);

  // Associate out shader variables with our data buffer

  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  render();

  document.getElementById("tesselation_level").onchange = function(event) {
    var target = event.target || event.srcElement;
    numTimesToSubdivide = target.value;
    render();
  };

  document.getElementById("angle").onchange = function(event) {
    var target = event.target || event.srcElement;
    angle = target.value;
    render();
  };

  var radios = document.getElementsByName("shape_type");
  radios[0].onclick = function(event) {
    shape_index = 0;
    render();
  }

  radios[1].onclick = function(event) {
    shape_index = 1; 
    render(); 
  }

  document.getElementById("is_frame_visible").onchange = function(event) {
      var target = event.target || event.srcElement;
      show_frame = target.checked;
      render();
  };
}

function triangle(a, b, c) {
  if (show_frame) {
    points.push(a, b, b, c, c, a);
  } else {
    points.push(a, b, c);
  }

}

function divideTriangle(a, b, c, count) {

  // check for end of recursion

  if (count == 0) {
    triangle(a, b, c);
  } else {

    //bisect the sides

    var ab = mix(a, b, 0.5);
    var ac = mix(a, c, 0.5);
    var bc = mix(b, c, 0.5);

    --count;

    // three new triangles

    divideTriangle(a, ab, ac, count);
    divideTriangle(c, ac, bc, count);
    divideTriangle(b, bc, ab, count);
    divideTriangle(ab, bc, ac, count);
  }
}

function rotatePoint(point, angle) {
  var x = point[0] * Math.cos(angle) - point[1] * Math.sin(angle);
  var y = point[0] * Math.sin(angle) + point[1] * Math.cos(angle);
  return vec2(x, y);
}

function render() {
  points = [];

  if (shape_index == 0) {
    divideTriangle(vertices[2], vertices[0], vertices[1], 
    numTimesToSubdivide);
  } else if (shape_index == 1) {
    divideTriangle(quad_verticies[0], quad_verticies[1], quad_verticies[2],
    numTimesToSubdivide);
    divideTriangle(quad_verticies[3], quad_verticies[4], quad_verticies[5],
    numTimesToSubdivide);
  }

  gl.uniform1f(angle_loc, radians(angle));

  gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(points));
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(show_frame ? gl.LINES : gl.TRIANGLES, 0, points.length);
}