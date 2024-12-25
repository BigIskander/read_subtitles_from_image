import * as THREE from 'three';
import { Line2 } from 'jsm/lines/Line2.js';
import { LineMaterial } from 'jsm/lines/LineMaterial.js';
import { LineGeometry } from 'jsm/lines/LineGeometry.js';

var camera, scene, renderer, clock, renderTarget, sceneRTT;
var clicked = false;
// var uniforms;

// function load_shader(file_url) {
//     return new Promise((resolve, reject) => {
//         try {
//             fetch(file_url).then(
//                 (response) => response.text()).then((data) => { resolve(data); }
//             );
//         } catch(error) {
//             reject(error);
//         }
//     });
// }

// var vertexShader = await load_shader("./shader.vert");
// var fragmentShader = await load_shader("/shader.frag");

var canvas = document.querySelector("#main_canvas");
var canvasWidth = parseInt(window.getComputedStyle(canvas).width); // in pixels
var canvasHeight = parseInt(window.getComputedStyle(canvas).height); // in pixels
var clearColor = 0x333333;
var mesh;
var meshRTT;
var meshTexture;
var circleMesh = [];
var clicked = [false, false, false, false];
var circleMeshRadius = 0.03;
var circleMeshColor = 0xff00ff;
var circleMeshColorHighlight = 0x00ffff;
var buffer;
var cutGeometry;
var cutLineColor = 0xff0000;
var cutLineWidth = 7;
// optimization
var postponedFrame = false;
var frameTime = 0.032; // in seconds (0.016 ~ 60FPS; 0.032 ~ 30FPS)
// color picker mode
var isColorPicker = false;
var colorPicker = document.querySelector("#subtitles_color");

function init() {
    camera = new THREE.Camera();
    camera.position.z = 0.001;

    scene = new THREE.Scene();
    clock = new THREE.Clock();

    var geometry = new THREE.PlaneGeometry(0, 0);
    var circle = new THREE.RingGeometry(circleMeshRadius - 0.005, circleMeshRadius, 32);

    // uniforms = {
    //     u_time: { type: "f", value: 1.0 },
    //     u_resolution: { type: "v2", value: new THREE.Vector2() },
    //     u_mouse: { type: "v2", value: new THREE.Vector2() }
    // };

    // var material = new THREE.ShaderMaterial({
    //     uniforms: uniforms,
    //     vertexShader: vertexShader,
    //     fragmentShader: fragmentShader
    // });
    
    meshTexture = new THREE.Texture();
    mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: meshTexture }));
    scene.add(mesh);
    for(let i = 0; i < 4; i++) {
        circleMesh[i] = new THREE.Mesh(circle, new THREE.MeshBasicMaterial({ color: circleMeshColor }));
        circleMesh[i].position.x += -0.1 + (i % 2) * 0.2;
        circleMesh[i].position.y += -0.1 + Math.floor(i / 2) * 0.2;
        scene.add(circleMesh[i]);
    }
    /*
    2   3
    0   1
    */
    // Cutting line
    buffer = ([
        //x    y    z
        -0.1, -0.1, 0.0, // 0
         0.1, -0.1, 0.0, // 1
         0.1,  0.1, 0.0, // 3
        -0.1,  0.1, 0.0, // 2
        -0.1, -0.1, 0.0  // 0
    ]);
    var cutGeometryMaterial = new LineMaterial({ color: cutLineColor, linewidth: cutLineWidth });
    cutGeometry = new LineGeometry();
    cutGeometry.setPositions(buffer); // this one
    const cutLine = new Line2(cutGeometry, cutGeometryMaterial);
    scene.add(cutLine);

    canvas.addEventListener("mousemove", onCanvasMouse);
    canvas.addEventListener("click", onCanvasClick);
    canvas.addEventListener("mouseleave", onMouseLeave);

    renderTarget = new THREE.WebGLRenderTarget(canvas.width, canvas.height, { 
        minFilter: THREE.LinearFilter, 
        magFilter: THREE.NearestFilter, 
        format: THREE.RGBAFormat, 
        type: THREE.FloatType
    });
    sceneRTT = new THREE.Scene();
    meshRTT = mesh.clone();
    sceneRTT.add(meshRTT);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas
    });
    renderer.setClearColor(clearColor);
    renderer.setPixelRatio(window.devicePixelRatio);

    // onWindowResize();
    // window.addEventListener('resize', onWindowResize, false);

    // document.onmousemove = function(e){
    //   uniforms.u_mouse.value.x = e.pageX
    //   uniforms.u_mouse.value.y = window.innerHeight - e.pageY
    // }

    // renderer.setAnimationLoop(render);
    render();
}

// function onWindowResize() {
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     uniforms.u_resolution.value.x = renderer.domElement.width;
//     uniforms.u_resolution.value.y = renderer.domElement.height;
// }

function getXY(event) {
    var bBox = canvas.getBoundingClientRect();
    var xc = bBox.left + window.scrollX;
    var yc = bBox.top + window.scrollY;
    var x = ((event.pageX - xc) / canvasWidth) * 2.0 - 1.0;
    var y = ((event.pageY - yc) / canvasHeight) * 2.0 - 1.0;
    y *= -1; // flip y
    return { x: x, y: y };
}

function isWithinCircle(event, circleID) {
    var xy = getXY(event);
    // measure distance to the center of circle
    var d = Math.pow(
        Math.pow(circleMesh[circleID].position.x - xy.x, 2.0) 
                    + Math.pow(circleMesh[circleID].position.y - xy.y, 2.0),
        0.5
    );
    // if mouse inside the circle
    if(d <= circleMeshRadius) return true;
    return false;
}

function applyConstraints(xy, circleID) {
    // do not go outside the bounderies
    if(xy.x < circleMeshRadius - 1) xy.x = circleMeshRadius - 1;
    if(xy.y < circleMeshRadius - 1) xy.y = circleMeshRadius - 1;
    if(xy.x > 1 - circleMeshRadius) xy.x = 1 - circleMeshRadius;
    if(xy.y > 1 - circleMeshRadius) xy.y = 1 - circleMeshRadius;
    // do not intersect paths
    /*
    2   3
    0   1
    */
    if(Math.floor(circleID / 2) == 0) { 
        if(xy.y > circleMesh[2].position.y - circleMeshRadius *2)
            xy.y = circleMesh[2].position.y - circleMeshRadius * 2;
    } else {
        if(xy.y < circleMesh[0].position.y + circleMeshRadius * 2)
            xy.y = circleMesh[0].position.y + circleMeshRadius * 2;
    }
    if(circleID % 2 == 0) {
        if(xy.x > circleMesh[3].position.x - circleMeshRadius * 2)
            xy.x = circleMesh[3].position.x - circleMeshRadius * 2;
    } else {
        if(xy.x < circleMesh[2].position.x + circleMeshRadius * 2)
            xy.x = circleMesh[2].position.x + circleMeshRadius * 2;
    }
    return xy;
}

function onCanvasMouse(event) {
    // color picker mode
    if(isColorPicker)
    {
        var xy = getXY(event);
        // convert from relative to pixel coordinates
        xy.x = parseInt(canvas.width * ((1.0 + xy.x) / 2.0));
        xy.y = parseInt(canvas.height * ((1.0 + xy.y) / 2.0));
        // console.log(xy)
        // read color of a pixel
        var color = new Float32Array(4);
        renderer.readRenderTargetPixels(renderTarget, xy.x, xy.y, 1, 1, color);
        // transform from 0 - 1 to 0 - 255
        color.forEach((value, index, arr) => { arr[index] = parseInt(value * 255); });
        colorPicker.style.backgroundColor = "rgba(" + color.join(", ") + ")";
        var gscale = 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];
        if(gscale < 128) var textColor = [255, 255, 255, 255];
        else var textColor = [0, 0, 0, 255];
        colorPicker.style.color = "rgba(" + textColor.join(", ") + ")";
        var colorMp = (value) => { 
            if(value < 10) return "&nbsp;&nbsp" + value;
            if(value < 100) return "&nbsp" + value;
            return "" + value;
        }
        colorPicker.innerHTML = "rgba(" + [...color].map(colorMp).join(", ") + ")";
        // console.log(color);
        return;
    }
    // usual mode
    let isClicked = false;
    let circleID = 0;
    for(let i = 0; i < 4; i++) {
        if(clicked[i]) {
            isClicked = true;
            circleID = i;
        }
    }
    if(isClicked) {
        // if clicked
        var xy = getXY(event);
        xy = applyConstraints(xy, circleID);
        // set position
        circleMesh[circleID].position.x = xy.x;
        circleMesh[circleID].position.y = xy.y;
        // adjust adjacent elements position
        /*
        2   3
        0   1
        */
        if(Math.floor(circleID / 2) == 0) {
            circleMesh[2 + circleID % 2].position.x = xy.x;
            circleMesh[1 - circleID % 2].position.y = xy.y;      
        } else {
            circleMesh[0 + circleID % 2].position.x = xy.x;
            circleMesh[3 - circleID % 2].position.y = xy.y;
        }
        // adjust the line
        buffer = ([
            //x    y    z
            circleMesh[0].position.x, circleMesh[0].position.y, 0.0, // 0
            circleMesh[1].position.x, circleMesh[1].position.y, 0.0, // 1
            circleMesh[3].position.x, circleMesh[3].position.y, 0.0, // 3
            circleMesh[2].position.x, circleMesh[2].position.y, 0.0, // 2
            circleMesh[0].position.x, circleMesh[0].position.y, 0.0, // 0
        ]);
        cutGeometry.setPositions(buffer);
    } else {
        // if mouse inside the circle
        let inCircle = false;
        for(let i = 0; i < 4; i++) {
            if(isWithinCircle(event, i)) {
                circleMesh[i].material.color.setHex(circleMeshColorHighlight);
                inCircle = true;
            } else {
                circleMesh[i].material.color.setHex(circleMeshColor);
            }
        }
        // pointer style
        if(inCircle) canvas.style.cursor = 'pointer';
        else canvas.style.cursor = 'default';
    }
    render();
}

function onCanvasClick(event) {
    // color picker mode
    if(isColorPicker) {
        isColorPicker = false;
        canvas.style.cursor = 'default';
        return;
    }
    // usual mode
    let isClicked = false;
    for(let i = 0; i < 4; i++) {
        if(clicked[i]) isClicked = true;
    }
    if(isClicked) {
        for(let i = 0; i < 4; i++) {
            clicked[i] = false;
        }
    } else {
        for(let i = 0; i < 4; i++) {
            if(isWithinCircle(event, i)) clicked[i] = true;
        }
    }
}

function onMouseLeave(event) {
    if(isColorPicker) return;
    canvas.style.cursor = 'default';
    for(let i = 0; i < 4; i++) {
        clicked[i] = false;
        circleMesh[i].material.color.setHex(circleMeshColor);
    }
    render();
}

function render(postponed = false) {
    // uniforms.u_time.value += clock.getDelta();
    var deltaTime = clock.getDelta();
    // circleMesh.position.x = 1;
    if(!postponed && postponedFrame) return;
    if(deltaTime > frameTime || postponed) {
        postponedFrame = false;
        // render here
        renderer.clear();
        // render to rendering target
        renderer.setRenderTarget(renderTarget);
        renderer.clear();
        renderer.render(sceneRTT, camera);
        // render to canvas
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
    } else {
        postponedFrame = true;
        setTimeout(() => { render(true); }, (frameTime - deltaTime) * 1000);
    }
    //console.log(16 - deltaTime * 1000);//
}

function updateImage(image) {
    // testImage.src = image.src;
    var aspectRatio = image.width / image.height;
    if(image.width > image.height) {
        var width = 2 - circleMeshRadius * 2;
        var height = width / aspectRatio;
    } else {
        var height = 2 - circleMeshRadius * 2;
        var width = height * aspectRatio;
    }
    mesh.geometry.dispose();
    meshRTT.geometry.dispose();
    var geometry = new THREE.PlaneGeometry(width, height);
    mesh.geometry = geometry;
    meshRTT.geometry = geometry;
    // geometry.parameters.height = 2 - circleMeshRadius * 2;
    // geometry.parameters.width = geometry.parameters.height * aspectRatio;
    // geometry.needsUpdate = true;
    console.log(mesh);
    console.log(aspectRatio);
    meshTexture.dispose();
    meshTexture.colorSpace = THREE.SRGBColorSpace;
    meshTexture.generateMipmaps = false;
    meshTexture.minFilter = THREE.LinearFilter;
    meshTexture.image = image; 
    console.log(meshTexture);
    meshTexture.needsUpdate = true;
    render();
    console.log(image); 
}

async function pasteAnImage() {
    try {
        const clipboardContents = await navigator.clipboard.read();
        for (const item of clipboardContents) {
            // check if it is an image
            if (item.types.includes("image/png")) {
                console.log("image");
                const blob = await item.getType("image/png");
                var image = new Image();
                // const testImage = document.querySelector("#test_image");
                image.onload = function() {
                    updateImage(image);
                };
                image.src = URL.createObjectURL(blob);
                // meshTexture.image = testImage;
                // meshTexture.needsUpdate = true;
            } else {
                alert("Not an image.");
            }
        }
        if(clipboardContents.length < 1) alert("Nothing in clipboard.");
    } catch (error) {
        alert(error.message);
        console.log(error.message);
    }
}

async function openAnImage(event) {
    console.log(event);
    if(event.target.files.length < 1) return;
    var imageFile = event.target.files[0];
    var supportedFileTypes = [
                'image/apng', 'image/avif', 'image/gif', 'image/jpeg', 
                'image/png', 'image/svg+xml',
                'image/webp', 'image/bmp', 'image/x-icon', 'image/tiff'
    ];
    if (!supportedFileTypes.includes(imageFile['type'])) {
        alert("Not an image.");
        return;
    }
    // if it is an image
    var filerdr = new FileReader();
    filerdr.onload = function(e) {
        var image = new Image();
        image.onload = function() {
            updateImage(image);
        }
        image.src = e.target.result;
    }
    filerdr.readAsDataURL(imageFile);
}

async function clearCanvas() {
    if(confirm("Clear?")) {
        mesh.geometry.dispose();
        var geometry = new THREE.PlaneGeometry(0, 0);
        mesh.geometry = geometry;
        meshTexture.dispose();
        meshTexture.needsUpdate = true;
        render();
    }
}

function pickSubtitlesColor() {
    isColorPicker = true;
    canvas.style.cursor = 'crosshair';
    // alert("Pick subtitles color.");
}

async function recognizeText() {
    alert("Recognize text from an image");
}

init();

export {
    pasteAnImage,
    openAnImage,
    clearCanvas,
    pickSubtitlesColor,
    recognizeText
}

// dinamic line geometry example
// https://codesandbox.io/p/sandbox/threejs-basic-example-forked-ygjt9o?file=%2Fsrc%2Findex.js%3A5%2C22
// https://discourse.threejs.org/t/how-to-update-line2-dynamically/37913/4

// clipboard read
// https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/read
// use blob image as texture
// https://stackoverflow.com/questions/41738664/is-it-possible-to-construct-a-three-texture-from-byte-array-rather-than-file-pat

// color picker
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_read_float_buffer.html#L102
// https://threejs.org/docs/#api/en/renderers/WebGLRenderer.readRenderTargetPixels
// https://threejs.org/docs/#api/en/renderers/WebGLRenderTarget