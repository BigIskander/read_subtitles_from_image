import * as THREE from 'three';

var camera, scene, renderer; //, clock;
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
var circleMeshRadius = 0.02;

function init() {
    camera = new THREE.Camera();
    camera.position.z = 1;

    scene = new THREE.Scene();
    // clock = new THREE.Clock();

    var geometry = new THREE.PlaneGeometry(2, 2);
    var circle = new THREE.CircleGeometry(circleMeshRadius);

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
        circleMesh[i] = new THREE.Mesh(circle, new THREE.MeshBasicMaterial({ color: 0xfff000 }));
        circleMesh[i].position.x += -0.1 + (i % 2) * 0.2;
        circleMesh[i].position.y += -0.1 + Math.floor(i / 2) * 0.2;
        scene.add(circleMesh[i]);
    }

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
    var x = (event.pageX / canvas.width) * 2.0 - 1.0;
    var y = (event.pageY / canvas.height) * 2.0 - 1.0;
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
    switch(circleID) {
        case 0:
            if(xy.x > (circleMesh[3].position.x - circleMeshRadius * 2)) 
                xy.x = circleMesh[3].position.x - circleMeshRadius * 2;
            if(xy.y > (circleMesh[3].position.y - circleMeshRadius * 2))
                xy.y = circleMesh[3].position.y - circleMeshRadius * 2;
            break;
        case 1:
            if(xy.x < (circleMesh[2].position.x + circleMeshRadius * 2)) 
                xy.x = circleMesh[2].position.x + circleMeshRadius * 2;
            if(xy.y > (circleMesh[2].position.y - circleMeshRadius * 2))
                xy.y = circleMesh[2].position.y - circleMeshRadius * 2;
            break;
        case 2:
            if(xy.x > (circleMesh[1].position.x - circleMeshRadius * 2)) 
                xy.x = circleMesh[1].position.x - circleMeshRadius * 2;
            if(xy.y < (circleMesh[1].position.y + circleMeshRadius * 2))
                xy.y = circleMesh[1].position.y + circleMeshRadius * 2;
            break;
        case 3:
            if(xy.x < (circleMesh[0].position.x + circleMeshRadius * 2)) 
                xy.x = circleMesh[0].position.x + circleMeshRadius * 2;
            if(xy.y < (circleMesh[0].position.y + circleMeshRadius * 2))
                xy.y = circleMesh[0].position.y + circleMeshRadius * 2;
            break;
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
    } else {
        // if mouse inside the circle
        let inCircle = false;
        for(let i = 0; i < 4; i++) {
            if(isWithinCircle(event, i)) {
                circleMesh[i].material.color.setHex(0x000fff);
                inCircle = true;
            } else {
                circleMesh[i].material.color.setHex(0xfff000);
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
    let clickedId = 0;
    for(let i = 0; i < 4; i++) {
        if(clicked[i]) {
            isClicked = true;
            clickedId = i;
        }
    }
    if(isClicked) {
        for(let i = 0; i < 4; i++) {
            clicked[i] = false;
        }
    } else {
        for(let i = 0; i < 4; i++) {
            if(isWithinCircle(event, i)) {
                clicked[i] = true;
            }
        }
    }
}

function onMouseLeave(event) {
    canvas.style.cursor = 'default';
    for(let i = 0; i < 4; i++) {
        clicked[i] = false;
        circleMesh[i].material.color.setHex(0xfff000);
    }
    render();
}

function render() {
    // uniforms.u_time.value += clock.getDelta();
    // circleMesh.position.x = 1;
    renderer.render( scene, camera );
}

init();