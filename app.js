const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
const childProcess = require('child_process');
const app = express();
const port = process.env.PORT || 3000;
const lang = process.env.TESSLANG || "chi_all";

// to parse reqests
app.use(bodyParser.json({limit: '50mb'}));

// set up cors, URL of vite dev environment
var corsOptions = {
  origin: 'http://localhost:5173',
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
// if dev environment use cors else block cross origin request
if(process.env.DEV == 'true') {
  app.use(cors(corsOptions));
}

// serve static pages built with vite and three.js
app.use(express.static('dist'));

// get a post request with image data
app.post('/recognize', cors(corsOptions), async (req, res) => {
  var imageDataUrl = req.body.base64image;
  var imageBuffer = Buffer.from(imageDataUrl.split('base64,')[1], 'base64');
  // run tesseract
  var tesseract = "tesseract";
  var commandArgs = ["-l", lang, "--dpi", "96", "--oem", "3", "-", "stdout"];
  var tesseractProcess = childProcess.spawn(tesseract, commandArgs);
  // get results
  var result = await new Promise(async (resolve) => {
    tesseractProcess.on('error', (err) => { resolve({ err: err.toString(), data: "" }); });
    tesseractProcess.on('close', (code) => { 
      if(code == 0) 
          resolve({ err: "", data: "" }); 
      else
          resolve({ err: "tesseract closed with status: " + code, data: "" });
    });
    tesseractProcess.stdout.on('data', function (data) {
      resolve({ err: "", data: data.toString() });
    });
    tesseractProcess.stderr.on('data', (err) => {
      resolve({ err: err.toString(), data: "" });
    });
    tesseractProcess.stdin.write(imageBuffer);
    tesseractProcess.stdin.end();
  });
  // return results to frontend
  res.send(JSON.stringify(result));
});

// output console
app.listen(port, () => {
  console.log("read_subtitles_from_image");
  console.log(`The application is listening on port ${port}`);
  console.log(`http://localhost:${port}/`);
  console.log("The change.");
});

// cors
// https://stackoverflow.com/questions/77199600/vite-wont-allow-cors-vue3-application
// https://expressjs.com/en/resources/middleware/cors.html
// nodeJS env variables
// https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs
// parse request
// https://stackoverflow.com/questions/5710358/how-to-access-post-form-fields-in-express