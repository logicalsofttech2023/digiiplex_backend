const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'Upload Service Running ✅' });
});

app.get('/upload-test', (req, res) => {
  res.json({ message: 'Upload API Working 📤' });
});

app.listen(4008, () => console.log('Upload Service on 4008'));