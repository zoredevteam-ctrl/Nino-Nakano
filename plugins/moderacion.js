/**
 * MODERACIÓN - NINO NAKANO
 * warn, resetwarn, warns, mute, unmute, closegroup, opengroup, antilink, antispam
 */

import { database } from '../lib/database.js'

const MAX_WARNS = 3

const getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const sendNino = async (conn, m, text) => conn.sendMessage(m.chat, {
    text,
    contextInfo: {
        externalAdReply: {
            title: `🛡️ ${global.botName || 'Nino Nakano'}`,
            body: 'Sistema de Moderación',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, { quoted: m })

const parseTiempo = (str) => {
    if (!str) return null
    const match = str.match(/^(\d+)(s|m|h|d)$/)
    if (!match) return null
    const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
    return parseInt(match[1]) * ms[match[2]]
}

const formatTiempo = (ms) => {
    if (ms >= 86400000) return `${Math.floor(ms / 86400000)}d`
    if (ms >= 3600000)  return `${Math.floor(ms / 3600000)}h`
    if (ms >= 60000)    return `${Math.floor(ms / 60000)}m`
    return `${Math.floor(ms / 1000)}s`
}

// ✅ Normalizar JID para menciones correctas
const normalizeJidMention = (jid) => {
    if (!jid) return ''
    const raw = jid.split('@')[0].split(':')[0]
    return raw + '@s.whatsapp.net'
}

const getTarget = (m) => {
    if (m.mentionedJid?.[0]) return normalizeJidMention(m.mentionedJid[0])
    if (m.quoted?.sender)    return normalizeJidMention(m.quoted.sender)
    return null
}

const isOwnerJid = (jid) => {
    const num    = (jid + '').replace(/[^0-9]/g, '').split('@')[0].split(':')[0]
    const owners = Array.isArray(global.owner) ? global.owner : []
    return owners.some(o => {
        const n = Array.isArray(o) ? (o[0] + '') : (o + '')
        return n.replace(/[^0-9]/g, '') === num
    })
}

const muteTimers  = new Map()
const spamTracker = new Map()

// ══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

let handler = async (m, { conn, command, text, args, isOwner, isAdmin, isBotAdmin, isGroup, db }) => {
    if (!isGroup) return sendNino(conn, m, `🏢 Este comando solo funciona en grupos. 🙄`)
    if (!isAdmin && !isOwner) return sendNino(conn, m, `👮 Solo los admins pueden usar esto. 💅`)

    const cmd = command.toLowerCase()

    if (!db.groups) db.groups = {}
    if (!db.groups[m.chat]) db.groups[m.chat] = { muted: [], modoadmin: false }
    const grupo = db.groups[m.chat]
    if (!grupo.warns) grupo.warns = {}
    if (!grupo.muted) grupo.muted = []

    const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'

    // ── #warn ─────────────────────────────────────────────────────────────────
    if (cmd === 'warn') {
        const target = getTarget(m)
        if (!target) return sendNino(conn, m,
            `⚠️ Menciona o responde a alguien para advertirlo.\n\nUso: *#warn @usuario* o responde su mensaje`
        )
        if (target === botJid) return sendNino(conn, m, `😤 ¿Advertirme a mí? Qué gracioso... NO.`)
        if (isOwnerJid(target) && !isOwner) return sendNino(conn, m, `👑 No puedes advertir a un owner.`)

        if (!grupo.warns[target]) grupo.warns[target] = 0
        grupo.warns[target]++
        const warns = grupo.warns[target]
        const razon = text?.replace(/@\d+/g, '').trim() || 'Sin razón especificada'

        if (warns >= MAX_WARNS) {
            grupo.warns[target] = 0
            try {
                await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
                return conn.sendMessage(m.chat, {
                    text:
                        `🚫 *USUARIO EXPULSADO*\n\n` +
                        `@${target.split('@')[0]} acumuló *${MAX_WARNS} advertencias* y fue expulsado.\n\n` +
                        `📝 *Última razón:* ${razon}\n\n_Que le vaya bien... supongo_ 💢`,
                    contextInfo: { mentionedJid: [target] }
                }, { quoted: m })
            } catch {
                return sendNino(conn, m, `❌ No pude expulsar al usuario. ¿Tengo permisos de admin? 🤖`)
            }
        }

        return conn.sendMessage(m.chat, {
            text:
                `⚠️ *ADVERTENCIA ${warns}/${MAX_WARNS}*\n\n` +
                `@${target.split('@')[0]} ha recibido una advertencia.\n\n` +
                `📝 *Razón:* ${razon}\n\n` +
                `${warns === MAX_WARNS - 1 ? `⚡ *¡Una más y será expulsado!*` : `_Más advertencias y habrá consecuencias_ 🦋`}`,
            contextInfo: { mentionedJid: [target] }
        }, { quoted: m })
    }

    // ── #resetwarn ────────────────────────────────────────────────────────────
    if (cmd === 'resetwarn' || cmd === 'clearwarn') {
        const target = getTarget(m)
        if (!target) return sendNino(conn, m, `Menciona o responde a alguien para resetear sus warns.`)
        grupo.warns[target] = 0
        return conn.sendMessage(m.chat, {
            text:
                `✅ *ADVERTENCIAS RESETEADAS*\n\n` +
                `Las advertencias de @${target.split('@')[0]} han sido borradas. 🌸\n\n` +
                `_Espero que se porte bien esta vez_ 🦋`,
            contextInfo: { mentionedJid: [target] }
        }, { quoted: m })
    }

    // ── #warns ────────────────────────────────────────────────────────────────
    if (cmd === 'warns') {
        const target = getTarget(m) || m.sender
        const warns  = grupo.warns?.[target] || 0
        return conn.sendMessage(m.chat, {
            text:
                `📋 *ADVERTENCIAS*\n\n` +
                `@${target.split('@')[0]} tiene *${warns}/${MAX_WARNS}* advertencias.\n\n` +
                `${warns === 0 ? `_Historial limpio~ Por ahora_ 🌸` : warns >= MAX_WARNS - 1 ? `⚡ _¡Está al límite!_` : `_Que no llegue al límite_ 🦋`}`,
            contextInfo: { mentionedJid: [target] }
        }, { quoted: m })
    }

    // ── #mute ─────────────────────────────────────────────────────────────────
    if (cmd === 'mute') {
        const target = getTarget(m)
        if (!target) return sendNino(conn, m,
            `🔇 Menciona o responde a alguien para mutearlo.\n\n` +
            `Uso: *#mute @usuario* o *#mute @usuario 10m*\n` +
            `Tiempos: *s* seg • *m* min • *h* hora • *d* día`
        )
        if (target === botJid)                    return sendNino(conn, m, `😤 ¿Mutearme a mí? Inténtalo~ 🙄`)
        if (isOwnerJid(target) && !isOwner) return sendNino(conn, m, `👑 No puedes mutear a un owner.`)

        const tiempoStr = args.find(a => /^\d+(s|m|h|d)$/.test(a)) || null
        const tiempoMs  = tiempoStr ? parseTiempo(tiempoStr) : null

        if (!grupo.muted.includes(target)) grupo.muted.push(target)

        const muteKey = `${m.chat}:${target}`
        if (muteTimers.has(muteKey)) { clearTimeout(muteTimers.get(muteKey)); muteTimers.delete(muteKey) }

        if (tiempoMs) {
            const timer = setTimeout(async () => {
                grupo.muted = grupo.muted.filter(j => j !== target)
                muteTimers.delete(muteKey)
                try {
                    await conn.sendMessage(m.chat, {
                        text: `🔊 @${target.split('@')[0]} ya puede hablar de nuevo. _Tiempo de mute terminó_ 🦋`,
                        contextInfo: { mentionedJid: [target] }
                    })
                } catch {}
            }, tiempoMs)
            muteTimers.set(muteKey, timer)
        }

        return conn.sendMessage(m.chat, {
            text:
                `🔇 *USUARIO MUTEADO*\n\n` +
                `@${target.split('@')[0]} ha sido silenciado${tiempoMs ? ` por *${formatTiempo(tiempoMs)}*` : ' indefinidamente'}.\n\n` +
                `Sus mensajes serán eliminados automáticamente.\n` +
                `_Usa *#unmute @usuario* para quitarlo_ 🦋`,
            contextInfo: { mentionedJid: [target] }
        }, { quoted: m })
    }

    // ── #unmute ───────────────────────────────────────────────────────────────
    if (cmd === 'unmute') {
        const target = getTarget(m)
        if (!target) return sendNino(conn, m, `Menciona o responde a alguien para desmutearlo.`)

        grupo.muted = grupo.muted.filter(j => j !== target)
        const muteKey = `${m.chat}:${target}`
        if (muteTimers.has(muteKey)) { clearTimeout(muteTimers.get(muteKey)); muteTimers.delete(muteKey) }

        return conn.sendMessage(m.chat, {
            text:
                `🔊 *USUARIO DESMUTEADO*\n\n` +
                `@${target.split('@')[0]} ya puede hablar de nuevo. 🌸\n\n` +
                `_Espero que se porte bien esta vez_ 🦋`,
            contextInfo: { mentionedJid: [target] }
        }, { quoted: m })
    }

    // ── #closegroup / #opengroup — necesitan bot admin ────────────────────────
    if (cmd === 'closegroup' || cmd === 'cerrargrupo') {
        if (!isBotAdmin) return sendNino(conn, m, `🤖 Necesito ser admin para cerrar el grupo. Dame admin primero 😒`)
        try {
            await conn.groupSettingUpdate(m.chat, 'announcement')
            return sendNino(conn, m, `🔒 *GRUPO CERRADO*\n\nSolo los admins pueden enviar mensajes ahora. 💅`)
        } catch { return sendNino(conn, m, `❌ No pude cerrar el grupo.`) }
    }

    if (cmd === 'opengroup' || cmd === 'abrirgrupo') {
        if (!isBotAdmin) return sendNino(conn, m, `🤖 Necesito ser admin para abrir el grupo. Dame admin primero 😒`)
        try {
            await conn.groupSettingUpdate(m.chat, 'not_announcement')
            return sendNino(conn, m, `🔓 *GRUPO ABIERTO*\n\nTodos pueden enviar mensajes de nuevo. 🌸`)
        } catch { return sendNino(conn, m, `❌ No pude abrir el grupo.`) }
    }

    // ── #antilink — NO necesita bot admin ────────────────────────────────────
    if (cmd === 'antilink') {
        grupo.antilink = !grupo.antilink
        return sendNino(conn, m,
            `🔗 *ANTILINK ${grupo.antilink ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}*\n\n` +
            `${grupo.antilink
                ? `Eliminaré cualquier link que se envíe aquí y advertiré al usuario. A los 3 warns → kick automático. 🦋\n\n⚠️ _Necesito ser admin para eliminar mensajes_`
                : `Ya se pueden enviar links en este grupo. 🌸`}`
        )
    }

    // ── #antispam — NO necesita bot admin ────────────────────────────────────
    if (cmd === 'antispam') {
        grupo.antispam = !grupo.antispam
        return sendNino(conn, m,
            `🚫 *ANTISPAM ${grupo.antispam ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}*\n\n` +
            `${grupo.antispam
                ? `3 mensajes seguidos en menos de 5 segundos → advierto y elimino. A los 3 warns → kick. 🦋\n\n⚠️ _Necesito ser admin para eliminar mensajes_`
                : `El antispam está desactivado en este grupo. 🌸`}`
        )
    }
}

handler.command = [
    'warn', 'resetwarn', 'clearwarn', 'warns',
    'mute', 'unmute',
    'closegroup', 'cerrargrupo', 'opengroup', 'abrirgrupo',
    'antilink', 'antispam'
]
handler.group = true
handler.admin = false

// ══════════════════════════════════════════════════════════════════════════════
// HANDLER.BEFORE — antilink, antispam, mute automático
// ══════════════════════════════════════════════════════════════════════════════
handler.before = async (m, { conn, isAdmin, isOwner }) => {
    if (!m.isGroup || !m.body) return false

    const db    = database.data
    const grupo = db?.groups?.[m.chat]
    if (!grupo) return false

    // Normalizar sender
    const sender = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
    const isAdminOrOwner = isAdmin || isOwner || isOwnerJid(sender)
    if (isAdminOrOwner) return false

    // ── Mute ──────────────────────────────────────────────────────────────────
    if (grupo.muted?.includes(sender)) {
        try { await conn.sendMessage(m.chat, { delete: m.key }) } catch {}
        return true
    }

    // ── Antilink ──────────────────────────────────────────────────────────────
    if (grupo.antilink) {
        const linkRegex = /https?:\/\/[^\s]+|www\.[^\s]+|wa\.me\/[^\s]+|chat\.whatsapp\.com\/[^\s]+/gi
        if (linkRegex.test(m.body)) {
            try { await conn.sendMessage(m.chat, { delete: m.key }) } catch {}

            if (!grupo.warns) grupo.warns = {}
            if (!grupo.warns[sender]) grupo.warns[sender] = 0
            grupo.warns[sender]++
            const warns = grupo.warns[sender]

            if (warns >= MAX_WARNS) {
                grupo.warns[sender] = 0
                try {
                    await conn.groupParticipantsUpdate(m.chat, [sender], 'remove')
                    await conn.sendMessage(m.chat, {
                        text: `🚫 @${sender.split('@')[0]} fue expulsado por enviar links repetidamente. _${MAX_WARNS} advertencias acumuladas_ 💢`,
                        contextInfo: { mentionedJid: [sender] }
                    })
                } catch {}
            } else {
                await conn.sendMessage(m.chat, {
                    text:
                        `🔗 *ANTILINK* — @${sender.split('@')[0]}\n\n` +
                        `No se permiten links en este grupo. ⚠️ Advertencia *${warns}/${MAX_WARNS}*\n\n` +
                        `${warns === MAX_WARNS - 1 ? `⚡ *¡Una más y serás expulsado!*` : `_Próxima vez habrá consecuencias_ 🦋`}`,
                    contextInfo: { mentionedJid: [sender] }
                })
            }
            return true
        }
    }

    // ── Antispam ──────────────────────────────────────────────────────────────
    if (grupo.antispam) {
        const spamKey = `${m.chat}:${sender}`
        const ahora   = Date.now()

        if (!spamTracker.has(spamKey)) {
            spamTracker.set(spamKey, { count: 1, lastMsg: ahora })
        } else {
            const tracker = spamTracker.get(spamKey)
            const diff    = ahora - tracker.lastMsg

            if (diff < 5000) {
                tracker.count++
                tracker.lastMsg = ahora

                if (tracker.count >= 3) {
                    tracker.count = 0
                    try { await conn.sendMessage(m.chat, { delete: m.key }) } catch {}

                    if (!grupo.warns) grupo.warns = {}
                    if (!grupo.warns[sender]) grupo.warns[sender] = 0
                    grupo.warns[sender]++
                    const warns = grupo.warns[sender]

                    if (warns >= MAX_WARNS) {
                        grupo.warns[sender] = 0
                        try {
                            await conn.groupParticipantsUpdate(m.chat, [sender], 'remove')
                            await conn.sendMessage(m.chat, {
                                text: `🚫 @${sender.split('@')[0]} fue expulsado por hacer spam. _${MAX_WARNS} advertencias acumuladas_ 💢`,
                                contextInfo: { mentionedJid: [sender] }
                            })
                        } catch {}
                    } else {
                        await conn.sendMessage(m.chat, {
                            text:
                                `🚫 *ANTISPAM* — @${sender.split('@')[0]}\n\n` +
                                `Detecté spam. ⚠️ Advertencia *${warns}/${MAX_WARNS}*\n\n` +
                                `${warns === MAX_WARNS - 1 ? `⚡ *¡Una más y serás expulsado!*` : `_Para el spam o habrá consecuencias_ 🦋`}`,
                            contextInfo: { mentionedJid: [sender] }
                        })
                    }
                    return true
                }
            } else {
                tracker.count   = 1
                tracker.lastMsg = ahora
            }
        }
    }

    return false
}

export default handler