const os = require('os');
const { speed } = require('perf_hooks');

let handler = async (nino, m, { senderNumber }) => {
    const start = Date.now();
    const { key } = await nino.sendMessage(m.key.remoteJid, { text: 'Probando latencia... 🦋' }, { quoted: m });
    const end = Date.now();
    const latencia = end - start;

    const stats = `
🦋 *NINO NAKANO SPEED* 🦋

⚡ *Latencia:* ${latencia}ms
💻 *Host:* ${os.hostname()}
🧠 *RAM:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
🛰️ *Uptime:* ${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s

¡No parpadees, tonto! Soy más rápida de lo que crees. ✨`.trim();

    await nino.sendMessage(m.key.remoteJid, { text: stats, edit: key });
};

handler.command = ['ping', 'p'];
module.exports = handler;
