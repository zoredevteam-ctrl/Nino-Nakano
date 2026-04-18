'use strict';

const express = require('express');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to start the WhatsApp bot
function startWhatsAppBot() {
    exec('node path/to/your/whatsapp_bot.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });
}

// Start the WhatsApp bot in the background
startWhatsAppBot();

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
