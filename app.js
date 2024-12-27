const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

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
app.post('/recognize', cors(corsOptions), (req, res) => {
  res.send('Got a POST request');
  console.log(req);
});

// output console
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  console.log(`http://localhost:${port}/`);
});

// cors
// https://stackoverflow.com/questions/77199600/vite-wont-allow-cors-vue3-application
// https://expressjs.com/en/resources/middleware/cors.html
// nodeJS env variables
// https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs