const fs = require('fs');
const chalk = require('chalk');
require('./settings');

module.exports = async (nino, chatUpdate) => {
    try {
        const m = chatUpdate.messages[0];
        if (!m.message) return;
        if (m.key && m.key.remoteJid === 'status@broadcast') return;
        
        const from = m.key.remoteJid;
        const type = Object.keys(m.message)[0];
        const content = JSON.stringify(m.message);
        const sender = m.key.participant || m.key.remoteJid;
        const senderNumber = sender.split('@')[0]; // Extrae solo el número

        // --- SISTEMA DE PREFIJO Y COMANDOS ---
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';
        
        const prefix = global.prefix;
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const text = args.join(' ');

        // --- VALIDACIÓN DE PERMISOS (¡AQUÍ ESTABA EL ERROR!) ---
        // Usamos global.owners que definiste en settings.js
        const isOwner = (global.owners || []).includes(senderNumber);
        
        const groupMetadata = m.key.remoteJid.endsWith('@g.us') ? await nino.groupMetadata(from) : '';
        const isGroup = from.endsWith('@g.us');
        const participants = isGroup ? groupMetadata.participants : [];
        const userAdmin = isGroup ? participants.find(p => p.id === sender)?.admin : false;
        const botAdmin = isGroup ? participants.find(p => p.id === nino.user.id.split(':')[0] + '@s.whatsapp.net')?.admin : false;

        // --- LOG DE CONSOLA (DISEÑO PREMIUM) ---
        if (isCmd) {
            console.log(chalk.hex('#FF69B4').bold('---------- [ COMANDO ] ----------'));
            console.log(chalk.white(`🦋 Usuario: ${senderNumber}`));
            console.log(chalk.white(`🦋 Comando: ${prefix}${command}`));
            console.log(chalk.white(`🦋 Grupo: ${isGroup ? groupMetadata.subject : 'Chat Privado'}`));
            console.log(chalk.hex('#FF69B4').bold('---------------------------------'));
        }

        // --- EJECUCIÓN DE PLUGINS ---
        const path = require('path');
        const pluginPath = path.join(__dirname, 'plugins');
        const files = fs.readdirSync(pluginPath);

        for (let file of files) {
            if (file.endsWith('.js')) {
                const plugin = require(path.join(pluginPath, file));
                if (plugin.command && plugin.command.includes(command)) {
                    await plugin(nino, m, {
                        from,
                        isGroup,
                        isOwner,
                        userAdmin,
                        botAdmin,
                        args,
                        text,
                        sender,
                        pushname: m.pushName || 'Usuario'
                    });
                }
            }
        }

    } catch (err) {
        console.log(chalk.red.bold('CRITICAL_HANDLER_ERROR:'), err);
    }
};

// Auto-actualización del handler
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.hex('#FF69B4')('¡Actualizado handler.js! 🦋'));
    delete require.cache[file];
    require(file);
});
