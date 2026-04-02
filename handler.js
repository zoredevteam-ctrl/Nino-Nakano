const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Forzamos la carga de settings cada vez que el archivo cambia
function checkSettings() {
    try {
        delete require.cache[require.resolve('./settings')];
        require('./settings');
    } catch (e) {
        console.log(chalk.red('❌ Error crítico: No se pudo cargar settings.js'));
    }
}
checkSettings();

module.exports = async (nino, chatUpdate) => {
    try {
        const m = chatUpdate.messages[0];
        if (!m || !m.message) return;
        if (m.key && m.key.remoteJid === 'status@broadcast') return;
        
        const from = m.key.remoteJid;
        const type = Object.keys(m.message)[0];
        const sender = m.key.participant || m.key.remoteJid;
        
        // Verificación de seguridad para el remitente
        if (!sender) return;
        const senderNumber = sender.split('@')[0];

        // --- EXTRACCIÓN DE TEXTO ---
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';
        
        // Si no hay prefijo configurado, usamos '#' por defecto
        const prefix = global.prefix || '#';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const text = args.join(' ');

        // --- 🛡️ VALIDACIÓN DE OWNER ULTRA-SEGURA ---
        // Si global.owners no existe, usamos una lista vacía para que no explote el .includes
        const currentOwners = Array.isArray(global.owners) ? global.owners : [];
        const isOwner = currentOwners.includes(senderNumber);
        
        // --- METADATOS DE GRUPO ---
        const isGroup = from.endsWith('@g.us');
        const groupMetadata = isGroup ? await nino.groupMetadata(from).catch(() => ({})) : {};
        const participants = isGroup ? (groupMetadata.participants || []) : [];
        const userAdmin = isGroup ? !!participants.find(p => p.id === sender)?.admin : false;
        const botAdmin = isGroup ? !!participants.find(p => p.id === (nino.user.id.split(':')[0] + '@s.whatsapp.net'))?.admin : false;

        // --- LOG EN CONSOLA (Sin spam en WhatsApp) ---
        if (isCmd) {
            console.log(chalk.magenta(`[ CMD ] ${prefix}${command} | de: ${senderNumber}`));
        }

        // --- LECTURA DE PLUGINS ---
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
            } catch (pluginErr) {
                console.log(chalk.red(`❌ Error en plugin: ${file} ->`), pluginErr.message);
            }
        }

    } catch (err) {
        // 🚨 IMPORTANTE: Solo logueamos el error en consola para evitar spam en WhatsApp
        console.log(chalk.bgRed.white(' ERROR EN EL HANDLER '), chalk.red(err.stack));
    }
};

// Auto-update
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.green('Handler actualizado correctamente.'));
    delete require.cache[file];
    require(file);
});
