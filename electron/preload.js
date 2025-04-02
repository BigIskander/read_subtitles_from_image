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
    showContextMenu2: (event) => { ipcRenderer.send('show-context-menu2', event); },
    showDialog: (message) => { ipcRenderer.send('show-message', message); }
});

// recognize text using Tesseract OCR
async function recognizeTesseractOcr(imageBuffer, lang, psmValue) {
    // run tesseract
    var tesseract = tesseractPath ? path.join(tesseractPath, "tesseract") : "tesseract";
    var commandArgs = ["-l", lang, "--dpi", "96", "--psm", psmValue, "--oem", "3", "-", "stdout"];
    if(tessdatadir) {
        commandArgs.splice(0, 0, "--tessdata-dir");
        commandArgs.splice(1, 0, tessdatadir);
    }
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
    if(process.env.DEV == 'true')
        var script = path.join(__dirname, "run_paddle_ocr.py");
    else
        var script = path.join(__dirname, "..", "run_paddle_ocr.py");
    var commandArgs = [script, lang];
    if(multiline) commandArgs.push("multiline");
    var paddleProcess = childProcess.spawn(python3, commandArgs);
    // get results
    var output = "";
    var error = "";
    var result = await new Promise(async (resolve) => {
        paddleProcess.on('error', (err) => { resolve({ err: err.toString(), data: "" }); });
        paddleProcess.on('close', (code) => { 
            if(code == 0) {
                if(output.length > 0) output = output.slice(0, -1);
                resolve({ err: "", data: output });
            } else {
                resolve({ err: "PaddleOCR, python3 script closed with status: " + 
                    code + "\n" + error, data: "" });
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
            error = err;
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

var enableTesseractOCR = true;
var enablePaddleOCR = true;
var langs = ["chi_all", "eng"];
var langsPaddle = ["ch", "en", "chinese_cht"];
// var language = "chi_all";
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
    initSettings: async () => {
        await storage.init({ dir: storageDir });
        var settings = await storage.getItem("settings");
        if(settings) {
            // get values from settings
            enableTesseractOCR = settings.enableTesseractOCR != undefined ? 
                settings.enableTesseractOCR : enableTesseractOCR;
            enablePaddleOCR = settings.enablePaddleOCR != undefined ?
                settings.enablePaddleOCR : enablePaddleOCR; 
            langs = settings.langs ? settings.langs : settings.language ?
                [settings.language] : langs;
            langsPaddle = settings.langsPaddle ? settings.langsPaddle : langsPaddle;
            tessdatadir = settings.tessdatadir ? settings.tessdatadir : tessdatadir;
            tesseractPath = settings.tesseractPath ?
                settings.tesseractPath : tesseractPath;
            // return settings
            return { 
                enableTesseractOCR: enableTesseractOCR,
                enablePaddleOCR: enablePaddleOCR,
                langs: langs,
                langsPaddle: langsPaddle,
                tesseractPath: tesseractPath, 
                tessdatadir: tessdatadir, 
            }; 
        } else {
            return { 
                enableTesseractOCR: enableTesseractOCR,
                enablePaddleOCR: enablePaddleOCR,
                langs: langs,
                langsPaddle: langsPaddle,
                tesseractPath: tesseractPath, 
                tessdatadir: tessdatadir, 
            }; 
        }
    },
    saveSettings: (settings) => {
        // get values from settings
        settings.langs = settings.langs.replace(/(?:\s)/g, '').
            split(";").filter(item => item!="");
        settings.langsPaddle = settings.langsPaddle.replace(/(?:\s)/g, '').
            split(";").filter(item => item!="");
        enableTesseractOCR = settings.enableTesseractOCR;
        enablePaddleOCR = settings.enablePaddleOCR;  
        langs = settings.langs;
        langsPaddle = settings.langsPaddle;
        tessdatadir = settings.tessdatadir;
        tesseractPath = settings.tesseractPath;
        storage.setItem("settings", settings);
    },
    choseFolder: () => { return ipcRenderer.invoke('choose-directory'); }
});

// a little trick to load ES module in commonJS
// https://stackoverflow.com/questions/70541068/instead-change-the-require-of-index-js-to-a-dynamic-import-which-is-available