const { contextBridge, ipcRenderer, shell } = require('electron');
const childProcess = require('child_process');
const path = require('path');
const storage = require('node-persist');
const os = require('os');
const storageDir = path.join(os.homedir() + "/.read_subtitles_from_image_electron");
// import fixPath from 'fix-path';
const fixPath = (...args) => import('fix-path').then(({default: fixPath}) => fixPath(...args));
//Fix for mac OS and Linux
fixPath();

const allowedURLs = [
    'https://github.com/BigIskander/read_subtitles_from_image'
];

// open allowed links in external browser i.e. open in OS's default browser
contextBridge.exposeInMainWorld('externalLink', {
    open: (link) => {
        if(allowedURLs.includes(link)) shell.openExternal(link)
    }
});

// show context menu
contextBridge.exposeInMainWorld('electronAPI', {
    showContextMenu: (event) => { ipcRenderer.send('show-context-menu', event); },
    showContextMenu2: (event) => { ipcRenderer.send('show-context-menu2', event); }
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

var langs = ["chi_all", "eng"]
var langsPaddle = ["ch", "en", "chinese_cht"]
var language = "chi_all";
var tessdatadir = null;
var tesseractPath = null;

// tesseract OCR
contextBridge.exposeInMainWorld('OCR', {
    recognize: async (usePaddleOcr, imageDataUrl, lang, psmValue, multiline) => {
        var imageBuffer = Buffer.from(imageDataUrl.split('base64,')[1], 'base64');
        // get results
        if(usePaddleOcr) {
            var lang = langsPaddle.includes(lang) ? lang : "ch";
            var multiline = Boolean(multiline);
            var result = await recognizePaddleOcr(imageBuffer, lang, multiline);
        } else {
            var lang = langs.includes(lang) ? lang : "chi_all";
            var psmValue = parseInt(psmValue);
            psmValue = (0 <= psmValue && psmValue <= 13) ? psmValue : 3;
            var result = await recognizeTesseractOcr(imageBuffer, lang, psmValue);
        }
        // return results to frontend
        return result;
    },
    getLangs: async () => {
        return { 
            "langs": langs,
            "langsPaddle": langsPaddle 
        }
    },
    initSettings: async () => {
        await storage.init({ dir: storageDir });
        var settings = await storage.getItem("settings");
        if(settings) {
            language = settings.language;
            tessdatadir = settings.tessdatadir;
            tesseractPath = settings.tesseractPath;
            return { 
                tesseractPath: tesseractPath, 
                tessdatadir: tessdatadir, 
                language: language 
            }; 
        } else {
            return { 
                tesseractPath: tesseractPath, 
                tessdatadir: tessdatadir, 
                language: language 
            }; 
        }
    },
    saveSettings: (settings) => { 
        tesseractPath = settings.tesseractPath;
        tessdatadir = settings.tessdatadir;
        language = settings.language;
        storage.setItem("settings", settings);
    },
    choseFolder: () => { return ipcRenderer.invoke('choose-directory'); }
});

// a little trick to load ES module in commonJS
// https://stackoverflow.com/questions/70541068/instead-change-the-require-of-index-js-to-a-dynamic-import-which-is-available