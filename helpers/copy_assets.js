const fs = require('fs');

if(fs.existsSync("./dist/assets/shader.frag")) fs.unlinkSync("./dist/assets/shader.frag");
fs.copyFileSync("./assets/shader.frag", "./dist/assets/shader.frag");

if(fs.existsSync("./dist/assets/shader.vert")) fs.unlinkSync("./dist/assets/shader.vert");
fs.copyFileSync("./assets/shader.vert", "./dist/assets/shader.vert");