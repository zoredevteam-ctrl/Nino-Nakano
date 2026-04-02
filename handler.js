const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Forzamos la carga de settings para evitar el error de "undefined"
try {
    require('./settings');
} catch (e) {
    console.error('⚠️ Error al cargar settings.js:', e.message);
}

module.exports = async (nino, chatUpdate) => {
    try {
        const m = chatUpdate.messages[0];
        if (!m || !m.message) return;
        
        // Ignorar mensajes de estado/status
        if (m.key && m.key.remoteJid === 'status@broadcast') return;
        
        const from = m.key.remoteJid;
        const type = Object.keys(m.message)[0];
        const sender = m.key.participant || m.key.remoteJid;
        const senderNumber = sender.split('@')[0]; // Ejemplo: 57310...

        // --- EXTRACCIÓN DEL CUERPO DEL MENSAJE ---
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';
        
        const prefix = global.prefix || '#';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const text = args.join(' ');

        // --- 🛡️ ESCUDO DEFINITIVO PARA EL OWNER (LÍNEA CRÍTICA) ---
        // Si global.owners no existe, creamos un array vacío al vuelo para evitar el error .includes()
        let ownerList = Array.isArray(global.owners) ? global.owners : [];
        if (ownerList.length === 0) {
            // Re-intento de carga si la variable está vacía
            try { 
                delete require.cache[require.resolve('./settings')]; 
                require('./settings'); 
                ownerList = global.owners || [];
            } catch {}
        }
        const isOwner = ownerList.includes(senderNumber);
        
        // --- METADATOS DE GRUPO ---
        const isGroup = from.endsWith('@g.us');
        const groupMetadata = isGroup ? await nino.groupMetadata(from).catch(() => ({})) : {};
        const participants = isGroup ? (groupMetadata.participants || []) : [];
        
        // Verificación de Admins
        const userAdmin = isGroup ? !!participants.find(p => p.id === sender)?.admin : false;
        const botAdmin = isGroup ? !!participants.find(p => p.id === (nino.user.id.split(':')[0] + '@s.whatsapp.net'))?.admin : false;

        // --- LOG DE CONSOLA (ESTILO NINO NAKANO) ---
        if (isCmd) {
            console.log(chalk.hex('#FF69B4').bold('\n---------- [ 🦋 NUEVO COMANDO 🦋 ] ----------'));
            console.log(chalk.white(`🌹 Usuario: ${senderNumber} ${isOwner ? chalk.yellow('(OWNER)') : ''}`));
            console.log(chalk.white(`🌹 Comando: ${prefix}${command}`));
            console.log(chalk.white(`🌹 Canal: ${isGroup ? groupMetadata.subject : 'Chat Privado'}`));
            console.log(chalk.hex('#FF69B4').bold('---------------------------------------------\n'));
        }

        // --- ENRUTADOR DE PLUGINS ---
        const pluginPath = path.join(__dirname, 'plugins');
        if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath);
        
        const files = fs.readdirSync(pluginPath);
        for (let file of files) {
            if (file.endsWith('.js')) {
                try {
                    const pluginPathFull = path.join(pluginPath, file);
                    // Limpiamos caché para actualizaciones en tiempo real
                    delete require.cache[require.resolve(pluginPathFull)];
                    const plugin = require(pluginPathFull);
                    
                    if (plugin.command && (Array.isArray(plugin.command) ? plugin.command.includes(command) : plugin.command === command)) {
                        await plugin(nino, m, {
                            from, isGroup, isOwner, userAdmin, botAdmin, args, text, sender,
                            pushname: m.pushName || 'Usuario'
                        });
                    }
                } catch (pluginErr) {
                    console.error(chalk.yellow(`Aviso en el plugin ${file}:`), pluginErr.message);
                }
            }
        }

    } catch (err) {
        // Error controlado para no crashear el proceso
        console.log(chalk.red.bold('ERROR_EN_HANDLER:'), err.message);
    }
};

// AUTO-RECARGA (HOT RELOAD)
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.hex('#FF69B4').bold('¡Handler actualizado correctamente! 🦋✨'));
    delete require.cache[file];
    require(file);
});
