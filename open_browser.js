var openBrowsers = require('open-browsers');

if (openBrowsers('http://localhost:3000')) {
  console.log('The browser tab has been opened!');
}