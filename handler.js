const { printLog } = require('./lib/print');
const { decodeJid } = require('./lib/simple');
const db = require('./lib/database');
const fs = require('fs');
const path = require('path');
require('./settings');

const plugins = {};
const pluginsFolder = path.join(__dirname, 'plugins');

const loadPlugins = () => {
    const pluginFiles = fs.readdirSync(pluginsFolder).filter(file => file.endsWith('.js'));
    for (const file of pluginFiles) {
        const pluginPath = path.join(pluginsFolder, file);
        delete require.cache[require.resolve(pluginPath)];
        plugins[file] = require(pluginPath);
    }
};

loadPlugins();

module.exports = async (nino, chatUpdate) => {
    try {
        const m = chatUpdate?.messages?.[0];
        if (!m || !m.message) return;
        if (m.key?.remoteJid === 'status@broadcast') return;

        const from = m.key.remoteJid;
        const type = Object.keys(m.message)[0];

        const content = (
            type === 'conversation' ? m.message.conversation :
            type === 'extendedTextMessage' ? m.message.extendedTextMessage?.text :
            type === 'imageMessage' ? m.message.imageMessage?.caption :
            type === 'videoMessage' ? m.message.videoMessage?.caption :
            ''
        ) || '';

        const sender = decodeJid(m.key.participant || m.key.remoteJid);
        const senderNumber = (sender || '').split('@')[0];
        const isGroup = from.endsWith('@g.us');
        const pushname = m.pushName || 'Usuario';

        const prefix = typeof global.prefix === 'string' ? global.prefix : '.';
        const ownerNumbers = Array.isArray(global.ownerNumber) ? global.ownerNumber : [];

        const isCmd = content.startsWith(prefix);
        const command = isCmd ? content.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = content.trim().split(/ +/).slice(1);
        const text = args.join(' ');

        const isOwner = ownerNumbers.includes(senderNumber);

        printLog(isCmd, senderNumber, isGroup ? 'Grupo' : null, content);

        if (!db.data.users[sender]) {
            db.data.users[sender] = {
                name: pushname,
                xp: 0,
                level: 1,
                premium: false,
                limit: 20,
                warn: 0,
                lastChat: Date.now()
            };
            db.save();
        } else {
            db.data.users[sender].xp += Math.floor(Math.random() * 10);
            db.data.users[sender].lastChat = Date.now();

            const user = db.data.users[sender];
            const requiredXp = user.level * 100;

            if (user.xp >= requiredXp) {
                user.level += 1;
                user.xp = 0;
                await nino.sendMessage(from, {
                    text: `🦋 ¡Subiste al nivel *${user.level}*!`
                }, { quoted: m });
            }

            db.save();
        }

        if (isCmd) {
            let executed = false;

            for (const name in plugins) {
                const plugin = plugins[name];

                if (Array.isArray(plugin.command) && plugin.command.includes(command)) {
                    await plugin(nino, m, {
                        from,
                        sender,
                        senderNumber,
                        args,
                        text,
                        isOwner,
                        isGroup,
                        pushname,
                        command
                    });
                    executed = true;
                    break;
                }
            }
        }
    } catch (err) {
        console.error('CRITICAL_HANDLER_ERROR:', err);
        const from = chatUpdate?.messages?.[0]?.key?.remoteJid;
        if (from) {
            await nino.sendMessage(from, {
                text: global.mess?.error || '❌ Ocurrió un error en el handler.'
            });
        }
    }
};