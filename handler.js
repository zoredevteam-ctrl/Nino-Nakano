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
        const senderNumber = sender.split('@')[0]; // Extrae solo el número (ej: 57310...)

        // --- SISTEMA DE CUERPO DE MENSAJE ---
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';
        
        const prefix = global.prefix || '#';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const text = args.join(' ');

        // --- 🚨 LÍNEA 45: VALIDACIÓN MAESTRA DE OWNER 🚨 ---
        // Esto evita el error "reading includes of undefined"
        const isOwner = (Array.isArray(global.owners) ? global.owners : []).includes(senderNumber);
        
        // --- METADATOS DE GRUPO ---
        const isGroup = from.endsWith('@g.us');
        const groupMetadata = isGroup ? await nino.groupMetadata(from).catch(() => ({})) : {};
        const participants = isGroup ? (groupMetadata.participants || []) : [];
        const userAdmin = isGroup ? !!participants.find(p => p.id === sender)?.admin : false;
        const botAdmin = isGroup ? !!participants.find(p => p.id === (nino.user.id.split(':')[0] + '@s.whatsapp.net'))?.admin : false;

        // --- LOG DE CONSOLA ESTILO NINO ---
        if (isCmd) {
            console.log(chalk.hex('#FF69B4').bold('---------- [ NUEVO COMANDO ] ----------'));
            console.log(chalk.white(`🦋 Usuario: ${senderNumber} ${isOwner ? '(OWNER)' : ''}`));
            console.log(chalk.white(`🦋 Comando: ${prefix}${command}`));
            console.log(chalk.white(`🦋 Canal: ${isGroup ? groupMetadata.subject : 'Chat Privado'}`));
            console.log(chalk.hex('#FF69B4').bold('---------------------------------------'));
        }

        // --- LECTORA DE PLUGINS DINÁMICA ---
        const pluginPath = path.join(__dirname, 'plugins');
        if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath); // Crea la carpeta si no existe
        
        const files = fs.readdirSync(pluginPath);
        for (let file of files) {
            if (file.endsWith('.js')) {
                try {
                    const plugin = require(path.join(pluginPath, file));
                    if (plugin.command && (Array.isArray(plugin.command) ? plugin.command.includes(command) : plugin.command === command)) {
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
                } catch (pluginErr) {
                    console.error(`Error en plugin ${file}:`, pluginErr);
                }
            }
        }

    } catch (err) {
        // Log de error detallado pero controlado
        console.log(chalk.red.bold('ERROR_EN_HANDLER:'), err.message);
    }
};

// Sistema de recarga en caliente
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.hex('#FF69B4').bold('¡Handler actualizado correctamente! 🦋✨'));
    delete require.cache[file];
    require(file);
});
