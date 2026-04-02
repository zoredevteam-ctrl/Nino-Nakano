const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Aseguramos que las configuraciones existan desde el arranque
try {
    require('./settings');
} catch (e) {
    console.log(chalk.red('❌ Error: No se pudo cargar settings.js'));
}

module.exports = async (nino, chatUpdate) => {
    try {
        const m = chatUpdate.messages[0];
        if (!m || !m.message) return;
        
        // --- 1. BLOQUEO DE AUTO-SPAM (CRÍTICO) ---
        // Si el mensaje lo envió el propio bot, lo ignoramos para evitar bucles.
        if (m.key.fromMe) return;
        
        // Ignorar mensajes de estado
        if (m.key.remoteJid === 'status@broadcast') return;

        const from = m.key.remoteJid;
        const type = Object.keys(m.message)[0];
        const sender = m.key.participant || m.key.remoteJid;
        const senderNumber = sender ? sender.split('@')[0] : '';

        // --- 2. EXTRACCIÓN DE TEXTO ---
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';
        
        const prefix = global.prefix || '#';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const text = args.join(' ');

        // --- 3. VALIDACIÓN DE DUEÑO (SEGURA) ---
        // Si global.owners no carga, usamos un array vacío para que no tire error de "includes"
        const owners = Array.isArray(global.owners) ? global.owners : [];
        const isOwner = owners.includes(senderNumber);
        
        // --- 4. METADATOS DE GRUPO ---
        const isGroup = from.endsWith('@g.us');
        const groupMetadata = isGroup ? await nino.groupMetadata(from).catch(() => ({})) : {};
        const participants = isGroup ? (groupMetadata.participants || []) : [];
        const userAdmin = isGroup ? !!participants.find(p => p.id === sender)?.admin : false;
        const botAdmin = isGroup ? !!participants.find(p => p.id === (nino.user.id.split(':')[0] + '@s.whatsapp.net'))?.admin : false;

        // --- 5. LOG DE CONSOLA ---
        if (isCmd) {
            console.log(chalk.hex('#FF69B4').bold(`[ CMD ] ${prefix}${command} | Usuario: ${senderNumber}`));
        }

        // --- 6. EJECUTOR DE PLUGINS ---
        const pluginPath = path.join(__dirname, 'plugins');
        const files = fs.readdirSync(pluginPath).filter(f => f.endsWith('.js'));

        for (let file of files) {
            try {
                const plugin = require(path.join(pluginPath, file));
                if (plugin.command && (Array.isArray(plugin.command) ? plugin.command.includes(command) : plugin.command === command)) {
                    await plugin(nino, m, {
                        from, isGroup, isOwner, userAdmin, botAdmin, args, text, sender,
                        pushname: m.pushName || 'Usuario'
                    });
                }
            } catch (err) {
                console.error(chalk.red(`Error en plugin ${file}:`), err.message);
            }
        }

    } catch (err) {
        // Logueamos el error en Termux, pero NO mandamos mensaje al chat para evitar bucles.
        console.log(chalk.bgRed.white(' ERROR EN HANDLER '), chalk.red(err.stack));
    }
};

// Hot reload
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.green('¡Handler actualizado! 🦋'));
    delete require.cache[file];
    require(file);
});
