const express = require('express');
const app = express();
const port = 3000;

// serve static pages built with vite and three.js
app.use(express.static('dist'));

// get a post request with image data
app.post('/recognize', (req, res) => {
  res.send('Got a POST request');
});

// output console
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  console.log(`http://localhost:${port}/`);
});
