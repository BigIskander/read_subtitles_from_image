const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')
const childProcess = require('child_process');
const app = express();
const port = process.env.PORT || 3000;
const langs = process.env.TESSLANGS ? 
  process.env.TESSLANGS.replace(/(?:\s)/g, '').split(";").filter(item => item!="")
  : ["chi_all", "eng"];
const langsPaddle = process.env.PADDLELANGS ?
  process.env.PADDLELANGS.replace(/(?:\s)/g, '').split(";").filter(item => item!="")
  : ["ch", "en", "chinese_cht"];

// to parse reqests
app.use(bodyParser.json({limit: '50mb'}));

// set up cors, URL of vite dev environment
var corsOptions = {
  origin: 'http://localhost:5173',
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
// if dev environment use cors else block cross origin request
if(process.env.DEV == 'true') {
  app.use(cors(corsOptions));
}

// serve static pages built with vite and three.js
app.use(express.static('dist'));

app.get("/langs", cors(corsOptions), async (req, res) => { 
  res.send(JSON.stringify({
    langs: langs,
    langsPaddle: langsPaddle
  }));
});

// recognize text using Tesseract OCR
async function recognizeTesseractOcr(imageBuffer, lang, psmValue) {
  // run tesseract
  var tesseract = "tesseract";
  var commandArgs = ["-l", lang, "--dpi", "96", "--psm", psmValue, "--oem", "3", "-", "stdout"];
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
  return result;
}

// recognize text using PaddleOCR
async function recognizePaddleOcr(imageBuffer, lang, multiline) {
  // run PaddleOCR
  var python3 = "python3";
  var script = path.join(process.cwd(), "run_paddle_ocr.py");
  var commandArgs = [script, lang];
  if(multiline) commandArgs.push("multiline");
  var paddleProcess = childProcess.spawn(python3, commandArgs);
  // get results
  var output = "";
  var result = await new Promise(async (resolve) => {
    paddleProcess.on('error', (err) => { resolve({ err: err.toString(), data: "" }); });
    paddleProcess.on('close', (code) => { 
      if(code == 0) {
        if(output.length > 0) output = output.slice(0, -1);
        resolve({ err: "", data: output });
      } else {
        resolve({ err: "PaddleOCR, python3 script closed with status: " + code, data: "" });
      } 
    });
    paddleProcess.stdout.on('data', function (data) {
      // parse stdout
      var re = /ppocr\s{0,}INFO:\s{0,}\(\'(?<w>.{0,})\'\,.{0,}\)/g;
      var find = data.toString().matchAll(re);
      if(find != null) {
        for(const f of find) {
          if(f.groups.w != null) output = output + f.groups.w + "\n";
        }
      }
    });
    paddleProcess.stderr.on('data', (err) => {
      // parse stderr
      var re = /Error:(?<w>.{0,})/;
      var find = err.toString().match(re);
      if(find != null) {
        resolve({ err: find.groups.w, data: "" });
      }
    });
    paddleProcess.stdin.write(imageBuffer);
    paddleProcess.stdin.end();
  });
  return result;
}

// get a post request with image data
app.post('/recognize', cors(corsOptions), async (req, res) => {
  var usePaddleOcr = req.body.usePaddleOcr;
  var imageDataUrl = req.body.base64image;
  var imageBuffer = Buffer.from(imageDataUrl.split('base64,')[1], 'base64');
  // get results
  if(usePaddleOcr) {
    var lang = langsPaddle.includes(req.body.lang) ? req.body.lang : "ch";
    var multiline = Boolean(req.body.multiline);
    var result = await recognizePaddleOcr(imageBuffer, lang, multiline);
  } else {
    var lang = langs.includes(req.body.lang) ? req.body.lang : "chi_all";
    var psmValue = parseInt(req.body.psmValue);
    psmValue = (0 <= psmValue && psmValue <= 13) ? psmValue : 3;
    var result = await recognizeTesseractOcr(imageBuffer, lang, psmValue);
  }
  // return results to frontend
  res.send(JSON.stringify(result));
});

// start the server and output console
app.listen(port, () => {
  console.log("read_subtitles_from_image");
  console.log(`The application is listening on port ${port}`);
  console.log(`http://localhost:${port}/`);
});

// cors
// https://stackoverflow.com/questions/77199600/vite-wont-allow-cors-vue3-application
// https://expressjs.com/en/resources/middleware/cors.html
// nodeJS env variables
// https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs
// parse request
// https://stackoverflow.com/questions/5710358/how-to-access-post-form-fields-in-express