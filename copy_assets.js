const fs = require('fs');

if(fs.existsSync("./dist/shader.frag")) fs.unlinkSync("./dist/shader.frag");
fs.copyFileSync("./shader.frag", "./dist/shader.frag");

if(fs.existsSync("./dist/shader.vert")) fs.unlinkSync("./dist/shader.vert");
fs.copyFileSync("./shader.vert", "./dist/shader.vert");