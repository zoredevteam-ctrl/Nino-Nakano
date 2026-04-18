/**
 * COMANDOS SOCIALES - NINO NAKANO
 * #casar @usuario — propuesta de matrimonio
 * #divorcio — terminar matrimonio
 * #adoptar @usuario — adoptar a alguien
 * #duelo @usuario — duelo por diamantes
 * #perfil — ver perfil social
 */

import { database } from '../lib/database.js'

const COSTO_BODA    = 50   // diamantes para casarse
const APUESTA_DUELO = 20   // diamantes en juego en duelo
const DUELO_TIMEOUT = 30000 // 30 segundos para aceptar

const pendingBodas  = new Map() // chatId:targetJid → { from, timeout }
const pendingDuelos = new Map() // chatId:targetJid → { from, apuesta, timeout }

const getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const sendNino = async (conn, chat, text, quoted = null) => conn.sendMessage(chat, {
    text,
    contextInfo: {
        externalAdReply: {
            title: `💕 ${global.botName || 'Nino Nakano'}`,
            body: 'Comandos Sociales 🌸',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, quoted ? { quoted } : {})

const normalizeJid = (jid) => (jid || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'

let handler = async (m, { conn, command, text, args, isGroup, db }) => {
    const cmd    = command.toLowerCase()
    const sender = normalizeJid(m.sender)
    const user   = database.getUser(sender)

    if (!db.users) db.users = {}

    // ── #casar — proponer matrimonio ──────────────────────────────────────────
    if (cmd === 'casar' || cmd === 'proponer' || cmd === 'marry') {
        if (!isGroup) return sendNino(conn, m.chat, `🏢 Las bodas solo en grupos~ 💕`, m)

        const target = m.mentionedJid?.[0] ? normalizeJid(m.mentionedJid[0])
                     : m.quoted?.sender    ? normalizeJid(m.quoted.sender)
                     : null

        if (!target) return sendNino(conn, m.chat,
            `💍 *MATRIMONIO*\n\n` +
            `Menciona o responde a quien quieres proponer matrimonio~\n\n` +
            `Uso: *#casar @usuario*\n` +
            `Costo: *${COSTO_BODA} 💎*\n\n` +
            `_Tienen 30 segundos para aceptar con *#aceptar*_ 🦋`, m
        )

        if (target === sender) return sendNino(conn, m.chat, `💔 No puedes casarte contigo mismo/a~ 😅`, m)

        // Verificar si ya está casado
        if (user.casadoCon) {
            return sendNino(conn, m.chat,
                `💍 Ya estás casado/a con @${user.casadoCon.split('@')[0]}~\n\n` +
                `Usa *#divorcio* primero si quieres casarte con otra persona. 🌸`,
                m
            )
        }

        // Verificar diamantes
        if ((user.limit || 0) < COSTO_BODA) {
            return sendNino(conn, m.chat,
                `💔 No tienes suficientes diamantes para la boda.\n\n` +
                `Necesitas: *${COSTO_BODA} 💎*\n` +
                `Tienes: *${user.limit || 0} 💎*\n\n` +
                `_Gana más con #daily, #work y #minar_ 🦋`, m
            )
        }

        const key = `${m.chat}:${target}`
        if (pendingBodas.has(key)) return sendNino(conn, m.chat, `⏳ Ya hay una propuesta pendiente para esa persona. 🦋`, m)

        const timeout = setTimeout(() => {
            pendingBodas.delete(key)
            conn.sendMessage(m.chat, {
                text: `💔 La propuesta de @${sender.split('@')[0]} expiró. Nadie dijo que sí... 🍂`,
                contextInfo: { mentionedJid: [sender] }
            })
        }, DUELO_TIMEOUT)

        pendingBodas.set(key, { from: sender, timeout })

        await conn.sendMessage(m.chat, {
            text:
                `💍 *¡PROPUESTA DE MATRIMONIO!*\n\n` +
                `@${sender.split('@')[0]} le propone matrimonio a @${target.split('@')[0]}~ 💕\n\n` +
                `💎 *Costo:* ${COSTO_BODA} diamantes\n\n` +
                `@${target.split('@')[0]}, responde *#aceptar* en 30 segundos~ 🌸`,
            contextInfo: { mentionedJid: [sender, target] }
        }, { quoted: m })
        return
    }

    // ── #aceptar — aceptar propuesta ──────────────────────────────────────────
    if (cmd === 'aceptar') {
        if (!isGroup) return

        const key = `${m.chat}:${sender}`
        const propuesta = pendingBodas.get(key)
        if (!propuesta) return sendNino(conn, m.chat, `💭 No tienes ninguna propuesta pendiente. 🦋`, m)

        clearTimeout(propuesta.timeout)
        pendingBodas.delete(key)

        const from     = propuesta.from
        const fromUser = database.getUser(from)

        // Cobrar diamantes
        fromUser.limit = (fromUser.limit || 0) - COSTO_BODA

        // Registrar matrimonio
        fromUser.casadoCon = sender
        user.casadoCon     = from
        fromUser.fechaBoda = Date.now()
        user.fechaBoda     = Date.now()

        await conn.sendMessage(m.chat, {
            text:
                `💒 *¡SE CASARON!* 🎉\n\n` +
                `@${from.split('@')[0]} 💕 @${sender.split('@')[0]}\n\n` +
                `¡Felicidades a los novios! Que sean muy felices~ 🌸🦋\n\n` +
                `> _Pueden ver su perfil con *#perfil*_ 💍`,
            contextInfo: { mentionedJid: [from, sender] }
        })
        return
    }

    // ── #divorcio — terminar matrimonio ───────────────────────────────────────
    if (cmd === 'divorcio' || cmd === 'divorce') {
        if (!user.casadoCon) return sendNino(conn, m.chat, `💭 No estás casado/a con nadie. 🦋`, m)

        const ex          = user.casadoCon
        const exUser      = database.getUser(ex)
        user.casadoCon    = null
        user.fechaBoda    = null
        if (exUser.casadoCon === sender) {
            exUser.casadoCon = null
            exUser.fechaBoda = null
        }

        await conn.sendMessage(m.chat, {
            text:
                `💔 *DIVORCIO*\n\n` +
                `@${sender.split('@')[0]} y @${ex.split('@')[0]} se han divorciado.\n\n` +
                `_A veces el amor no es suficiente... 🍂_`,
            contextInfo: { mentionedJid: [sender, ex] }
        }, { quoted: m })
        return
    }

    // ── #adoptar — adoptar a un usuario ──────────────────────────────────────
    if (cmd === 'adoptar' || cmd === 'adopt') {
        if (!isGroup) return sendNino(conn, m.chat, `🏢 Solo en grupos~ 🦋`, m)

        const target = m.mentionedJid?.[0] ? normalizeJid(m.mentionedJid[0])
                     : m.quoted?.sender    ? normalizeJid(m.quoted.sender)
                     : null

        if (!target) return sendNino(conn, m.chat,
            `👨‍👧 *ADOPCIÓN*\n\nMenciona a quien quieres adoptar~\n\nUso: *#adoptar @usuario* 🦋`, m
        )

        if (target === sender) return sendNino(conn, m.chat, `😅 No puedes adoptarte a ti mismo/a.`, m)

        const targetUser = database.getUser(target)

        if (targetUser.padre || targetUser.madre) {
            return sendNino(conn, m.chat,
                `👨‍👧 @${target.split('@')[0]} ya tiene familia.\n\n` +
                `_Padres: @${(targetUser.padre || targetUser.madre)?.split('@')[0]}_ 🦋`,
                m
            )
        }

        // Asignar familia
        if (!user.hijos) user.hijos = []
        user.hijos.push(target)

        // Determinar si es padre o madre (al azar si no hay info de género)
        targetUser.padre = sender

        await conn.sendMessage(m.chat, {
            text:
                `👨‍👧 *¡ADOPCIÓN EXITOSA!* 🎉\n\n` +
                `@${sender.split('@')[0]} ahora es padre/madre de @${target.split('@')[0]}~ 💕\n\n` +
                `_¡Cuídalo/a mucho!_ 🌸🦋`,
            contextInfo: { mentionedJid: [sender, target] }
        }, { quoted: m })
        return
    }

    // ── #duelo — duelo por diamantes ──────────────────────────────────────────
    if (cmd === 'duelo' || cmd === 'duel') {
        if (!isGroup) return sendNino(conn, m.chat, `🏢 Los duelos solo en grupos~ ⚔️`, m)

        const target = m.mentionedJid?.[0] ? normalizeJid(m.mentionedJid[0])
                     : m.quoted?.sender    ? normalizeJid(m.quoted.sender)
                     : null

        if (!target) return sendNino(conn, m.chat,
            `⚔️ *DUELO*\n\nMenciona a quien quieres retar~\n\nUso: *#duelo @usuario*\nApuesta: *${APUESTA_DUELO} 💎*\n\n_Tienen 30 segundos para aceptar con *#aceptarduelo*_ 🦋`, m
        )

        if (target === sender) return sendNino(conn, m.chat, `😅 No puedes retar a ti mismo/a.`, m)

        if ((user.limit || 0) < APUESTA_DUELO) {
            return sendNino(conn, m.chat,
                `💔 No tienes suficientes diamantes para el duelo.\n\n` +
                `Necesitas: *${APUESTA_DUELO} 💎*\n` +
                `Tienes: *${user.limit || 0} 💎* 🦋`, m
            )
        }

        const key = `${m.chat}:${target}`
        if (pendingDuelos.has(key)) return sendNino(conn, m.chat, `⏳ Ya hay un duelo pendiente. 🦋`, m)

        const timeout = setTimeout(() => {
            pendingDuelos.delete(key)
            conn.sendMessage(m.chat, {
                text: `⚔️ El reto de @${sender.split('@')[0]} expiró. Nadie aceptó el duelo. 🍂`,
                contextInfo: { mentionedJid: [sender] }
            })
        }, DUELO_TIMEOUT)

        pendingDuelos.set(key, { from: sender, apuesta: APUESTA_DUELO, timeout })

        await conn.sendMessage(m.chat, {
            text:
                `⚔️ *¡RETO DE DUELO!*\n\n` +
                `@${sender.split('@')[0]} reta a @${target.split('@')[0]}~ 💢\n\n` +
                `💎 *Apuesta:* ${APUESTA_DUELO} diamantes\n\n` +
                `@${target.split('@')[0]}, responde *#aceptarduelo* en 30 segundos~ ⚔️`,
            contextInfo: { mentionedJid: [sender, target] }
        }, { quoted: m })
        return
    }

    // ── #aceptarduelo ─────────────────────────────────────────────────────────
    if (cmd === 'aceptarduelo') {
        if (!isGroup) return

        const key   = `${m.chat}:${sender}`
        const duelo = pendingDuelos.get(key)
        if (!duelo) return sendNino(conn, m.chat, `💭 No tienes ningún reto pendiente. 🦋`, m)

        const targetUser = database.getUser(sender)
        if ((targetUser.limit || 0) < duelo.apuesta) {
            clearTimeout(duelo.timeout)
            pendingDuelos.delete(key)
            return sendNino(conn, m.chat,
                `💔 No tienes suficientes diamantes para aceptar el duelo.\n\n` +
                `Necesitas: *${duelo.apuesta} 💎*\n` +
                `Tienes: *${targetUser.limit || 0} 💎* 🦋`, m
            )
        }

        clearTimeout(duelo.timeout)
        pendingDuelos.delete(key)

        const from     = duelo.from
        const fromUser = database.getUser(from)

        // Duelo aleatorio
        const ganador  = Math.random() < 0.5 ? from : sender
        const perdedor = ganador === from ? sender : from
        const ganUser  = database.getUser(ganador)
        const perUser  = database.getUser(perdedor)

        ganUser.limit  = (ganUser.limit  || 0) + duelo.apuesta
        perUser.limit  = Math.max(0, (perUser.limit || 0) - duelo.apuesta)

        const ataques = [
            'lanzó un Rasengan épico',
            'usó el Sharingan perfectamente',
            'ejecutó un Kamehameha devastador',
            'activó su Gear 5',
            'desenvainó las tres espadas',
            'usó One For All al 100%'
        ]
        const ataque = ataques[Math.floor(Math.random() * ataques.length)]

        await conn.sendMessage(m.chat, {
            text:
                `⚔️ *¡FIN DEL DUELO!* 🏆\n\n` +
                `@${ganador.split('@')[0]} ${ataque} y venció a @${perdedor.split('@')[0]}~\n\n` +
                `🏆 *Ganador:* @${ganador.split('@')[0]} +${duelo.apuesta} 💎\n` +
                `💔 *Perdedor:* @${perdedor.split('@')[0]} -${duelo.apuesta} 💎\n\n` +
                `_¡Mejor suerte la próxima vez!_ 🦋`,
            contextInfo: { mentionedJid: [ganador, perdedor] }
        })
        return
    }

    // ── #perfil — ver perfil social ───────────────────────────────────────────
    if (cmd === 'perfil' || cmd === 'profile') {
        const target     = m.mentionedJid?.[0] ? normalizeJid(m.mentionedJid[0])
                         : m.quoted?.sender    ? normalizeJid(m.quoted.sender)
                         : sender
        const targetUser = database.getUser(target)
        const nombre     = target === sender ? (m.pushName || 'Tú') : `@${target.split('@')[0]}`

        const casado  = targetUser.casadoCon
            ? `💍 Casado/a con @${targetUser.casadoCon.split('@')[0]}`
            : '💔 Soltero/a'

        const hijos   = targetUser.hijos?.length
            ? `👶 Hijos: ${targetUser.hijos.length}`
            : '👶 Sin hijos'

        const padre   = targetUser.padre
            ? `👨 Padre/Madre: @${targetUser.padre.split('@')[0]}`
            : ''

        await conn.sendMessage(m.chat, {
            text:
                `👤 *PERFIL SOCIAL*\n\n` +
                `*${nombre}*\n\n` +
                `${casado}\n` +
                `${hijos}\n` +
                `${padre ? padre + '\n' : ''}` +
                `\n💎 *Diamantes:* ${targetUser.limit || 0}\n` +
                `✨ *Experiencia:* ${targetUser.xp || targetUser.exp || 0}\n` +
                `⭐ *Nivel:* ${targetUser.level || 1}\n\n` +
                `> _¡Usa #casar, #adoptar y #duelo para interactuar!_ 🦋`,
            contextInfo: target !== sender ? { mentionedJid: [target] } : {}
        }, { quoted: m })
    }
}

handler.command = [
    'casar', 'proponer', 'marry', 'aceptar',
    'divorcio', 'divorce',
    'adoptar', 'adopt',
    'duelo', 'duel', 'aceptarduelo',
    'perfil', 'profile'
]
export default handler