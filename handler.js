const { printLog } = require('./lib/print');
const { decodeJid } = require('./lib/simple');
const db = require('./lib/database');
require('./settings');

module.exports = async (nino, chatUpdate) => {
    try {
        const m = chatUpdate.messages[0];
        if (!m || !m.message) return;
        if (m.key && m.key.remoteJid === 'status@broadcast') return;

        const from = m.key.remoteJid;
        const type = Object.keys(m.message)[0];
        const content = type === 'conversation' ? m.message.conversation
                      : type === 'extendedTextMessage' ? m.message.extendedTextMessage.text
                      : type === 'imageMessage' ? m.message.imageMessage.caption
                      : type === 'videoMessage' ? m.message.videoMessage.caption : '';

        const sender = decodeJid(m.key.participant || m.key.remoteJid);
        const senderNumber = sender.split('@')[0];
        const isGroup = from.endsWith('@g.us');
        const pushname = m.pushName || 'Usuario';

        const isCmd = content.startsWith(global.prefix);
        const command = isCmd ? content.slice(global.prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = content.trim().split(/ +/).slice(1);
        const text = args.join(' ');
        
        const isOwner = global.ownerNumber.includes(senderNumber);

        printLog(isCmd, senderNumber, isGroup ? 'Grupo' : null, content);

        if (!db.data.users[sender]) {
            db.data.users[sender] = {
                name: pushname,
                xp: 0,
                level: 1,
                premium: false,
                limit: 20,
                warn: 0
            };
            db.save();
        }

        if (isCmd) {
            switch (command) {
                case 'menu':
                case 'help':
                    let menuText = `🦋 *NINO NAKANO SYSTEM* 🦋\n\n`;
                    menuText += `¡Oye! No creas que hago esto porque me agradas, tonto. 🙄\n\n`;
                    menuText += `╭─── • *ESTADO* • ───\n`;
                    menuText += `│ 👤 *Usuario:* ${pushname}\n`;
                    menuText += `│ 💎 *Premium:* ${db.data.users[sender].premium ? 'Activo' : 'No'}\n`;
                    menuText += `│ 📊 *Nivel:* ${db.data.users[sender].level}\n`;
                    menuText += `╰────────────────────\n\n`;
                    menuText += `╭─── • *COMANDOS* • ───\n`;
                    menuText += `│ ✨ ${global.prefix}ping\n`;
                    menuText += `│ 👤 ${global.prefix}owner\n`;
                    menuText += `│ 🦋 ${global.prefix}menu\n`;
                    menuText += `╰────────────────────\n\n`;
                    menuText += `_Powered by ${global.ownerName}_`;

                    await nino.sendMessage(from, { text: menuText }, { quoted: m });
                    break;

                case 'ping':
                    await nino.sendMessage(from, { text: '¡Idiota! El bot está activo. Latencia mínima detectada. ✨' }, { quoted: m });
                    break;

                case 'owner':
                    if (!isOwner) return nino.sendMessage(from, { text: global.mess.owner }, { quoted: m });
                    await nino.sendMessage(from, { text: 'Hola, mi único dueño. Mi sistema está a tus órdenes. 💜' }, { quoted: m });
                    break;

                default:
                    break;
            }
        }
    } catch (err) {
        console.error(err);
        const from = chatUpdate.messages[0].key.remoteJid;
        await nino.sendMessage(from, { text: global.mess.error });
    }
};
