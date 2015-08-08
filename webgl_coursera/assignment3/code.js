var gl;
var mouse_pressed = false;
var canvas;
var arrayOfLines = [];
var arrayOfLineWidths = [];
var current_index = -1;

const NUMS_PER_ENTITY = 6;

var hasSelected = false;

window.onload = function init() {
 canvas = document.getElementById("gl-canvas");
 points = [];

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }
  //
  //  Configure WebGL
  //
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.98, 0.98, 0.98, 1.0);

  //  Load shaders and initialize attribute buffers

  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  angle_loc = gl.getUniformLocation(program, "angle");
  // Load the data into the GPU

  var bufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferData(gl.ARRAY_BUFFER, 16 * 2048 * 4, gl.DYNAMIC_DRAW);

  // Associate out shader variables with our data buffer

  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(vPosition);

  var vColor = gl.getAttribLocation(program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 24, 8)
  gl.enableVertexAttribArray(vColor);

  render();

 //  document.getElementById("line_width").max = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)[1];

 //  document.getElementById("clean_btn").onclick = function(event) {
 //  	clear();
 //  }

 //  canvas.addEventListener("mousedown", function(event){
 //  		mouse_pressed = true;

 //  		++current_index;
 //  		arrayOfLineWidths[current_index] = document.getElementById("line_width").value;

 //  		event.preventDefault();

	// });
 //  canvas.addEventListener("mouseup", function(event){
 //    	mouse_pressed = false;

 //    	//++current_index;

 //    	//event.preventDefault();
	// });

 //  canvas.addEventListener("mouseout", function(event){
 //  		mouse_pressed = false;

    	
 //  });
 //  canvas.addEventListener("mousemove", function(event){
 //  		if (mouse_pressed)
 //  		{
 //  			addPoint(event.clientX, event.clientY);
 //  			render();	
 //  		}

 //  		event.preventDefault();
  		
	// });

  document.getElementById("add_object").onclick = function(event) {
    createObject(document.getElementById("object_picker").value);
  };

  document.getElementById("color_r").onchange = function(event) {
    var target = event.target || event.srcElement;
    var color = target.value;
    document.getElementById("color_r_value").innerHTML = color;
    updateSelectedObject();
  };

  document.getElementById("color_g").onchange = function(event) {
    var target = event.target || event.srcElement;
    var color = target.value;
    document.getElementById("color_g_value").innerHTML = color;
    updateSelectedObject();
  };

  document.getElementById("color_b").onchange = function(event) {
    var target = event.target || event.srcElement;
    var color = target.value;
    document.getElementById("color_b_value").innerHTML = color;
    updateSelectedObject();
  };

  setSelected(true);
}

function updateSelectedObject() {

}

function setSelected(value) {
  hasSelected = value;
  if (!hasSelected) {
    document.getElementById("object_props").style.visibility = "hidden";
    document.getElementById("object_props_placeholder").style.visibility = "visible";
  } else {
    document.getElementById("object_props").style.visibility = "visible";
    document.getElementById("object_props_placeholder").style.visibility = "hidden";
  }
}

function createObject(objectType) 
{
  if (objectType == "sphere") {
    console.log("added sphere");
  } else if (objectType == "cone") {
    console.log("added cone");
  } else if (objectType == "cylinder") {
    console.log("added cylinder");
  }
}

function addPoint(x, y)
{
	var posX = 2 * (x - canvas.getBoundingClientRect().left) / (canvas.width) - 1.0;
	var posY = 1.0 - 2 * (y - canvas.getBoundingClientRect().top) / canvas.height;
	//points.push(posX, posY);

	while (!arrayOfLines[current_index])
	{
		arrayOfLines.push([]);
	}
		
	var red = document.getElementById("color_r").value;	
	var green = document.getElementById("color_g").value;	
	var blue = document.getElementById("color_b").value;	
	var alpha = document.getElementById("color_a").value;	

	arrayOfLines[current_index].push(posX, posY, red / 255, green / 255, blue / 255, alpha / 255);
}

function clear()
{
  	arrayOfLines = [];
  	arrayOfLineWidths = [];
  	current_index = -1;
  	render();
}

function render()
{
  	gl.clear(gl.COLOR_BUFFER_BIT);
  	gl.enable(gl.BLEND);
  	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	// for (var i = 0; i != arrayOfLines.length; ++i) 
	// {
	// 	var line = arrayOfLines[i];
	// 	//console.log(JSON.stringify(line));
	//   	if (line.length <= NUMS_PER_ENTITY) //there is no line_strip of one vertex
	//   		break;

	//   	gl.lineWidth(arrayOfLineWidths[i]);
	//   	gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(line));
	//   	gl.drawArrays(gl.LINE_STRIP, 0, line.length / NUMS_PER_ENTITY);
	// }
}