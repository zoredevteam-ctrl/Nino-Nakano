import './settings.js';
import chalk from 'chalk';
import printLog from './lib/print.js'; // Ajustado al nombre del export que usamos antes
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
        console.log(chalk.yellow('🦋 [EVENTS] Carpeta ./events no encontrada, omitiendo...'))
        return
    }

    for (const file of files) {
        try {
            const url = pathToFileURL(join(eventsPath, file)).href
            const mod = await import(url)

            if (!mod.event || !mod.run) {
                console.log(chalk.yellow(`🦋 [EVENTS] Saltando ${file}, falta event o run`))
                continue
            }

            conn.ev.on(mod.event, (data) => {
                const id = data?.id || data?.key?.remoteJid || null
                if (mod.enabled && id && !mod.enabled(id)) return
                mod.run(conn, data)
            })

            console.log(chalk.magentaBright(`🎀 [EVENTS] ✦ ${file} → ${mod.event}`))
        } catch (e) {
            console.log(chalk.red(`[EVENTS ERROR] ${file}:`), e.message)
        }
    }
}

export const handler = async (m, conn, plugins) => {
    try {
        if (!m) return;

        await loadEvents(conn)

        // Usamos el simple.js optimizado
        m = await smsg(conn, m);

        if (m.isGroup) {
            const muted = database.data?.groups?.[m.chat]?.muted || []
            if (muted.includes(m.sender)) {
                await conn.sendMessage(m.chat, { delete: m.key })
                return
            }
        }

        // Si no hay mensaje de texto (ej. solo stickers sin caption), salir.
        if (!m.body) return;

        const prefix = getPrefix(m.body)

        // Log con estilo Nino Nakano
        if (m.body && !m.fromMe) {
            printLog(!!prefix, m.sender, m.isGroup ? m.chat : null, m.body, m.pushName)
        }

        if (!prefix) return;

        const body = m.body.slice(prefix.length).trim()
        const args = body.split(/ +/)
        const commandName = args.shift().toLowerCase()

        if (!commandName) return;

        let cmd = null

        if (prefix === '$') {
            for (const [, plugin] of plugins) {
                if (plugin.customPrefix?.includes('$')) {
                    cmd = plugin
                    args.unshift(commandName)
                    break
                }
            }
        } else {
            for (const [, plugin] of plugins) {
                if (!plugin.command) continue
                const cmds = Array.isArray(plugin.command)
                    ? plugin.command
                    : plugin.command instanceof RegExp
                        ? []
                        : [plugin.command]
                if (cmds.map(c => c.toLowerCase()).includes(commandName)) {
                    cmd = plugin
                    break
                }
            }
        }

        if (!cmd) {
            const allCommands = []
            for (const [, plugin] of plugins) {
                if (!plugin.command) continue
                const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command]
                for (const c of cmds) {
                    if (typeof c === 'string') allCommands.push(c)
                }
            }

            const similares = allCommands
                .map(c => ({ cmd: c, score: similarity(commandName, c) }))
                .filter(o => o.score >= 40)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)

            const sugerencias = similares.length
                ? similares.map(s => `> ✧ \`${prefix + s.cmd}\` » *${s.score}%*`).join('\n')
                : '> _Ninguno, estás escribiendo cualquier cosa._'

            return conn.sendMessage(m.chat, {
                text: `¿Huh? El comando *(${prefix + commandName})* no existe. ¿Acaso no sabes escribir? 🙄\n- Usa *${prefix}menu* y no me hagas perder el tiempo.\n\n*¿Tal vez quisiste decir esto?:*\n${sugerencias}`
            }, { quoted: m })
        }

        const senderRawFull = m.sender || ''
        const senderCanonical = senderRawFull.replace(/:[0-9A-Za-z]+(?=@s\.whatsapp\.net)/, '')
        if (senderCanonical !== m.sender) {
            m.realSender = m.sender
            m.sender = senderCanonical
        }

        const isROwner = isRootOwnerJid(m.sender)
        const isOwner = isROwner || isOwnerJid(m.sender)
        const isPremium = isOwner || isPremiumJid(m.sender)
        const isRegistered = isOwner || database.data.users?.[m.sender]?.registered || false

        const isGroup = m.isGroup;
        let isAdmin = false;
        let isBotAdmin = false;

        if (isGroup) {
            try {
                const groupMeta = await conn.groupMetadata(m.chat);
                const participant = groupMeta.participants.find(p =>
                    p.jid === m.sender || p.id === m.sender
                )
                isAdmin = !!participant?.admin || isOwner

                const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
                const botParticipant = groupMeta.participants.find(p =>
                    p.jid === botJid || p.id === botJid
                )
                isBotAdmin = !!botParticipant?.admin
            } catch (err) {
                console.log(chalk.red('[ERROR GROUP META]'), err.message);
            }
        }

        // 🟢 INICIALIZACIÓN SEGURA DE BASE DE DATOS 🟢
        if (!database.data.users) database.data.users = {};
        if (!database.data.groups) database.data.groups = {};

        if (!database.data.users[m.sender]) {
            database.data.users[m.sender] = {
                registered: false,
                premium: false,
                banned: false,
                warning: 0,
                exp: 0,
                level: 1,
                limit: 20,
                lastclaim: 0,
                registered_time: 0,
                name: m.pushName || '',
                age: null
            };
            // No usamos await save() aquí si tienes el auto-save del database.js
        }

        if (isGroup && !database.data.groups[m.chat]) {
            database.data.groups[m.chat] = {
                modoadmin: false,
                muted: []
            };
        }

        // Resolución who con soporte LID → JID real
        let who = null;

        if (m.mentionedJid && m.mentionedJid[0]) {
            who = m.mentionedJid[0];
        } else if (m.quoted?.sender) {
            who = m.quoted.sender;
        }

        if (who) {
            const rawNum = who.split('@')[0].split(':')[0]
            const isLid = who.endsWith('@lid') || rawNum.length > 13

            if (isLid && m.isGroup) {
                try {
                    const groupMeta = await conn.groupMetadata(m.chat)
                    const found = groupMeta.participants.find(p =>
                        p.id?.split('@')[0] === rawNum
                    )
                    if (found?.jid && found.jid.endsWith('@s.whatsapp.net')) {
                        who = found.jid.includes(':') ? found.jid.split(':')[0] + '@s.whatsapp.net' : found.jid
                    } else if (found?.id && found.id.endsWith('@s.whatsapp.net')) {
                        who = found.id
                    } else {
                        who = rawNum + '@lid'
                    }
                } catch {
                    who = rawNum + '@lid'
                }
            } else {
                who = rawNum + '@s.whatsapp.net'
            }
        }

        // 🛑 VALIDACIONES CON PERSONALIDAD TSUNDERE 🛑

        if (isGroup && database.data.groups[m.chat]?.modoadmin && !isAdmin && !isOwner) {
            return m.reply('⚙️ *𝖅0𝕽𝕿 𝕾𝖄𝕾𝕿𝕰𝕸𝕾*\n\n🔒 *MODO ADMIN ACTIVO*\n_Ni lo intentes. Solo los administradores pueden darme órdenes aquí. 💅_');
        }

        if (database.data.users[m.sender]?.banned && !isOwner) {
            return m.reply('🚫 *BANEADO*\n_¿De verdad creíste que te dejaría usar mis comandos después de lo que hiciste? Estás baneado. Aléjate. 💢_');
        }

        if (cmd.rowner && !isROwner) {
            return m.reply('👑 *SOLO PARA AAROM*\n_¿Y tú quién te crees? Este código es solo para mi creador principal. 😤_');
        }

        if (cmd.owner && !isOwner) {
            return m.reply('👑 *ACCESO RESTRINGIDO*\n_Solo mis verdaderos dueños pueden tocar esto. 💅_');
        }

        if (cmd.premium && !isPremium) {
            return m.reply('💎 *SOLO PREMIUM*\n_Ugh, qué pobre. Necesitas ser Premium para pedirme esto. 🙄_');
        }

        if (cmd.register && !isRegistered) {
            return m.reply(`📝 *NO ESTÁS REGISTRADO*\n_No hablo con extraños. Regístrate primero si quieres mi atención._\n\n> Usa: *${prefix}reg nombre.edad*\n> Ejemplo: *${prefix}reg tonto.18* 🦋`);
        }

        if (cmd.group && !isGroup) {
            return m.reply('🏢 *SOLO GRUPOS*\n_¿Intentas hacer esto en privado? Qué raro eres... Esto solo funciona en grupos. 🙄_');
        }

        if (cmd.admin && !isAdmin) {
            return m.reply('👮 *SOLO ADMINS*\n_No recibo órdenes de un usuario común como tú. Consigue admin y luego hablamos. 💅_');
        }

        if (cmd.botAdmin && !isBotAdmin) {
            return m.reply('🤖 *NECESITO ADMIN*\n_¿Quieres que haga el trabajo pero no me das administrador? Qué inútil. Dame admin primero. 😒_');
        }

        if (cmd.private && isGroup) {
            return m.reply('💬 *SOLO PRIVADO*\n_Esto es demasiado vergonzoso para el grupo... Escríbeme al privado si quieres usar esto. 😳_');
        }

        if (cmd.limit && !isPremium && !isOwner) {
            const userLimit = database.data.users[m.sender].limit || 0;
            if (userLimit < 1) {
                return m.reply(`⚠️ *LÍMITES AGOTADOS*\n_Se te acabaron los diamantes, tonto. Consigue más o vuélvete Premium si quieres seguir molestándome. 💢_`);
            }
            database.data.users[m.sender].limit -= 1;
            // No es necesario database.save() si tu interval auto-guarda
        }

        // EJECUCIÓN DEL COMANDO
        try {
            await cmd(m, {
                conn,
                args,
                isOwner,
                isROwner,
                isPremium,
                isRegistered,
                isAdmin,
                isBotAdmin,
                isGroup,
                who,
                db: database.data,
                prefix,
                plugins
            })

        } catch (e) {
            // MANEJO DE ERRORES EXTREMO DE Z0RT SYSTEMS
            console.log(chalk.red('\n[!] ERROR EN PLUGIN:'), e)

            const name = e?.name || 'Error'
            const message = e?.message || String(e)
            const stackLines = e?.stack?.split('\n') || []
            let file = null
            let line = null

            for (const l of stackLines) {
                const match = l.match(/\((.*plugins.*):(\d+):(\d+)\)/)
                if (match) {
                    file = match[1]
                    line = match[2]
                    break
                }
            }

            let debug = `
💢 *¡UGH! ROMPISTE ALGO, TONTO* 💢

_Algo salió mal en el código. Mira el desastre que causaste... Le enviaré el reporte a mis dueños._

📌 *Comando:* ${prefix + commandName}
📂 *Archivo:* ${file ? file.split('/').pop() : 'desconocido'} (Línea: ${line || '?'})
📛 *Error:* ${name}

🧾 *Detalle:*
${message.slice(0,300)}
`.trim()

            if (m?.reply) m.reply(debug)
        }

    } catch (e) {
        console.log(chalk.red('[ERROR HANDLER GLOBAL]'), e)
        if (m?.reply) {
            m.reply(`❌ *COLAPSO GLOBAL*\n_Ugh, el núcleo del bot acaba de fallar por algo grave._\n\n🧾 ${String(e).slice(0,300)}`)
        }
    }
}