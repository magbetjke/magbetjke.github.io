var gl;
var canvas;

var vertexBufferId;
var indexBufferId;

var transform_loc;
var color_loc;

var viewTransform;
var projectionTransform;

var selectedObject;

var show_hits = false;
var uiColor = vec4(255, 255, 255, 255);
var uiPosition = vec3(0, 0, 0);
var uiScale = vec3(1, 1, 1);
var uiRotation = vec3(0, 0, 0);
var drawable = [];

//Drawable class
function Drawable(type, tessellationLevel) {
    this.type = type;
    this.tesselationLevel = tessellationLevel;
    this.color = [1, 1, 1, 1];
    this.outlineColor = [0.2, 0.2, 0.2, 1.0];
    this.selectedOutlineColor = [0.5, 0.1, 0.1, 1.0];
    this.selected = false;
    this.vertices = [];
    this.indexes = [];
    this.outlineIndexes = [];
    this.currentIndex = 0;
    this.transform = [];
    this.scale = [1.0, 1.0, 1.0];
    this.rotation = [0, 0, 0];
    this.position = [0, 0, 0];
    this.originalWidth = 1;
    this.originalHeight = 1;
    this.bounds = [];

    this.getMiddlePoint = function(a, b) {
        return mix(a, b, 0.5);
    }

    this.validate = function(point) {
        if (this.type == "sphere") {
            var length = Math.sqrt(point[0] * point[0] + point[1] * point[1] + point[2] * point[2]);
            point[0] /= length * 0.5;
            point[1] /= length * 0.5;
            point[2] /= length * 0.5;
        }

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

            this.originalWidth = 4;
            this.originalHeight = 4;

            var c = 1.0;
            points.push(vec3(-c, t, 0));
            points.push(vec3(c, t, 0));
            points.push(vec3(-c, -t, 0));
            points.push(vec3(c, -t, 0));

            points.push(vec3(0, -c, t));
            points.push(vec3(0, c, t));
            points.push(vec3(0, -c, -t));
            points.push(vec3(0, c, -t));

            points.push(vec3(t, 0, -c));
            points.push(vec3(t, 0, c));
            points.push(vec3(-t, 0, -c));
            points.push(vec3(-t, 0, c));

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

        } else if (this.type == "cone") {

            var points = [];

            var top = 0.5;
            var bottom = -0.5;

            points.push(vec3(0, top, 0)); //top
            points.push(vec3(0, bottom, 0)); //bottom

            var vertex_count = tessellationLevel + 3;
            var angle = 0;
            for (var i = 0; i != vertex_count; ++i) {
                angle = (Math.PI * 2 / (vertex_count)) * i;

                var x = 0.5 * Math.cos(angle);
                var z = -0.5 * Math.sin(angle);

                points.push(vec3(x, bottom, z));
            }

            for (var i = 2; i < points.length - 1; ++i) {
                this.addTriangle(points[i], points[0], points[i + 1]);
                this.addTriangle(points[i], points[1], points[i + 1]);
            }

            this.addTriangle(points[points.length - 1], points[0], points[2]);
            this.addTriangle(points[points.length - 1], points[1], points[2]);
        } else if (this.type == "cylinder") {

            var points = [];

            var top = 0.5;
            var bottom = -0.5;

            points.push(vec3(0, top, 0)); //top
            points.push(vec3(0, bottom, 0)); //bottom

            var top_points = [];
            var bottom_points = [];

            var vertex_count = tessellationLevel + 3;
            var angle = 0;
            for (var i = 0; i != vertex_count; ++i) {
                angle = (Math.PI * 2 / (vertex_count)) * i;

                var x = 0.5 * Math.cos(angle);
                var z = -0.5 * Math.sin(angle);

                top_points.push(vec3(x, top, z));
                bottom_points.push(vec3(x, bottom, z));
            }

            for (var i = 0; i < top_points.length - 1; ++i) {
                this.addTriangle(top_points[i], top_points[i + 1], points[0]); //top triangle
                this.addTriangle(bottom_points[i], bottom_points[i + 1], points[1]); //bottom triangle

                this.addTriangle(top_points[i], top_points[i + 1], bottom_points[i + 1]); //quad part
                this.addTriangle(bottom_points[i], bottom_points[i + 1], top_points[i]); //quad part
            }


            this.addTriangle(top_points[top_points.length - 1], top_points[0], points[0]); //top triangle
            this.addTriangle(bottom_points[bottom_points.length - 1], bottom_points[0], points[1]); //bottom triangle

            this.addTriangle(top_points[top_points.length - 1], top_points[0], bottom_points[0]); //quad part
            this.addTriangle(bottom_points[bottom_points.length - 1], bottom_points[0], top_points[top_points.length - 1]); //quad part
        }

        this.updateTransform();
    };

    this.updateTransform = function() {
        var rotateX = rotate(this.rotation[0], [1, 0, 0]);
        var rotateY = rotate(this.rotation[1], [0, 1, 0]);
        var rotateZ = rotate(this.rotation[2], [0, 0, 1]);
        var rotationMatrix = mult(mult(rotateX, rotateY), rotateZ);
        var translationMatrix = translate(this.position);
        var scaleMatrix = scalem(this.scale);

        var new_width_half = this.originalWidth * this.scale[0] * 0.5;
        var new_height_half = this.originalHeight * this.scale[1] * 0.5;
        this.bounds = [
            this.position[0] - new_width_half
            , this.position[1] - new_height_half
            , parseFloat(this.position[0]) + new_width_half //oh, bother!
            , parseFloat(this.position[1]) + new_height_half
        ];

        this.transform = mult(mult(mult(mult(projectionTransform, viewTransform), translationMatrix), rotationMatrix), scaleMatrix);
    }

    this.draw = function() {
        gl.uniformMatrix4fv(transform_loc, false, flatten(this.transform));

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(this.vertices));

        //draw frame
        gl.uniform4fv(color_loc, this.selected ? this.selectedOutlineColor : this.outlineColor);

        gl.lineWidth(1);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, new Uint16Array(this.outlineIndexes));

        gl.polygonOffset(0.0, 0.0);
        gl.drawElements(gl.LINES, this.outlineIndexes.length, gl.UNSIGNED_SHORT, 0);

        //draw filled
        gl.uniform4fv(color_loc, this.color);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, new Uint16Array(this.indexes));

        gl.polygonOffset(1.0, 2.0);
        gl.drawElements(gl.TRIANGLES, this.indexes.length, gl.UNSIGNED_SHORT, 0);

        //draw hit zone
        if (show_hits) {
            gl.disable(gl.DEPTH_TEST);

            gl.uniform4fv(color_loc, [0.0, 0.3, 0.4, 0.3]);
            gl.uniformMatrix4fv(transform_loc, false, flatten(mult(projectionTransform, viewTransform)));

            var bounds = [
                vec3(this.bounds[0], this.bounds[1], 0),
                vec3(this.bounds[0], this.bounds[3], 0),
                vec3(this.bounds[2], this.bounds[3], 0),
                vec3(this.bounds[2], this.bounds[1], 0)

            ];

            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(bounds));

            gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
            gl.enable(gl.DEPTH_TEST);
        }

    };

    this.initialize();
}
//===

function setProjectionMode(projection) {
    console.log(projection);

    if (projection == "perspective") {
        viewTransform = lookAt(
            vec3(0.0, 0.0, 20.0) //eye
            ,vec3(0.0, 0.0, 0.0) //at
            ,vec3(0.0, 1.0, 0.0) //up
        );

        console.log("yo");
        projectionTransform = perspective(60, 1, 10, -50);
    } else {
        viewTransform = lookAt(
            vec3(0.0, 0.0, 1.0) //eye
            ,vec3(0.0, 0.0, 0.0) //at
            ,vec3(0.0, 1.0, 0.0) //up
        );

        projectionTransform = ortho(-10.0, 10.0, -10.0, 10.0, 10.0, -10.0);
    }

    for (var i = 0; i != drawable.length; ++i) {
        drawable[i].updateTransform();
    }
}

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

    setProjectionMode("orthographic");

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

      canvas.addEventListener("mousedown", function(event){
      		mouse_pressed = true;

      		checkHit(event.clientX, event.clientY);

      		event.preventDefault();

    });

    document.getElementById("add_object").onclick = function (event) {
        createObject(document.getElementById("object_picker").value);
    };

    document.getElementById("projection_type").onchange = function (event) {
        var target = event.target || event.srcElement;
        var projection = target.value;

        setProjectionMode(projection);
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

    document.getElementById("are_hit_zones_visible").onchange = function(event) {
        var target = event.target || event.srcElement;
        show_hits = target.checked;
        render();
    };

    resetControls(null);

    var cylinder = new Drawable("cylinder", 20);
    cylinder.position = [0, 5, 0];
    cylinder.scale = [3, 3, 3];
    cylinder.updateTransform();
    drawable.push(cylinder);

    var sphere = new Drawable("sphere", 2);
    sphere.scale = [1, 1, 1];
    sphere.position = [-5, -5, 0];
    sphere.updateTransform();
    drawable.push(sphere);

    var cone = new Drawable("cone", 20);
    cone.position = [5, -5, -5];
    cone.scale = [3, 3, 3];
    cone.updateTransform();
    drawable.push(cone);

    selectObject(sphere);

    render();
}

function checkHit(x, y) {
    var posX = 2 * (x - canvas.getBoundingClientRect().left) / (canvas.width) - 1.0;
    var posY = 1.0 - 2 * (y - canvas.getBoundingClientRect().top) / canvas.height;

    posX *= 10;
    posY *= 10;

    console.log(posX);
    for (var i = 0; i != drawable.length; ++i) {
        var rect = drawable[i].bounds;
        if (posX >= rect[0] && posX <= rect[2] && posY >= rect[1] && posY <= rect[3]) {
            selectObject(drawable[i]);
            break;
        }
    }
}

function resetControls(selected) {
    //color
    if (selected) {
        uiColor[0] = selected.color[0] * 255.0;
        uiColor[1] = selected.color[1] * 255.0;
        uiColor[2] = selected.color[2] * 255.0;
        uiColor[3] = selected.color[3] * 255.0;
    } else {
        uiColor = vec4(255, 255, 255, 255);
    }
    document.getElementById("color_r").value = uiColor[0];
    document.getElementById("color_r_value").innerHTML = uiColor[0];

    document.getElementById("color_g").value = uiColor[1];
    document.getElementById("color_g_value").innerHTML = uiColor[1];

    document.getElementById("color_b").value = uiColor[2];
    document.getElementById("color_b_value").innerHTML = uiColor[2];

    //position
    uiPosition = selected ? selected.position : vec3(0, 0, 0);
    document.getElementById("position_x").value = selected ? selected.position[0] : 0;
    document.getElementById("position_x_value").innerHTML = selected ? "" + selected.position[0] :"0";

    document.getElementById("position_y").value = selected ? selected.position[1] : 0;
    document.getElementById("position_y_value").innerHTML = selected ? "" + selected.position[1] :"0";

    document.getElementById("position_z").value = selected ? selected.position[2] : 0;
    document.getElementById("position_z_value").innerHTML = selected ? "" + selected.position[2] :"0";

    //scale
    uiScale = selected ? selected.scale : vec3(1, 1, 1);
    document.getElementById("scale_x").value = selected ? selected.scale[0] : 1;
    document.getElementById("scale_x_value").innerHTML = selected ? "" + selected.scale[0] : "1";

    document.getElementById("scale_y").value = selected ? selected.scale[1] : 1;
    document.getElementById("scale_y_value").innerHTML = selected ? "" + selected.scale[1] : "1";

    document.getElementById("scale_z").value = selected ? selected.scale[2] : 1;
    document.getElementById("scale_z_value").innerHTML = selected ? "" + selected.scale[2] : "1";

    //rotation
    uiRotation = selected ? selected.rotation : vec3(0, 0, 0);
    document.getElementById("rotation_x").value = selected ? selected.rotation[0] : 0;
    document.getElementById("rotation_x_value").innerHTML = selected ? "" + selected.rotation[0] : "0";

    document.getElementById("rotation_y").value = selected ? selected.rotation[1] : 0;
    document.getElementById("rotation_y_value").innerHTML = selected ? "" + selected.rotation[1] : "0";

    document.getElementById("rotation_z").value = selected ? selected.rotation[2] : 0;
    document.getElementById("rotation_z_value").innerHTML = selected ? "" + selected.rotation[2] : "0";
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

function selectObject(obj) {
    if (selectedObject) {
        selectedObject.selected = false;
    }

    selectedObject = obj;

    if (selectedObject) {
        selectedObject.selected = true;
    }

    resetControls(obj);
}

function createObject(objectType) {
    if (objectType == "sphere") {
        var sphere = new Drawable("sphere", 2);
        sphere.updateTransform();
        drawable.push(sphere);
        selectObject(sphere);
//        console.log("added sphere");
    } else if (objectType == "cone") {
        var cone = new Drawable("cone", 20);
        cone.scale = [3, 3, 3];
        cone.updateTransform();
        drawable.push(cone);
        selectObject(cone);
//        console.log("added cone");
    } else if (objectType == "cylinder") {
//        console.log("added cylinder");
        var cylinder = new Drawable("cylinder", 20);
        cylinder.scale = [3, 3, 3];
        cylinder.updateTransform();
        drawable.push(cylinder);
        selectObject(cylinder);
    }
}

function clear() {
    drawable = [];
//    render();
}

function render() {
    window.requestAnimFrame(render, canvas);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    for (var i = 0; i != drawable.length; ++i) {
        drawable[i].draw();
    }
}