const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

try {
    require('./settings');
} catch (e) {
    console.log(chalk.red('Error: No se pudo cargar settings.js'));
}

// ====================== PRE-CARGA DE PLUGINS ======================
const pluginDir = path.join(__dirname, 'plugins');
const pluginFiles = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js'));

global.allPlugins = [];

console.log(chalk.hex('#FF69B4').bold('\n🚀 Cargando plugins de Nino Nakano...\n'));

for (let file of pluginFiles) {
    try {
        const plugin = require(path.join(pluginDir, file));
        
        if (!plugin || !plugin.command) {
            console.log(chalk.yellow(`[⚠️] ${file} no tiene comando definido`));
            continue;
        }

        global.allPlugins.push(plugin);
        
        const cmds = Array.isArray(plugin.command) 
            ? plugin.command.join(', ') 
            : plugin.command;
        
        console.log(chalk.green(`[✓] ${file} → ${cmds}`));
    } catch (err) {
        console.error(chalk.red(`[✗] Error cargando ${file}: ${err.message}`));
    }
}

console.log(chalk.hex('#FF69B4').bold(`\n✅ ${global.allPlugins.length} plugins cargados correctamente\n`));
// ================================================================

module.exports = async (nino, chatUpdate) => {
    try {
        const m = chatUpdate.messages[0];
        if (!m || !m.message) return;

        if (m.key.fromMe) return;
        if (m.key.remoteJid === 'status@broadcast') return;

        const from = m.key.remoteJid;
        const type = Object.keys(m.message)[0];
        const sender = m.key.participant || m.key.remoteJid;
        const senderNumber = sender ? sender.split('@')[0] : '';

        // EXTRACCIÓN DE TEXTO
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage?.text : 
                     (type === 'imageMessage') ? m.message.imageMessage?.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage?.caption : '';

        if (!body) return;

        const prefix = global.prefix || '#';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const text = args.join(' ');

        const owners = Array.isArray(global.owners) ? global.owners : [];
        const isOwner = owners.includes(senderNumber);

        const isGroup = from.endsWith('@g.us');
        const groupMetadata = isGroup ? await nino.groupMetadata(from).catch(() => ({})) : {};
        const participants = isGroup ? (groupMetadata.participants || []) : [];
        const userAdmin = isGroup ? !!participants.find(p => p.id === sender)?.admin : false;
        const botAdmin = isGroup ? !!participants.find(p => p.id === (nino.user.id.split(':')[0] + '@s.whatsapp.net'))?.admin : false;

        if (isCmd) {
            console.log(chalk.hex('#FF69B4').bold(`[ CMD ] \( {prefix} \){command} | Usuario: ${senderNumber}`));
        }

        if (!isCmd || !command) return;

        // EJECUCIÓN DE PLUGINS (versión optimizada)
        for (let plugin of global.allPlugins) {
            try {
                const matched = Array.isArray(plugin.command)
                    ? plugin.command.some(cmd => cmd.toLowerCase() === command)
                    : plugin.command.toLowerCase() === command;

                if (matched) {
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
                    return; // solo ejecuta el primer plugin que coincida
                }
            } catch (err) {
                console.error(chalk.red(`Error ejecutando plugin: ${err.message}`));
            }
        }

    } catch (err) {
        console.log(chalk.bgRed.white(' ERROR EN HANDLER '), chalk.red(err.stack));
    }
};

// Hot reload del handler
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.green('Handler actualizado → recargando...'));
    delete require.cache[file];
    require(file);
});