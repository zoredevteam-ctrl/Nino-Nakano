import './settings.js';
import chalk from 'chalk';
import printLog from './lib/print.js';
import { smsg } from './lib/simple.js';
import { database } from './lib/database.js';
import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';

// ————————————————————————————————————————————————————————————————————
// UTILIDADES DE JID (Siguen igual para no romper tu base)
// ————————————————————————————————————————————————————————————————————
const toNum = v => (v + '').replace(/[^0-9]/g, '')
const localPart = v => (v + '').split('@')[0].split(':')[0].split('/')[0].split(',')[0]
const normalizeCore = v => toNum(localPart(v))

function pickOwners() {
    const arr = Array.isArray(global.owner) ? global.owner : []
    return arr.map(v => ({ num: normalizeCore(Array.isArray(v) ? v[0] : v), root: !!v[2] }))
}

const isOwnerJid = jid => pickOwners().some(o => o.num === normalizeCore(jid))
const isRootOwnerJid = jid => pickOwners().some(o => o.num === normalizeCore(jid) && o.root)

const PREFIXES = ['#', '.', '/', '$']
const getPrefix = body => {
    for (const p of PREFIXES) if (body.startsWith(p)) return p
    return null
}

// ————————————————————————————————————————————————————————————————————
// HANDLER PRINCIPAL 🌸
// ————————————————————————————————————————————————————————————————————
export const handler = async (m, conn, plugins) => {
    try {
        if (!m) return;
        m = await smsg(conn, m); // Convertimos el mensaje

        // 1. Ignorar si el bot se habla a sí mismo o no hay cuerpo
        if (!m.body || m.fromMe) return;

        const prefix = getPrefix(m.body)
        
        // Log en consola para ver qué pasa
        printLog(!!prefix, m.sender, m.isGroup ? m.chat : null, m.body, m.pushName)

        if (!prefix) return;

        const body = m.body.slice(prefix.length).trim()
        const args = body.split(/ +/)
        const commandName = args.shift().toLowerCase()
        if (!commandName) return;

        // ————————————————————————————————————————————————————————————
        // BUSCADOR DE COMANDOS REFORZADO (Aquí estaba el fallo) 🛠️
        // ————————————————————————————————————————————————————————————
        let cmd = null;
        
        // Buscamos en el objeto o array de plugins
        const pluginEntries = Object.values(plugins);
        
        for (const plugin of pluginEntries) {
            // Revisamos si el plugin tiene .default (común en ESM) o es el objeto directo
            const p = plugin?.default || plugin;
            if (!p || !p.command) continue;

            // Normalizamos el comando del plugin a un array
            const cmds = Array.isArray(p.command) ? p.command : [p.command];
            
            // Verificamos si coincide con lo que el usuario escribió
            if (cmds.some(c => (typeof c === 'string' && c.toLowerCase() === commandName) || (c instanceof RegExp && c.test(commandName)))) {
                cmd = p;
                break;
            }
        }

        // Si no encuentro el comando...
        if (!cmd) {
            return m.reply(`¡Lo siento mucho! 🥺 No encontré el comando *${prefix + commandName}*.\n\n¿Tal vez te equivocaste al escribir? Puedes revisar todo lo que puedo hacer usando *${prefix}menu* 🌸✨`);
        }

        // ————————————————————————————————————————————————————————————
        // VALIDACIONES DE PERMISOS (Tiernas 🎀)
        // ————————————————————————————————————————————————————————————
        const isROwner = isRootOwnerJid(m.sender)
        const isOwner = isROwner || isOwnerJid(m.sender)
        
        // Permisos del grupo
        let isAdmin = false, isBotAdmin = false;
        if (m.isGroup) {
            const groupMetadata = await conn.groupMetadata(m.chat);
            isAdmin = groupMetadata.participants.find(p => p.id === m.sender)?.admin || isOwner;
            isBotAdmin = !!groupMetadata.participants.find(p => p.id === (conn.user.id.split(':')[0] + '@s.whatsapp.net'))?.admin;
        }

        // Inicializar usuario en DB si no existe
        if (!database.data.users[m.sender]) {
            database.data.users[m.sender] = { registered: false, premium: false, limit: 20, name: m.pushName || 'Usuario' };
        }

        // Filtros de seguridad
        if (cmd.rowner && !isROwner) return m.reply('¡Ay! 🥺 Este comando es solo para mi creador Aarom. ✨');
        if (cmd.owner && !isOwner) return m.reply('Perdóname, pero solo Aarom y Félix pueden usar esto... 🥺💕');
        if (cmd.group && !m.isGroup) return m.reply('¡Solo puedo hacer esto en grupos! 🏢🌸');
        if (cmd.admin && !isAdmin) return m.reply('Solo los administradores pueden pedirme esto... ¡Lo siento! 🥺✨');
        if (cmd.botAdmin && !isBotAdmin) return m.reply('Necesito ser administradora para poder ayudarte con eso... 🥺💕');

        // ————————————————————————————————————————————————————————————
        // EJECUCIÓN DEL PLUGIN 🚀
        // ————————————————————————————————————————————————————————————
        try {
            await cmd(m, { 
                conn, args, isOwner, isROwner, isAdmin, isBotAdmin, 
                isGroup: m.isGroup, prefix, plugins, db: database.data 
            });
        } catch (e) {
            console.error(chalk.red('[ERROR EN PLUGIN]:'), e);
            m.reply(`🌸 *¡AY! HUBO UN PROBLEMITA...*\n\nLo siento mucho, Aarom, pero algo falló al ejecutar el comando. 🥺\n\n\`\`\`${e.message}\`\`\``);
        }

    } catch (e) {
        console.error(chalk.red('[ERROR CRÍTICO]:'), e);
    }
}
