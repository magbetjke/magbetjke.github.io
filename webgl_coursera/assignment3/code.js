var gl;
var mouse_pressed = false;
var canvas;
var arrayOfLines = [];
var arrayOfLineWidths = [];
var current_index = -1;

var vertexBufferId;
var indexBufferId;

var transform_loc;
var color_loc;

var viewTransform;
var projectionTransform;

var hasSelected = false;
var selectedObject;

var uiColor = vec4(255, 255, 255, 255);
var uiPosition = vec3(0, 0, 0);
var uiScale = vec3(1, 1, 1);
var uiRotation = vec3(0, 0, 0);

//Drawable class
function Drawable(type, tessellationLevel) {
    this.type = type;
    this.tesselationLevel = tessellationLevel;
    this.color = [255, 255, 255, 255];
    this.outlineColor = [0.2, 0.2, 0.2, 1.0];
    this.vertices = [];
    this.indexes = [];
    this.outlineIndexes = [];
    this.currentIndex = 0;
    this.transform = [];
    this.scale = [1.0, 1.0, 1.0];
    this.rotation = [0, 0, 0];
    this.position = [0, 0, 0];

    this.getMiddlePoint = function(a, b) {
        return mix(a, b, 0.5);
    }

    this.validate = function(point) {
        var length = Math.sqrt(point[0] * point[0] + point[1] * point[1] + point[2] * point[2]);
        point[0] /= length;
        point[1] /= length;
        point[2] /= length;

        return point;
    }

    this.addTriangle = function (a, b, c) {

        this.vertices.push(this.validate(a), this.validate(b), this.validate(c));
        this.outlineIndexes.push(
            this.currentIndex, this.currentIndex + 1,
            this.currentIndex + 1, this.currentIndex + 2,
            this.currentIndex, this.currentIndex + 2);
        this.indexes.push(this.currentIndex, this.currentIndex + 1, this.currentIndex + 2);

        this.currentIndex += 3;
    }

    this.divideTriangle = function(a, b, c, count) {
        // check for end of recursion
        if (count == 0) {
            this.addTriangle(a, b, c);
        } else {

            //bisect the sides

//            var ab = mix(a, b, 0.5);
//            var ac = mix(a, c, 0.5);
//            var bc = mix(b, c, 0.5);
//
//

            var ab = this.getMiddlePoint(a, b);
            var ac = this.getMiddlePoint(a, c);
            var bc = this.getMiddlePoint(b, c);

            --count;

            // three new triangles

            this.divideTriangle(a, ab, ac, count);
            this.divideTriangle(c, ac, bc, count);
            this.divideTriangle(b, bc, ab, count);
            this.divideTriangle(ab, bc, ac, count);
        }
    };

    this.initialize = function () {
        if (this.type == "sphere") {
            var t = (1.0 + Math.sqrt(5.0)) / 2.0;

            var points = [];

            points.push(vec3(-1, t, 0));
            points.push(vec3(1, t, 0));
            points.push(vec3(-1, -t, 0));
            points.push(vec3(1, -t, 0));

            points.push(vec3(0, -1, t));
            points.push(vec3(0, 1, t));
            points.push(vec3(0, -1, -t));
            points.push(vec3(0, 1, -t));

            points.push(vec3(t, 0, -1));
            points.push(vec3(t, 0, 1));
            points.push(vec3(-t, 0, -1));
            points.push(vec3(-t, 0, 1));

            this.divideTriangle(points[0], points[11], points[5], tessellationLevel);
            this.divideTriangle(points[0], points[5], points[1], tessellationLevel);
            this.divideTriangle(points[0], points[1], points[7], tessellationLevel);
            this.divideTriangle(points[0], points[7], points[10], tessellationLevel);
            this.divideTriangle(points[0], points[10], points[11], tessellationLevel);

            this.divideTriangle(points[1], points[5], points[9], tessellationLevel);
            this.divideTriangle(points[5], points[11], points[4], tessellationLevel);
            this.divideTriangle(points[11], points[10], points[2], tessellationLevel);
            this.divideTriangle(points[10], points[7], points[6], tessellationLevel);
            this.divideTriangle(points[7], points[1], points[8], tessellationLevel);

            this.divideTriangle(points[3], points[9], points[4], tessellationLevel);
            this.divideTriangle(points[3], points[4], points[2], tessellationLevel);
            this.divideTriangle(points[3], points[2], points[6], tessellationLevel);
            this.divideTriangle(points[3], points[6], points[8], tessellationLevel);
            this.divideTriangle(points[3], points[8], points[9], tessellationLevel);

            this.divideTriangle(points[4], points[9], points[5], tessellationLevel);
            this.divideTriangle(points[2], points[4], points[11], tessellationLevel);
            this.divideTriangle(points[6], points[2], points[10], tessellationLevel);
            this.divideTriangle(points[8], points[6], points[7], tessellationLevel);
            this.divideTriangle(points[9], points[8], points[1], tessellationLevel);

            this.updateTransform();
        }
    };

    this.updateTransform = function() {
        var rotateX = rotate(this.rotation[0], [1, 0, 0]);
        var rotateY = rotate(this.rotation[1], [0, 1, 0]);
        var rotateZ = rotate(this.rotation[2], [0, 0, 1]);
        var rotationMatrix = mult(mult(rotateX, rotateY), rotateZ);
        var translationMatrix = translate(this.position);
        var scaleMatrix = scalem(this.scale);

        this.transform = mult(mult(mult(mult(projectionTransform, viewTransform), translationMatrix), rotationMatrix), scaleMatrix);
    }

    this.draw = function() {

        gl.enable(gl.DEPTH_TEST);
//        console.log(this.outlineIndexes.length);
//        console.log(JSON.stringify(this.vertices));
//        console.log(JSON.stringify(this.outlineIndexes));

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.uniformMatrix4fv(transform_loc, false, flatten(this.transform));

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(this.vertices));

        //draw frame
        gl.uniform4fv(color_loc, this.outlineColor);

        gl.lineWidth(2);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, new Uint16Array(this.outlineIndexes));

        gl.polygonOffset(0.0, 0.0);
        gl.drawElements(gl.LINES, this.outlineIndexes.length * 2, gl.UNSIGNED_SHORT, 0);

        //draw filled
        gl.uniform4fv(color_loc, this.color);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, new Uint16Array(this.indexes));

        gl.polygonOffset(1.0, 1.0);
        gl.drawElements(gl.TRIANGLES, this.indexes.length * 2, gl.UNSIGNED_SHORT, 0);
    };

    this.initialize();
}
//===

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

    viewTransform = lookAt(
                        vec3(0.0, 0.0, 1.0) //eye
                        ,vec3(0.0, 0.0, 0.0) //at
                        ,vec3(0.0, 1.0, 0.0) //up
    );

    projectionTransform = ortho(-10.0, 10.0, -10.0, 10.0, 10.0, -10.0);

    //  Load shaders and initialize attribute buffers

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    transform_loc = gl.getUniformLocation(program, "uTransform");
    color_loc = gl.getUniformLocation(program, "uColor");
    // Load the data into the GPU

    vertexBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, 16 * 2048 * 4, gl.DYNAMIC_DRAW);

    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 12, 0);

    gl.enableVertexAttribArray(0);

    indexBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 16 * 2048, gl.DYNAMIC_DRAW);

//    var vColor = gl.getAttribLocation(program, "vColor");
//    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 24, 8)
//    gl.enableVertexAttribArray(vColor);

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

    document.getElementById("add_object").onclick = function (event) {
        createObject(document.getElementById("object_picker").value);
    };

    //color controls
    document.getElementById("color_r").onchange = function (event) {
        var target = event.target || event.srcElement;
        var color = target.value;
        uiColor[0] = color;
        document.getElementById("color_r_value").innerHTML = color;
        updateSelectedObject();
    };

    document.getElementById("color_g").onchange = function (event) {
        var target = event.target || event.srcElement;
        var color = target.value;
        uiColor[1] = color;
        document.getElementById("color_g_value").innerHTML = color;
        updateSelectedObject();
    };

    document.getElementById("color_b").onchange = function (event) {
        var target = event.target || event.srcElement;
        var color = target.value;
        uiColor[2] = color;
        document.getElementById("color_b_value").innerHTML = color;
        updateSelectedObject();
    };

    //position controls
    document.getElementById("position_x").onchange = function (event) {
        var target = event.target || event.srcElement;
        var pos = target.value;
        uiPosition[0] = pos;
        document.getElementById("position_x_value").innerHTML = pos;
        updateSelectedObject();
    };

    document.getElementById("position_y").onchange = function (event) {
        var target = event.target || event.srcElement;
        var pos = target.value;
        uiPosition[1] = pos;
        document.getElementById("position_y_value").innerHTML = pos;
        updateSelectedObject();
    };

    document.getElementById("position_z").onchange = function (event) {
        var target = event.target || event.srcElement;
        var pos = target.value;
        uiPosition[2] = pos;
        document.getElementById("position_z_value").innerHTML = pos;
        updateSelectedObject();
    };

    //scale controls
    document.getElementById("scale_x").onchange = function (event) {
        var target = event.target || event.srcElement;
        var scale = target.value;
        uiScale[0] = scale;
        document.getElementById("scale_x_value").innerHTML = scale;
        updateSelectedObject();
    };

    document.getElementById("scale_y").onchange = function (event) {
        var target = event.target || event.srcElement;
        var scale = target.value;
        uiScale[1] = scale;
        document.getElementById("scale_y_value").innerHTML = scale;
        updateSelectedObject();
    };

    document.getElementById("scale_z").onchange = function (event) {
        var target = event.target || event.srcElement;
        var scale = target.value;
        uiScale[2] = scale;
        document.getElementById("scale_z_value").innerHTML = scale;
        updateSelectedObject();
    };

    //rotation controls
    document.getElementById("rotation_x").onchange = function (event) {
        var target = event.target || event.srcElement;
        var rotation = target.value;
        uiRotation[0] = rotation;
        document.getElementById("rotation_x_value").innerHTML = rotation;
        updateSelectedObject();
    };

    document.getElementById("rotation_y").onchange = function (event) {
        var target = event.target || event.srcElement;
        var rotation = target.value;
        uiRotation[1] = rotation;
        document.getElementById("rotation_y_value").innerHTML = rotation;
        updateSelectedObject();
    };

    document.getElementById("rotation_z").onchange = function (event) {
        var target = event.target || event.srcElement;
        var rotation = target.value;
        uiRotation[2] = rotation;
        document.getElementById("rotation_z_value").innerHTML = rotation;
        updateSelectedObject();
    };


    resetControls();
    setSelected(true);

    var sphere = new Drawable("sphere", 2);
    selectedObject = sphere;

    render();
}

function resetControls() {
    //color
    uiColor = vec4(255, 255, 255, 255);
    document.getElementById("color_r").value = 255;
    document.getElementById("color_r_value").innerHTML = "255";

    document.getElementById("color_g").value = 255;
    document.getElementById("color_b_value").innerHTML = "255";

    document.getElementById("color_b").value = 255;
    document.getElementById("color_b_value").innerHTML = "255";

    //position
    uiPosition = vec3(0, 0, 0);
    document.getElementById("position_x").value = 0;
    document.getElementById("position_x_value").innerHTML = "0";

    document.getElementById("position_y").value = 0;
    document.getElementById("position_y_value").innerHTML = "0";

    document.getElementById("position_z").value = 0;
    document.getElementById("position_z_value").innerHTML = "0";

    //scale
    uiScale = vec3(1, 1, 1);
    document.getElementById("scale_x").value = 0;
    document.getElementById("scale_x_value").innerHTML = "1";

    document.getElementById("scale_y").value = 0;
    document.getElementById("scale_y_value").innerHTML = "1";

    document.getElementById("scale_z").value = 0;
    document.getElementById("scale_z_value").innerHTML = "1";

    //rotation
    uiRotation = vec3(0, 0, 0);
    document.getElementById("rotation_x").value = 0;
    document.getElementById("rotation_x_value").innerHTML = "0";

    document.getElementById("rotation_y").value = 0;
    document.getElementById("rotation_y_value").innerHTML = "0";

    document.getElementById("rotation_z").value = 0;
    document.getElementById("rotation_z_value").innerHTML = "0";
}

function updateSelectedObject() {
    if (selectedObject) {
        selectedObject.color = vec4(
            uiColor[0] / 255
            ,uiColor[1] / 255
            ,uiColor[2] / 255
            ,uiColor[3] / 255
        );

        selectedObject.position = uiPosition;
        selectedObject.scale = uiScale;
        selectedObject.rotation = uiRotation;
//        console.log(selectedObject.color);

        selectedObject.updateTransform();
    }
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

function createObject(objectType) {
    if (objectType == "sphere") {
        console.log("added sphere");
    } else if (objectType == "cone") {
        console.log("added cone");
    } else if (objectType == "cylinder") {
        console.log("added cylinder");
    }

    resetControls();
}

function addPoint(x, y) {
    var posX = 2 * (x - canvas.getBoundingClientRect().left) / (canvas.width) - 1.0;
    var posY = 1.0 - 2 * (y - canvas.getBoundingClientRect().top) / canvas.height;
    //points.push(posX, posY);

    while (!arrayOfLines[current_index]) {
        arrayOfLines.push([]);
    }

    var red = document.getElementById("color_r").value;
    var green = document.getElementById("color_g").value;
    var blue = document.getElementById("color_b").value;
    var alpha = document.getElementById("color_a").value;

    arrayOfLines[current_index].push(posX, posY, red / 255, green / 255, blue / 255, alpha / 255);
}

function clear() {
    arrayOfLines = [];
    arrayOfLineWidths = [];
    current_index = -1;
//    render();
}

function render() {
    window.requestAnimFrame(render, canvas);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    selectedObject.draw();
}