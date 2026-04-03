import './settings.js';
import chalk from 'chalk';
import printLog from './lib/print.js';
import { smsg } from './lib/simple.js';
import { database } from './lib/database.js';
import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';

const toNum = v => (v + '').replace(/[^0-9]/g, '')
const localPart = v => (v + '').split('@')[0].split(':')[0].split('/')[0].split(',')[0]
const normalizeCore = v => toNum(localPart(v))

const normalizeJid = v => {
    if (!v) return ''
    if (typeof v === 'number') v = String(v)
    v = (v + '').trim()
    if (v.startsWith('@')) v = v.slice(1)
    if (v.endsWith('@g.us')) return v
    if (v.includes('@s.whatsapp.net')) {
        const n = toNum(v.split('@')[0])
        return n ? n + '@s.whatsapp.net' : v
    }
    const n = toNum(v)
    return n ? n + '@s.whatsapp.net' : v
}

function pickOwners() {
    const arr = Array.isArray(global.owner) ? global.owner : []
    const flat = []
    for (const v of arr) {
        if (Array.isArray(v)) flat.push({ num: normalizeCore(v[0]), root: !!v[2] })
        else flat.push({ num: normalizeCore(v), root: false })
    }
    return flat
}

function isOwnerJid(jid) {
    const num = normalizeCore(jid)
    return pickOwners().some(o => o.num === num)
}

function isRootOwnerJid(jid) {
    const num = normalizeCore(jid)
    return pickOwners().some(o => o.num === num && o.root)
}

function isPremiumJid(jid) {
    const num = normalizeCore(jid)
    const prems = Array.isArray(global.prems) ? global.prems.map(normalizeCore) : []
    if (prems.includes(num)) return true
    const u = database.data?.users?.[normalizeJid(jid)]
    return !!u?.premium
}

const PREFIXES = ['#', '.', '/', '$']

function getPrefix(body) {
    for (const p of PREFIXES) {
        if (body.startsWith(p)) return p
    }
    return null
}

const similarity = (a, b) => {
    let matches = 0
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] === b[i]) matches++
    }
    return Math.floor((matches / Math.max(a.length, b.length)) * 100)
}

const eventsLoadedFor = new WeakSet()

export const loadEvents = async (conn) => {
    if (!conn?.ev?.on) return
    if (eventsLoadedFor.has(conn)) return
    eventsLoadedFor.add(conn)

    const eventsPath = resolve('./events')
    let files = []

    try {
        files = readdirSync(eventsPath).filter(f => f.endsWith('.js'))
    } catch {
        console.log(chalk.yellow('🦋 [EVENTS] Carpeta ./events no encontrada...'))
        return
    }

    for (const file of files) {
        try {
            const url = pathToFileURL(join(eventsPath, file)).href
            const mod = await import(url)
            const eventMod = mod.default || mod

            if (!eventMod.event || !eventMod.run) continue

            conn.ev.on(eventMod.event, (data) => {
                const id = data?.id || data?.key?.remoteJid || null
                if (eventMod.enabled && id && !eventMod.enabled(id)) return
                eventMod.run(conn, data)
            })

            console.log(chalk.magentaBright(`🎀 [EVENTS] ✦ ${file} → ${eventMod.event}`))
        } catch (e) {
            console.log(chalk.red(`[EVENTS ERROR] ${file}:`), e.message)
        }
    }
}

export const handler = async (m, conn, plugins) => {
    try {
        if (!m) return;
        await loadEvents(conn)
        m = await smsg(conn, m);

        if (m.isGroup) {
            const muted = database.data?.groups?.[m.chat]?.muted || []
            if (muted.includes(m.sender)) {
                await conn.sendMessage(m.chat, { delete: m.key })
                return
            }
        }

        if (!m.body) return;
        const prefix = getPrefix(m.body)

        if (m.body && !m.fromMe) {
            printLog(!!prefix, m.sender, m.isGroup ? m.chat : null, m.body, m.pushName)
        }

        if (!prefix) return;

        const body = m.body.slice(prefix.length).trim()
        const args = body.split(/ +/)
        const commandName = args.shift().toLowerCase()

        if (!commandName) return;

        let cmd = null
        let pluginKey = null

        // Buscador de comandos mejorado
        for (const [key, plugin] of Object.entries(plugins)) {
            const p = plugin.default || plugin
            if (!p.command) continue
            
            const cmds = Array.isArray(p.command) ? p.command : [p.command]
            if (cmds.some(c => (typeof c === 'string' && c.toLowerCase() === commandName) || (c instanceof RegExp && c.test(commandName)))) {
                cmd = p
                pluginKey = key
                break
            }
        }

        if (!cmd) {
            const allCommands = []
            for (const [, plugin] of Object.entries(plugins)) {
                const p = plugin.default || plugin
                if (!p.command) continue
                const cmds = Array.isArray(p.command) ? p.command : [p.command]
                for (const c of cmds) if (typeof c === 'string') allCommands.push(c)
            }

            const similares = allCommands
                .map(c => ({ cmd: c, score: similarity(commandName, c) }))
                .filter(o => o.score >= 40)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)

            const sugerencias = similares.length
                ? similares.map(s => `> ✧ \`${prefix + s.cmd}\` » *${s.score}%*`).join('\n')
                : '> _No pude encontrar nada parecido... 🥺_'

            return conn.sendMessage(m.chat, {
                text: `¡Oh! Lo siento mucho, pero no encuentro el comando *(${prefix + commandName})*. 🥺 ¿Tal vez quisiste decir algo de esto?\n\n${sugerencias}\n\nSi no, puedes ver todo lo que puedo hacer con *${prefix}menu* 🌸`
            }, { quoted: m })
        }

        const isROwner = isRootOwnerJid(m.sender)
        const isOwner = isROwner || isOwnerJid(m.sender)
        const isPremium = isOwner || isPremiumJid(m.sender)
        const isRegistered = isOwner || database.data.users?.[m.sender]?.registered || false

        let isAdmin = false;
        let isBotAdmin = false;

        if (m.isGroup) {
            try {
                const groupMeta = await conn.groupMetadata(m.chat);
                isAdmin = groupMeta.participants.find(p => p.id === m.sender)?.admin || isOwner
                isBotAdmin = !!groupMeta.participants.find(p => p.id === (conn.user.id.split(':')[0] + '@s.whatsapp.net'))?.admin
            } catch (err) {
                console.log(chalk.red('[ERROR GROUP META]'), err.message);
            }
        }

        // Inicialización de DB
        if (!database.data.users[m.sender]) {
            database.data.users[m.sender] = {
                registered: false, premium: false, banned: false, warning: 0,
                exp: 0, level: 1, limit: 20, lastclaim: 0, name: m.pushName || '', age: null
            };
        }
        if (m.isGroup && !database.data.groups[m.chat]) {
            database.data.groups[m.chat] = { modoadmin: false, muted: [] };
        }

        // 🛑 VALIDACIONES TIERNAS 🛑

        if (m.isGroup && database.data.groups[m.chat]?.modoadmin && !isAdmin) {
            return m.reply('🌸 *AVISO LINDO*\n\nLo siento mucho, pero el modo administrador está activo y solo ellos pueden darme órdenes ahora. 🥺✨');
        }

        if (database.data.users[m.sender]?.banned && !isOwner) {
            return m.reply('🚫 *AVISO*\n\nLo siento, pero no tengo permitido hablar contigo porque estás en la listita de baneados... 😔🌸');
        }

        if (cmd.rowner && !isROwner) {
            return m.reply('👑 *EXCLUSIVO*\n\n¡Perdón! 🥺 Este comando es súper especial y solo Aarom puede usarlo. ✨');
        }

        if (cmd.owner && !isOwner) {
            return m.reply('👑 *SOLO DUEÑOS*\n\nSolo Aarom y Félix pueden usar esto... ¡No te sientas mal, por favor! 💕');
        }

        if (cmd.premium && !isPremium) {
            return m.reply('💎 *PREMIUM*\n\nEsta función es para mis usuarios Premium. 🌸 ¿Te gustaría ser uno de ellos? ✨');
        }

        if (cmd.register && !isRegistered) {
            return m.reply(`📝 *REGISTRO*\n\n¡Hola! 🥰 Todavía no nos conocemos bien. ¿Podrías registrarte para que pueda recordarte?\n\n> Usa: *${prefix}reg nombre.edad* 🦋`);
        }

        if (cmd.group && !m.isGroup) {
            return m.reply('🏢 *GRUPOS*\n\n¡Ay! 🌸 Este comando solo puedo hacerlo si estamos en un grupito. ¿Vamos a uno? 🥺');
        }

        if (cmd.admin && !isAdmin) {
            return m.reply('👮 *ADMINS*\n\nSolo los administradores del grupo pueden pedirme esto. ¡Espero que lo entiendas! 😼🌸');
        }

        if (cmd.botAdmin && !isBotAdmin) {
            return m.reply('🤖 *NECESITO ADMIN*\n\nPara poder ayudarte con esto, necesito que me des permisos de administradora primero, ¿sí? 🥺💕');
        }

        if (cmd.limit && !isPremium && !isOwner) {
            if (database.data.users[m.sender].limit < 1) {
                return m.reply(`⚠️ *SIN DIAMANTES*\n\n¡Oh no! Se te acabaron tus diamantes. 🥺 Pero no te preocupes, mañana te daré más o puedes pedirle a Aarom que te ayude. ✨`);
            }
            database.data.users[m.sender].limit -= 1;
        }

        // EJECUCIÓN
        try {
            await cmd(m, { conn, args, isOwner, isROwner, isPremium, isAdmin, isBotAdmin, isGroup: m.isGroup, prefix, plugins })
        } catch (e) {
            console.log(chalk.red('\n[!] ERROR EN PLUGIN:'), e)
            m.reply(`🌸 *¡AY! ALGO SALIÓ MAL...*\n\nPerdóname, hubo un errorcito al procesar el comando. 🥺 Aarom ya debe estar avisado para arreglarlo. \n\n\`\`\`${e.message}\`\`\``)
        }

    } catch (e) {
        console.log(chalk.red('[ERROR HANDLER GLOBAL]'), e)
    }
}
