var gl;
var canvas;

var vertexBufferId;
var normalsBufferId;
var indexBufferId;

var projection_loc;
var transform_loc;
var view_loc;
var color_loc;
var ambient_loc;
var diffuse_loc;
var specular_loc;
var shininess_loc;
var lightpos_loc;

var viewTransform;
var projectionTransform;
var currentProjection;
var arrayOfLights =[];

var lightProgram;

var selectedObject;

//lights
var directionalEnabled = true;
var directionalAnimated = true;
var directionalLight;

var pointLightEnabled = true;
var pointLightAnimated = true;
var pointLight;

var show_hits = false;
var uiColor = vec4(255, 255, 255, 255);
var uiPosition = vec3(0, 0, 0);
var uiScale = vec3(1, 1, 1);
var uiRotation = vec3(0, 0, 0);
var drawable = [];

function LightSource(position, ambient, diffuse, specular) {
    this.position = position;
    this.ambient = ambient;
    this.diffuse = diffuse;
    this.specular = specular;
}

//Drawable class
function Drawable(type, tessellationLevel) {
    this.type = type;
    this.tesselationLevel = tessellationLevel;
    this.color = [1, 1, 1, 1];
    this.outlineColor = [0.2, 0.2, 0.2, 1.0];
    this.selectedOutlineColor = [0.5, 0.1, 0.1, 1.0];
    this.selected = false;
    this.vertices = [];
    this.normals = [];
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
    this.aabb = [];
    this.currentAABB = [];
    this.aabbIndecies = new Uint16Array([
        0, 1, 3, 2, 0, 4, 5, 1, 3, 7, 5, 4, 6, 7, 3, 2, 6
    ]);

    //material properties
    this.ambient = vec4(1.0, 1.0, 1.0, 1.0);
    this.diffuse = vec4(1.0, 0.8, 0.0, 1.0);
    this.specular = vec4(1.0, 1.0, 1.0, 1.0);
    this.shininess = 100.0;

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

        a = this.validate(a);
        b = this.validate(b);
        c = this.validate(c);


        this.vertices.push(a, b, c);

        if (this.type == "sphere") {
            this.normals.push(normalize(subtract(a, vec3(0, 0, 0))));
            this.normals.push(normalize(subtract(b, vec3(0, 0, 0))));
            this.normals.push(normalize(subtract(c, vec3(0, 0, 0))));
        } else {
            var normal = normalize(cross(subtract(a, c), subtract(a, b)));
            this.normals.push(normal);
            this.normals.push(normal);
            this.normals.push(normal);
        }

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
            this.addTriangle(a, c, b);
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

            this.aabb = makeAABB(4, 4, 4, 0, 0, 0);

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

                var x = -0.5 * Math.cos(angle);
                var z = 0.5 * Math.sin(angle);

                points.push(vec3(x, bottom, z));
            }

            for (var i = 2; i < points.length - 1; ++i) {
                this.addTriangle(points[i], points[0], points[i + 1]);
                this.addTriangle(points[i], points[i + 1], points[1]);
            }

            this.addTriangle(points[points.length - 1], points[0], points[2]);
            this.addTriangle(points[points.length - 1], points[2], points[1]);

            this.aabb = makeAABB(1, 1, 1, 0, 0, 0);
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

                var x = -0.5 * Math.cos(angle);
                var z = 0.5 * Math.sin(angle);

                top_points.push(vec3(x, top, z));
                bottom_points.push(vec3(x, bottom, z));
            }

            for (var i = 0; i < top_points.length - 1; ++i) {
                this.addTriangle(top_points[i], points[0], top_points[i + 1]); //top triangle
                this.addTriangle(bottom_points[i], bottom_points[i + 1], points[1]); //bottom triangle

                this.addTriangle(top_points[i], top_points[i + 1], bottom_points[i + 1]); //quad part
                this.addTriangle(bottom_points[i], top_points[i], bottom_points[i + 1]); //quad part
            }


            this.addTriangle(top_points[top_points.length - 1], points[0], top_points[0]); //top triangle
            this.addTriangle(bottom_points[bottom_points.length - 1], bottom_points[0], points[1]); //bottom triangle

            this.addTriangle(top_points[top_points.length - 1], top_points[0], bottom_points[0]); //quad part
            this.addTriangle(bottom_points[bottom_points.length - 1], top_points[top_points.length - 1], bottom_points[0]); //quad part

            this.aabb = makeAABB(1, 1, 1, 0, 0, 0);
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


        var model = mult(mult(translationMatrix, rotationMatrix), scaleMatrix);
        var modeView = mult(viewTransform, model);
//        this.transform = mult(projectionTransform, modelView);
        this.transform = model;

        //recalculation of aabb
        var size = this.aabb.length;
        var transformedAABB = [];
        for (var i = 0; i != size; ++i) {
            transformedAABB.push(multVec4ByMat4(vec4(this.aabb[i][0], this.aabb[i][1], this.aabb[i][2], 1.0), modeView));
        }

        var minX = transformedAABB[0][0];
        var minY = transformedAABB[0][1];
        var minZ = transformedAABB[0][2];
        var maxX = transformedAABB[0][0];
        var maxY = transformedAABB[0][1];
        var maxZ = transformedAABB[0][2];

        for (var i = 1; i != size; ++i) {

            if (minX > transformedAABB[i][0]) {
                minX = transformedAABB[i][0];
            } else if (maxX < transformedAABB[i][0]) {
                maxX = transformedAABB[i][0];
            }

            if (minY > transformedAABB[i][1]) {
                minY = transformedAABB[i][1];
            } else if (maxY < transformedAABB[i][1]) {
                maxY = transformedAABB[i][1];
            }

            if (minZ > transformedAABB[i][2]) {
                minZ = transformedAABB[i][2];
            } else if (maxZ < transformedAABB[i][2]) {
                maxZ = transformedAABB[i][2];
            }
        }

        this.currentAABB[0] = vec3(minX, minY, maxZ);
        this.currentAABB[1] = vec3(minX, maxY, maxZ);
        this.currentAABB[2] = vec3(maxX, minY, maxZ);
        this.currentAABB[3] = vec3(maxX, maxY, maxZ);
        this.currentAABB[4] = vec3(minX, minY, minZ);
        this.currentAABB[5] = vec3(minX, maxY, minZ);
        this.currentAABB[6] = vec3(maxX, minY, minZ);
        this.currentAABB[7] = vec3(maxX, maxY, minZ);
    }

    this.draw = function() {
        gl.uniformMatrix4fv(transform_loc, false, flatten(this.transform));
        gl.uniformMatrix4fv(view_loc, false, flatten(viewTransform));
        gl.uniformMatrix4fv(projection_loc, false, flatten(projectionTransform));

        gl.uniform4fv(ambient_loc, this.ambient);
        gl.uniform4fv(diffuse_loc, this.diffuse);
        gl.uniform4fv(specular_loc, this.specular);
        gl.uniform1f(shininess_loc, this.shininess);
//        gl.uniform4fv(lightpos_loc, directionalLight.position);

        gl.uniform4fv(gl.getUniformLocation(lightProgram, "lightPositions[0]"), multVec4ByMat4(pointLight.position, viewTransform));
        gl.uniform4fv(gl.getUniformLocation(lightProgram, "uLights[0].ambient"), pointLightEnabled ? pointLight.ambient : vec4(0, 0, 0, 0));
        gl.uniform4fv(gl.getUniformLocation(lightProgram, "uLights[0].diffuse"), pointLightEnabled ? pointLight.diffuse : vec4(0, 0, 0, 0));
        gl.uniform4fv(gl.getUniformLocation(lightProgram, "uLights[0].specular"), pointLightEnabled ? pointLight.specular : vec4(0, 0, 0, 0));

        gl.uniform4fv(gl.getUniformLocation(lightProgram, "lightPositions[1]"), multVec4ByMat4(directionalLight.position, viewTransform));
        gl.uniform4fv(gl.getUniformLocation(lightProgram, "uLights[1].ambient"), directionalEnabled ? directionalLight.ambient : vec4(0, 0, 0, 0));
        gl.uniform4fv(gl.getUniformLocation(lightProgram, "uLights[1].diffuse"), directionalEnabled ? directionalLight.diffuse : vec4(0, 0, 0, 0));
        gl.uniform4fv(gl.getUniformLocation(lightProgram, "uLights[1].specular"), directionalEnabled ? directionalLight.specular : vec4(0, 0, 0, 0));



        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(this.vertices));

        gl.bindBuffer(gl.ARRAY_BUFFER, normalsBufferId);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(this.normals));


        //draw frame
//        gl.uniform4fv(color_loc, this.selected ? this.selectedOutlineColor : this.outlineColor);

//        console.log(JSON.stringify(multVec4ByMat4(light.position, viewTransform)));



//        gl.lineWidth(1);
//
//        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
//        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, new Uint16Array(this.outlineIndexes));
//
//        gl.polygonOffset(0.0, 0.0);
//        gl.drawElements(gl.LINES, this.outlineIndexes.length, gl.UNSIGNED_SHORT, 0);

        //draw filled
        gl.uniform4fv(color_loc, this.color);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, new Uint16Array(this.indexes));

//        gl.polygonOffset(1.0, 2.0);
        gl.drawElements(gl.TRIANGLES, this.indexes.length, gl.UNSIGNED_SHORT, 0);

        //draw hit zone
/*        if (show_hits) {
            gl.disable(gl.DEPTH_TEST);

            gl.uniform4fv(color_loc, [0.0, 0.3, 0.4, 0.3]);
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
        }*/

        if (show_hits) { //todo other shader program
            gl.lineWidth(2);
            gl.uniform4fv(color_loc, [0.0, 0.8, 0.2, 0.8]);
            gl.uniformMatrix4fv(transform_loc, false, flatten(projectionTransform));

            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(this.currentAABB));

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
            gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, this.aabbIndecies);

            gl.drawElements(gl.LINE_STRIP, this.aabbIndecies.length, gl.UNSIGNED_SHORT, 0);
        }

    };

    this.initialize();
}
//===

function multVec4ByMat4(v, m) {
    var result = [];
    for ( var i = 0; i < v.length; ++i ) {
        var sum = 0.0;
        for ( var j = 0; j < m.length; ++j ) {
            sum += v[j] * m[i][j];
        }
        result.push(sum);
    }

    return result;
}


function makeAABB(width, height, depth, centerX, centerY, centerZ) {
    return [
        vec3(centerX - width * 0.5, centerY - height * 0.5, centerZ + depth * 0.5)
        , vec3(centerX - width * 0.5, centerY + height * 0.5, centerZ + depth * 0.5)
        , vec3(centerX + width * 0.5, centerY - height * 0.5, centerZ + depth * 0.5)
        , vec3(centerX + width * 0.5, centerY + height * 0.5, centerZ + depth * 0.5)
        , vec3(centerX - width * 0.5, centerY - height * 0.5, centerZ - depth * 0.5)
        , vec3(centerX - width * 0.5, centerY + height * 0.5, centerZ - depth * 0.5)
        , vec3(centerX + width * 0.5, centerY - height * 0.5, centerZ - depth * 0.5)
        , vec3(centerX + width * 0.5, centerY + height * 0.5, centerZ - depth * 0.5)
    ];
}

function setProjectionMode(projection) {
    console.log(projection);

    if (projection == "perspective") {
        viewTransform = lookAt(
            vec3(0.0, 0.0, 15.0) //eye
            ,vec3(0.0, 0.0, 0.0) //at
            ,vec3(0.0, 1.0, 0.0) //up
        );

        projectionTransform = perspective(70, 1, 0.1, 50);
    } else {
        viewTransform = lookAt(
            vec3(0.0, 0.0, 10.0) //eye
            ,vec3(0.0, 0.0, 0.0) //at
            ,vec3(0.0, 1.0, 0.0) //up
        );

        projectionTransform = ortho(-10.0, 10.0, -10.0, 10.0, -100.0, 100.0);
    }

    currentProjection = projection;

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

    lightProgram = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(lightProgram);

    projection_loc = gl.getUniformLocation(lightProgram, "uProjection");
    view_loc = gl.getUniformLocation(lightProgram, "uViewTransform");
    transform_loc = gl.getUniformLocation(lightProgram, "uTransform");
    color_loc = gl.getUniformLocation(lightProgram, "uColor");
    ambient_loc = gl.getUniformLocation(lightProgram, "uAmbient");
    diffuse_loc = gl.getUniformLocation(lightProgram, "uDiffuse");
    specular_loc = gl.getUniformLocation(lightProgram, "uSpecular");
    shininess_loc = gl.getUniformLocation(lightProgram, "uShininess");
    lightpos_loc = gl.getUniformLocation(lightProgram, "lightPosition");
    // Load the data into the GPU

    vertexBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, 16 * 2048 * 4, gl.DYNAMIC_DRAW);

    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation(lightProgram, "vPosition");
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 12, 0);

    gl.enableVertexAttribArray(0);

    normalsBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalsBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, 16 * 2048 * 4, gl.DYNAMIC_DRAW);

    var vNormal = gl.getAttribLocation(lightProgram, "vNormal");
    gl.enableVertexAttribArray(vNormal);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 12, 0);

    gl.enableVertexAttribArray(0);

    indexBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 16 * 2048, gl.DYNAMIC_DRAW);

//    var vColor = gl.getAttribLocation(lightProgram, "vColor");
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
    };

    document.getElementById("directional_enabled").checked = directionalEnabled;
    document.getElementById("directional_enabled").onchange = function(event) {
        var target = event.target || event.srcElement;
        directionalEnabled = target.checked;
    };

    document.getElementById("directional_animated").checked = directionalAnimated;
    document.getElementById("directional_animated").onchange = function(event) {
        var target = event.target || event.srcElement;
        directionalAnimated = target.checked;
    };

    document.getElementById("point_enabled").checked = pointLightEnabled;
    document.getElementById("point_enabled").onchange = function(event) {
        var target = event.target || event.srcElement;
        pointLightEnabled = target.checked;
    };

    document.getElementById("point_animated").checked = pointLightAnimated;
    document.getElementById("point_animated").onchange = function(event) {
        var target = event.target || event.srcElement;
        pointLightAnimated = target.checked;
    };

    resetControls(null);

    var cylinder = new Drawable("cylinder", 30);
    cylinder.position = [5, 0, 0];
    cylinder.scale = [3, 3, 3];
    cylinder.color = [0.0, 0.0, 1.0, 1.0];
    cylinder.updateTransform();
    drawable.push(cylinder);

    var sphere = new Drawable("sphere", 3);
    sphere.scale = [1, 1, 1];
    sphere.position = [-5, 0, 0];
    sphere.color = [1.0, 0.0, 0.0, 1.0];
    sphere.updateTransform();
    drawable.push(sphere);

    var cone = new Drawable("cone", 30);
    cone.position = [0, 0, 0];
    cone.scale = [3, 3, 3];
    cone.color = [0.0, 1.0, 0.0, 1.0];
    cone.updateTransform();
    drawable.push(cone);

    selectObject(sphere);

    //add lights

    directionalLight = new LightSource(
        vec4(0.0, 20.0, 20.0, 0.0)
        , vec4(0.2, 0.2, 0.2, 1.0)
        , vec4(0.8, 0.8, 0.8, 1.0)
        , vec4(1.0, 1.0, 1.0, 1.0)
    );

    pointLight = new LightSource(
        vec4(0.0, 20.0, 20.0, 1.0)
        , vec4(0.2, 0.2, 0.2, 1.0)
        , vec4(1.0, 1.0,1.0, 1.0)
        , vec4(1.0, 1.0, 1.0, 1.0)
    );

//    arrayOfLights.push(light);

    render();
}

var ray = null;
var ray0;
var ray1;

function checkHit(x, y) {
    var posX = 2 * (x - canvas.getBoundingClientRect().left) / (canvas.width) - 1.0;
    var posY = 1.0 - 2 * (y - canvas.getBoundingClientRect().top) / canvas.height;

    posX *= 10;
    posY *= 10;

    if (currentProjection == "orthographic") {
        for (var i = 0; i != drawable.length; ++i) {
            var aabb = drawable[i].currentAABB;
            if (posX >= aabb[0][0] && posX <= aabb[3][0] && posY >= aabb[0][1] && posY <= aabb[3][1]) {
                selectObject(drawable[i]);
                break;
            }
        }
    } else {
        ray0 = vec3(0, 0, 20);
//        ray0 = vec3(posX, posY, 10);
        ray1 = vec3(posX, posY, -30);
        ray = ray1 - ray0;

        ray = subtract(ray1, ray0);

//        ray1 = add(ray0, mult(ray, vec3(5, 5, 5)));
        console.log(ray);
        for (var i = 0; i != drawable.length; ++i) {
            if (intersects(drawable[i].currentAABB, ray0, ray)) {
                selectObject(drawable[i]);
                break;
            }
        }
    }
}

function intersects(aabb, rayOrigin, rayDir) {
    var tmin = -Infinity;
    var tmax = Infinity;
    for (var i = 0; i < 3; ++i) {
        if (rayDir[i] != 0.0) {
            console.log(JSON.stringify(aabb));
            var t1 = (aabb[0][i] - rayOrigin[i])/rayDir[i];
            var t2 = (aabb[7][i] - rayOrigin[i])/rayDir[i];
            console.log(rayDir[i]);
            console.log(rayOrigin[i]);
            tmin = Math.max(tmin, Math.min(t1, t2));
            tmax = Math.min(tmax, Math.max(t1, t2));
        } else if (rayOrigin[i] <= aabb[0][i] || rayOrigin[i] >= aabb[7][i]) {
            console.log("intersects false");
            return false;
        }
    }
    console.log(tmax + " " + tmin + "tmax");
    return tmax > tmin && tmax > 0.0;
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
        var sphere = new Drawable("sphere", 3);
        sphere.updateTransform();
        drawable.push(sphere);
        selectObject(sphere);
//        console.log("added sphere");
    } else if (objectType == "cone") {
        var cone = new Drawable("cone", 30);
        cone.scale = [3, 3, 3];
        cone.updateTransform();
        drawable.push(cone);
        selectObject(cone);
//        console.log("added cone");
    } else if (objectType == "cylinder") {
//        console.log("added cylinder");
        var cylinder = new Drawable("cylinder", 30);
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

var frameNumber = 0;

var directionFrameNumber = 0;
var pointFrameNumber = 0;

function render() {
    window.requestAnimFrame(render, canvas);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    for (var i = 0; i != drawable.length; ++i) {
        drawable[i].draw();
    }

/*    if (ray != null) {
        gl.lineWidth(2);
        gl.uniform4fv(color_loc, [0.8, 0.2, 0.2, 0.8]);
        gl.uniformMatrix4fv(transform_loc, false, flatten(projectionTransform));

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten([ray0[0], ray0[1], ray0[2], ray1[0], ray1[1], ray1[2]]));

//        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferId);
//        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, this.aabbIndecies);
        console.log("draw ray");
        gl.drawArrays(gl.LINE_STRIP, 0, 2);
//        gl.drawElements(gl.LINE_STRIP, this.aabbIndecies.length, gl.UNSIGNED_SHORT, 0);
    }*/

//
//    gl.uniform4fv(color_loc, [0.8, 0.2, 0.2, 0.8]);
//    gl.uniformMatrix4fv(transform_loc, false, flatten(mult(projectionTransform, viewTransform)));
//
//    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
//    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(pointLight.position));
//    gl.drawArrays(gl.POINTS, 0, 1);

    var angle;
    if (directionalAnimated) {
        angle = (directionFrameNumber % 360) * Math.PI / 180;
        directionalLight.position = vec4(Math.cos(angle) * 1000, Math.sin(angle) * 1000, -1000, 1.0);
        ++directionFrameNumber;
    }

    if (pointLightAnimated) {
        angle = (pointFrameNumber % 360) * Math.PI / 180;
        pointLight.position = vec4(Math.cos(angle) * 100, 20, -100, 1.0);
        ++pointFrameNumber;
    }

}