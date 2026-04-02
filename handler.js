const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
require('./settings');

module.exports = async (nino, chatUpdate) => {
    try {
        const m = chatUpdate.messages[0];
        if (!m || !m.message) return;
        if (m.key && m.key.remoteJid === 'status@broadcast') return;
        
        const from = m.key.remoteJid;
        const type = Object.keys(m.message)[0];
        const sender = m.key.participant || m.key.remoteJid;
        const senderNumber = sender.split('@')[0];

        // --- SISTEMA DE COMANDOS ---
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';
        
        const prefix = global.prefix || '#';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const text = args.join(' ');

        // --- 🛡️ EL ESCUDO ANTI-ERRORES (Lee global.owners) 🛡️ ---
        const isOwner = (Array.isArray(global.owners) ? global.owners : []).includes(senderNumber);
        
        // --- METADATOS DE GRUPO ---
        const isGroup = from.endsWith('@g.us');
        const groupMetadata = isGroup ? await nino.groupMetadata(from).catch(() => ({})) : {};
        const participants = isGroup ? (groupMetadata.participants || []) : [];
        const userAdmin = isGroup ? !!participants.find(p => p.id === sender)?.admin : false;
        const botAdmin = isGroup ? !!participants.find(p => p.id === (nino.user.id.split(':')[0] + '@s.whatsapp.net'))?.admin : false;

        // --- LOG DE CONSOLA ---
        if (isCmd) {
            console.log(chalk.hex('#FF69B4').bold('---------- [ NUEVO COMANDO ] ----------'));
            console.log(chalk.white(`🦋 Usuario: ${senderNumber} ${isOwner ? '(OWNER)' : ''}`));
            console.log(chalk.white(`🦋 Comando: ${prefix}${command}`));
            console.log(chalk.white(`🦋 Canal: ${isGroup ? groupMetadata.subject : 'Chat Privado'}`));
            console.log(chalk.hex('#FF69B4').bold('---------------------------------------'));
        }

        // --- EJECUTOR DE PLUGINS ---
        const pluginPath = path.join(__dirname, 'plugins');
        if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath);
        
        const files = fs.readdirSync(pluginPath);
        for (let file of files) {
            if (file.endsWith('.js')) {
                try {
                    const plugin = require(path.join(pluginPath, file));
                    if (plugin.command && (Array.isArray(plugin.command) ? plugin.command.includes(command) : plugin.command === command)) {
                        await plugin(nino, m, {
                            from, isGroup, isOwner, userAdmin, botAdmin, args, text, sender,
                            pushname: m.pushName || 'Usuario'
                        });
                    }
                } catch (pluginErr) {
                    // Solo avisa del plugin dañado, pero no crashea el bot
                    console.error(chalk.yellow(`Aviso en plugin ${file}:`), pluginErr.message);
                }
            }
        }

    } catch (err) {
        console.log(chalk.red.bold('ERROR_EN_HANDLER:'), err.message);
    }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.hex('#FF69B4').bold('¡Handler actualizado correctamente! 🦋✨'));
    delete require.cache[file];
    require(file);
});
