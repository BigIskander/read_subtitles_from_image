const fs = require('fs');

if(fs.existsSync("./dist/assets/shader.frag")) fs.unlinkSync("./dist/assets/shader.frag");
fs.copyFileSync("./assets/shader.frag", "./dist/assets/shader.frag");

if(fs.existsSync("./dist/assets/shader.vert")) fs.unlinkSync("./dist/assets/shader.vert");
fs.copyFileSync("./assets/shader.vert", "./dist/assets/shader.vert");

// not loading in production environment, workaround
let data = fs.readFileSync('./dist/index.html', 'utf8');
data = data.replaceAll('src="/', 'src="./');
data = data.replaceAll('href="/', 'href="./');
fs.writeFileSync('./dist/index.html', data);