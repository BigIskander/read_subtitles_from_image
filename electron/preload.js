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

var language = "chi_all";
var tessdatadir = null;
var tesseractPath = null;

// tesseract OCR
contextBridge.exposeInMainWorld('tesseractOCR', {
    recognize: (imageDataUrl) => {
        const imageBuffer = Buffer.from(imageDataUrl.split('base64,')[1], 'base64');
        var tesseract = tesseractPath ? path.join(tesseractPath, "tesseract") : "tesseract";
        var commandArgs = ["-l", language, "--dpi", "96", "--oem", "3", "-", "stdout"];
        if(tessdatadir) {
            commandArgs.splice(0, 0, "--tessdata-dir");
            commandArgs.splice(1, 0, tessdatadir);
        }
        var tesseractProcess = childProcess.spawn(tesseract, commandArgs);
        const prom = new Promise(async (resolve) => {
            tesseractProcess.on('error', (err) => { resolve({ err: err.toString(), data: "" }); });
            tesseractProcess.stdout.on('data', function (data) {
                resolve({ err: "", data: data.toString() });
            });
            tesseractProcess.stderr.on('data', (err) => {
                resolve({ err: err.toString(), data: "" });
            });
            tesseractProcess.stdin.write(imageBuffer);
            tesseractProcess.stdin.end();
        });
        return prom;
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