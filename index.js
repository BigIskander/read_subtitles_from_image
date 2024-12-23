import * as THREE from 'three';
import { Line2 } from 'jsm/lines/Line2.js';
import { LineMaterial } from 'jsm/lines/LineMaterial.js';
import { LineGeometry } from 'jsm/lines/LineGeometry.js';

var camera, scene, renderer, clock;
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
var circleMesh = [];
var clicked = [false, false, false, false];
var circleMeshRadius = 0.03;
var circleMeshColor = 0x000000;
var circleMeshColorHighlight = 0x00ccff;
var buffer;
var cutGeometry;
var cutLineColor = 0xff0000;
// optimization
var postponedFrame = false;
var frameTime = 0.016; // in seconds (0.016 ~ 60FPS; 0.032 ~ 30FPS)

function init() {
    camera = new THREE.Camera();
    camera.position.z = 1;

    scene = new THREE.Scene();
    clock = new THREE.Clock();

    var geometry = new THREE.PlaneGeometry(2, 2);
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

    var mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xcccccc }));
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
    var cutGeometryMaterial = new LineMaterial({ color: cutLineColor });
    cutGeometry = new LineGeometry();
    cutGeometry.setPositions(buffer); // this one
    const cutLine = new Line2(cutGeometry, cutGeometryMaterial);
    scene.add(cutLine);

    canvas.addEventListener("mousemove", onCanvasMouse);
    canvas.addEventListener("click", onCanvasClick);
    canvas.addEventListener("mouseleave", onMouseLeave);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas
    });
    renderer.setPixelRatio( window.devicePixelRatio );

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
    var xc = bBox.left;
    var yc = bBox.top;
    var x = ((event.pageX - xc) / canvas.width) * 2.0 - 1.0;
    var y = ((event.pageY - yc) / canvas.height) * 2.0 - 1.0;
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
        renderer.render(scene, camera);
    } else {
        postponedFrame = true;
        setTimeout(() => { render(true); }, (frameTime - deltaTime) * 1000);
    }
    //console.log(16 - deltaTime * 1000);//
}

// clipboard read
// https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/read
async function pasteAnImage() {
    try {
        const clipboardContents = await navigator.clipboard.read();
        for (const item of clipboardContents) {
            // check if it is an image
            if (item.types.includes("image/png")) {
                console.log("image");
                const blob = await item.getType("image/png");
                const testImage = document.querySelector("#test_image");
                testImage.src = URL.createObjectURL(blob);
            }
        }
        console.log(clipboardContents);
    } catch (error) {
        log(error.message);
    }
    alert("okk");
}

init();

export {
    pasteAnImage
}

// dinamic line geometry example
// https://codesandbox.io/p/sandbox/threejs-basic-example-forked-ygjt9o?file=%2Fsrc%2Findex.js%3A5%2C22
// https://discourse.threejs.org/t/how-to-update-line2-dynamically/37913/4