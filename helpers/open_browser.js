var openBrowsers = require('open-browsers');

if(process.env.VITE == 'true') var port = 5173
else var port = 3000

setTimeout(() => { 
  if (openBrowsers(`http://localhost:${port}/`)) {
    console.log('The browser tab has been opened!');
  }
}, 300);