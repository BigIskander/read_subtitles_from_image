import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// is electron
import isElectron from 'is-electron';

// backend server host
const server_host = import.meta.env.PROD ? document.location.origin : "http://localhost:3000";

var camera, scene, renderer, clock, renderTarget, renderTargetF, sceneRTT, sceneRTTF;
var clicked = false;

function load_shader(file_url) {
    return new Promise(async (resolve, reject) => {
        try {
            var response = await fetch(file_url);
            if(!response.ok) reject(`Response status: ${response.status}`);
            resolve(response.text());
        } catch(error) {
            reject(error);
        }
    });
}

// filter shader
var vertexShader;
var fragmentShaderF, fragmentShaderS;
var composer;

var canvas = document.querySelector("#main_canvas");
// canvas.width canvas.height readings inconsistent and wrong sometimes
const canvasSize = 4096; 
var canvasWidth = parseInt(window.getComputedStyle(canvas).width); // in pixels
var canvasHeight = parseInt(window.getComputedStyle(canvas).height); // in pixels
var clearColor = 0x333333;
var mesh;
var meshRTT;
var meshRTTF;
var meshTexture;
// postprocessing effets
var effect1, effect2, effect3;
var colorF = [1.0, 1.0, 1.0];
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
var applyFilter = document.querySelector("#apply_filter");
var colorPicker = document.querySelector("#subtitles_color");
// for optimization (save render calls)
var isImageUpdated = true;
var isColorFUpdated = true;
// output the result
var imageCanvas = document.querySelector("#test_canvas");
// const testImage = document.querySelector("#test_image");
var resultElement = document.querySelector("#result");
var resultStatusElement = document.querySelector("#results_status");
resultElement.value = "";
// to handle file drops
var fileChooserElement = document.querySelector("#file_choser");
var gitLink = document.querySelector("#gitLink");

async function init() {
    camera = new THREE.Camera();
    camera.position.z = 0.001;

    scene = new THREE.Scene();
    clock = new THREE.Clock();

    var geometry = new THREE.PlaneGeometry(0, 0);
    var circle = new THREE.RingGeometry(circleMeshRadius - 0.005, circleMeshRadius, 32);
    
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
    canvas.addEventListener("mousedown", onCanvasMouseDown);
    canvas.addEventListener("mouseup", onCanvasMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);
    // for touch controll
    canvas.addEventListener("touchmove", onCanvasMouse);
    canvas.addEventListener("touchstart", onCanvasMouseDown);
    canvas.addEventListener("touchend", onCanvasMouseUp);
    canvas.addEventListener("touchcancel", onCanvasMouseUp);
    // handle image file drop event
    canvas.addEventListener("drop", loadDropImage);
    window.addEventListener("dragover",function(e){ e.preventDefault(); });
    window.addEventListener("drop",function(e) { e.preventDefault(); });

    // rendering target to color picking
    renderTarget = new THREE.WebGLRenderTarget(canvas.width, canvas.height, { 
        minFilter: THREE.LinearFilter, 
        magFilter: THREE.NearestFilter, 
        format: THREE.RGBAFormat, 
        type: THREE.FloatType
    });
    sceneRTT = new THREE.Scene();
    meshRTT = mesh.clone();
    sceneRTT.add(meshRTT);

    // rendering target to filter an image
    renderTargetF = new THREE.WebGLRenderTarget(canvas.width, canvas.height, { 
        minFilter: THREE.LinearFilter, 
        magFilter: THREE.NearestFilter, 
        format: THREE.RGBAFormat, 
        type: THREE.FloatType
    });
    sceneRTTF = new THREE.Scene();
    meshRTTF = mesh.clone();
    sceneRTTF.add(meshRTTF);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas
    });
    renderer.setClearColor(clearColor);
    renderer.setPixelRatio(window.devicePixelRatio);

    // postprocessing
    // filter shader
    vertexShader = await load_shader("./assets/shader.vert");
    fragmentShaderF = await load_shader("./assets/shader.frag");
    // Filter by color material
    var materialF = new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: {
                value: null
            },
            filterColor: {
                value: colorF
            },
            applyFilter: {
                value: false
            }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShaderF
    });
    //
    composer = new EffectComposer(renderer, renderTargetF);
    composer.renderToScreen = false;
    composer.addPass(new RenderPass(sceneRTTF, camera));
    
    // sharpen - is just not helpfull
    // effect1 = new ShaderPass(materialS);
    // composer.addPass(effect1);
    // filter
    effect2 = new ShaderPass(materialF);
    composer.addPass(effect2);
    // output final image
    const effect3 = new OutputPass();
    composer.addPass(effect3);

    applyFilter.checked = false; 
    resultStatusElement.style.color = "#00ff00";

    render();
}

function getXY(event) {
    var bBox = canvas.getBoundingClientRect();
    var xc = bBox.left + window.scrollX;
    var yc = bBox.top + window.scrollY;
    var gx, gy;
    switch(event.type) {
        case "touchstart":
            gx = event.touches[0].pageX;
            gy = event.touches[0].pageY;
            break;
        case "touchmove":
            gx = event.changedTouches[0].pageX;
            gy = event.changedTouches[0].pageY;
            break;
        default:
            gx = event.pageX;
            gy = event.pageY;
    }
    var x = ((gx - xc) / canvasWidth) * 2.0 - 1.0;
    var y = ((gy - yc) / canvasHeight) * 2.0 - 1.0;
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

// color picker mode
function pickColor(event) {    
    var xy = getXY(event);
    xy = relativeToPixel(xy);
    // read color of a pixel
    var color = new Float32Array(4);
    renderer.readRenderTargetPixels(renderTarget, xy.x, xy.y, 1, 1, color);
    // transform from 0 - 1 to 0 - 255
    colorF = [parseFloat(color[0]), parseFloat(color[1]), parseFloat(color[2])];
    effect2.uniforms['filterColor'].value = colorF;
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
}

function onCanvasMouse(event) {
    // color picker mode
    if(isColorPicker) {
        event.preventDefault();
        pickColor(event);
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
        event.preventDefault();
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

function onCanvasMouseDown(event) {
    // color picker mode
    if(isColorPicker) {
        pickColor(event);
        return;
    }
    // usual mode
    for(let i = 0; i < 4; i++) {
        if(isWithinCircle(event, i)) {
            canvas.style.cursor = 'grabbing';
            clicked[i] = true;
        } else {
            clicked[i] = false;
        }
    }
}

function onCanvasMouseUp(event) {
    // color picker mode
    if(isColorPicker) {
        isColorPicker = false;
        canvas.style.cursor = 'default';
        isColorFUpdated = true;
        render();
        return;
    }
    // usual mode
    for(let i = 0; i < 4; i++) {
        clicked[i] = false;
    }
    canvas.style.cursor = 'default';
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
    var deltaTime = clock.getDelta();
    if(!postponed && postponedFrame) return;
    if(deltaTime > frameTime || postponed) {
        postponedFrame = false;
        // render here
        renderer.clear();
        // render to rendering target (for color picker)
        if(isImageUpdated) {
            renderer.setRenderTarget(renderTarget);
            renderer.clear();
            renderer.render(sceneRTT, camera);
        }
        // render to second rendering target (for filtering)
        if(isImageUpdated || isColorFUpdated) {
            renderer.setRenderTarget(renderTargetF);
            renderer.clear();
            // 
            composer.render();
        }
        // reset value
        if(isImageUpdated) isImageUpdated = false;
        if(isColorFUpdated) isColorFUpdated = false;
        // render to canvas
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
    } else {
        postponedFrame = true;
        setTimeout(() => { render(true); }, (frameTime - deltaTime) * 1000);
    }
}

function updateImage(image) {
    resultStatusElement.style.color = "#00ff00";
    resultStatusElement.innerHTML = "";
    //
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
    meshRTTF.geometry.dispose();
    var geometry = new THREE.PlaneGeometry(width, height);
    mesh.geometry = geometry;
    meshRTT.geometry = geometry;
    meshRTTF.geometry = geometry;
    //
    meshTexture.dispose();
    meshTexture.colorSpace = THREE.SRGBColorSpace;
    meshTexture.generateMipmaps = false;
    meshTexture.minFilter = THREE.LinearFilter;
    meshTexture.image = image; 
    meshTexture.needsUpdate = true;
    //
    isImageUpdated = true;
    render();
}

async function pasteAnImage() {
    try {
        const clipboardContents = await navigator.clipboard.read();
        for (const item of clipboardContents) {
            // check if it is an image
            if (item.types.includes("image/png")) {
                const blob = await item.getType("image/png");
                var image = new Image();
                image.onload = function() {
                    updateImage(image);
                };
                image.src = URL.createObjectURL(blob);
            } else {
                alert("Not an image.");
            }
        }
        if(clipboardContents.length < 1) alert("Nothing in clipboard.");
    } catch (error) {
        alert(error.message);
    }
}

function loadDropImage(event) {
    fileChooserElement.files = event.dataTransfer.files;   
    fileChooserElement.onchange();
}

async function openAnImage(event) {
    if(fileChooserElement.files.length < 1) return;
    var imageFile = fileChooserElement.files[0];
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
        meshRTT.geometry.dispose();
        meshRTTF.geometry.dispose();
        var geometry = new THREE.PlaneGeometry(0, 0);
        mesh.geometry = geometry;
        meshRTT.geometry = geometry;
        meshRTTF.geometry = geometry;
        meshTexture.dispose();
        //
        meshTexture.needsUpdate = true;
        isImageUpdated = true;
        isColorFUpdated = true;
        //
        effect2.uniforms['filterColor'].value = colorF;
        colorPicker.style.backgroundColor = "rgba(255, 255, 255, 255)";
        colorPicker.style.color = "rgba(0, 0, 0, 255)";
        colorPicker.innerHTML = "rgba(255, 255, 255, 255)";
        resultElement.value = "";
        applyFilter.checked = false;
        effect2.uniforms['applyFilter'].value = false;
        isColorFUpdated = true;
        resultStatusElement.style.color = "#00ff00";
        resultStatusElement.innerHTML = "";
        //
        render();
    }
}

function pickSubtitlesColor() {
    isColorPicker = true;
    canvas.style.cursor = 'crosshair';
}

function applySubtitlesColor() {
    if(applyFilter.checked) effect2.uniforms['applyFilter'].value = true;
    else effect2.uniforms['applyFilter'].value = false;
    isColorFUpdated = true;
    render();
}

// convert coordinates
function relativeToPixel(xy) {
    xy.x = parseInt(circleMeshRadius + (canvasSize * ((1.0 + xy.x) / 2.0)));
    xy.y = parseInt(circleMeshRadius + (canvasSize * ((1.0 + xy.y) / 2.0)));
    return xy;
}

async function recognizeText() {
    resultStatusElement.style.color = "#00ff00";
    resultStatusElement.innerHTML = "In progress..."
    // get cutSqare
    /*
        2   3
        0   1
    */
    var cutSqare = [
        relativeToPixel({ x: circleMesh[0].position.x, y: circleMesh[0].position.y }),
        relativeToPixel({ x: circleMesh[1].position.x, y: circleMesh[1].position.y }),
        relativeToPixel({ x: circleMesh[2].position.x, y: circleMesh[2].position.y }),
        relativeToPixel({ x: circleMesh[3].position.x, y: circleMesh[3].position.y })
    ];
    var x = cutSqare[0].x;
    var y = cutSqare[0].y;
    var width = (cutSqare[1].x - cutSqare[0].x);
    var height = (cutSqare[2].y - cutSqare[0].y);
    // read color of a pixel
    var dataLength = 4 * width * height;
    var cutImage = new Float32Array(dataLength);
    renderer.readRenderTargetPixels(renderTargetF, x, y, width, height, cutImage);
    // a little trick to flip the y axis
    const r = 4 * width;
    const getNewIndex = (index) => { return (height - Math.floor(index / r) - 1) * r + index % r };
    // convert from Float32Array to Uint8ClampedArray
    const cutImageData = new Uint8ClampedArray(dataLength);
    cutImage.forEach((value, index) => { 
        cutImageData[getNewIndex(index)] = parseInt(value * 255); 
    });  
    var imageData = new ImageData(cutImageData, width, height);
    //
    imageCanvas.width = width;
    imageCanvas.height = height;
    var ctx = imageCanvas.getContext("2d");
    ctx.putImageData(imageData, 0, 0, 0, 0, width, height);
    // testImage.src = imageCanvas.toDataURL("image/png");
    var base64image = imageCanvas.toDataURL("image/png");

    try {
        // Call to backend and display reselts
        var getResult = await recognizeTextRequest(base64image);
        if(getResult.err != "") {
            resultStatusElement.style.color = "#ff0000";
            resultStatusElement.innerHTML = "An error occurred.";
            alert("Tesseract OCR error: " + getResult.err);
            console.log(getResult.err);
        } else {
            var text = getResult.data;
            text.replace(/(?:\r\n|\r|\n|\t)/g, ' ').replace(/(?:\s\s+)/g, ' ').trim();
            // slice(0, -1) to delete last unprintable character or symbol
            resultElement.value = text.slice(0, -1);
            resultStatusElement.innerHTML = "";
        }
    } catch (error) {
        resultStatusElement.style.color = "#ff0000";
        resultStatusElement.innerHTML = "An error occurred.";
        alert(error.message);
        console.log(error.message);
    }
}

// request data from backend server
function recognizeTextRequestExpress(base64image) {
    return new Promise(async (resolve, reject) => {
        try {
            var response = await fetch(server_host + "/recognize", {
                method: "POST",
                body: JSON.stringify({
                  base64image: base64image,
                }),
                headers: {
                  "Content-type": "application/json; charset=UTF-8"
                }
            });
            if(!response.ok) reject(`Response status: ${response.status}`);
            resolve(response.json());
        } catch(error) {
            reject(error);
        }
    });
}

// request data from backend electron
function recognizeTextRequestElectron(base64image) {
    return new Promise(async (resolve, reject) => {
        resolve(await window.tesseractOCR.recognize(base64image));
    });
}

const recognizeTextRequest = isElectron() ? 
                                recognizeTextRequestElectron : recognizeTextRequestExpress;


if(isElectron()) {
    gitLink.href = "JavaScript:window.externalLink.open('" + gitLink.href + "');";
    gitLink.target = "_self";
    resultElement.addEventListener("contextmenu", window.electronAPI.showContextMenu);
}

init();

export {
    pasteAnImage,
    openAnImage,
    clearCanvas,
    applySubtitlesColor,
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

// sending post request
// https://www.freecodecamp.org/news/javascript-post-request-how-to-send-an-http-post-request-in-js/

// prevent opening new tab on image drop
// https://stackoverflow.com/questions/67467782/how-to-prevent-to-open-new-tab-when-i-drag-and-drop-image-on-the-chrome-browser