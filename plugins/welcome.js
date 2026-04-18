/**
 * BIENVENIDA & DESPEDIDA - NINO NAKANO
 * Se activa automáticamente cuando alguien entra o sale del grupo
 * #welcome on/off — activar/desactivar bienvenidas (admin)
 */

import { database } from '../lib/database.js'

const getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

// Mensajes de bienvenida — se elige uno al azar
const BIENVENIDAS = [
    (nombre, grupo) =>
        `🎀 *¡Bienvenid@ @${nombre}!* 🦋\n\n` +
        `Nos alegra mucho que hayas llegado a *${grupo}* 💕\n\n` +
        `Esperamos que disfrutes tu estadía en este maravilloso grupo~ 🦋\n` +
        `¡Siéntete como en casa!`,

    (nombre, grupo) =>
        `✨ *¡Hola @${nombre}!* 🌟\n\n` +
        `¡Qué bueno que llegaste a *${grupo}*! 🎀\n\n` +
        `Este grupo es un lugar especial y tú ya formas parte de él 💕\n` +
        `Esperamos que lo pases increíble por aquí~ 🌸`,

    (nombre, grupo) =>
        `💐 *¡@${nombre} ha llegado!* 🎀\n\n` +
        `*${grupo}* te da la más cálida bienvenida 🦋\n\n` +
        `Que tu estadía aquí sea maravillosa y llena de buenos momentos~ ✨🦋`,

    (nombre, grupo) =>
        `🎀 *¡Bienvenid@ al grupo, @${nombre}!* 💫\n\n` +
        `*${grupo}* se alegra de tenerte aquí 🌸\n\n` +
        `Disfruta, participa y pásatela genial~ 🎉💕`,

    (nombre, grupo) =>
        `🌟 *¡Ey, @${nombre}!* Bienvenid@ a *${grupo}* 🌺\n\n` +
        `Llegaste al lugar indicado~ 💕\n` +
        `Esperamos que disfrutes cada momento en este maravilloso grupo 🦋✨`
]

// Mensajes de despedida — se elige uno al azar
const DESPEDIDAS = [
    (nombre, grupo) =>
        `🍂 *Hasta luego, @${nombre}~* 👋\n\n` +
        `Se va de *${grupo}* pero los buenos momentos quedan 💭\n` +
        `¡Cuídate mucho! 🌸`,

    (nombre, grupo) =>
        `👋 *Bye bye, @${nombre}!*\n\n` +
        `Se despide de *${grupo}*... 🍃\n` +
        `¡Que te vaya súper bien por donde vayas! ✨`,

    (nombre, grupo) =>
        `🌙 *@${nombre} ha salido del grupo~*\n\n` +
        `*${grupo}* te desea lo mejor 💫\n` +
        `¡Hasta la próxima si nos volvemos a ver! 🦋`,

    (nombre, grupo) =>
        `🎐 *Adiós, @${nombre}~* 💨\n\n` +
        `Gracias por haber sido parte de *${grupo}* 🌸\n` +
        `¡Mucho éxito en todo lo que venga! ⭐`,

    (nombre, grupo) =>
        `✌️ *@${nombre} se fue de *${grupo}**\n\n` +
        `Fue un placer tenerte aquí~ 💕\n` +
        `¡Cuídate y vuelve cuando quieras! 🌺`
]

// ── Handler para #welcome on/off ──────────────────────────────────────────────
let handler = async (m, { conn, command, text, isAdmin, isOwner, isGroup, db }) => {
    if (!isGroup) return m.reply(`🏢 Este comando solo funciona en grupos. 🙄`)
    if (!isAdmin && !isOwner) return m.reply(`👮 Solo los admins pueden configurar esto. 💅`)

    if (!db.groups)         db.groups         = {}
    if (!db.groups[m.chat]) db.groups[m.chat] = {}
    const grupo = db.groups[m.chat]

    const accion = (text || '').toLowerCase().trim()

    if (accion !== 'on' && accion !== 'off') {
        return conn.sendMessage(m.chat, {
            text:
                `🌸 *BIENVENIDAS Y DESPEDIDAS*\n\n` +
                `Estado actual: *${grupo.noWelcome === true ? 'DESACTIVADO ❌' : 'ACTIVADO ✅'}*\n\n` +
                `Usa:\n` +
                `▸ *#welcome on* — activar\n` +
                `▸ *#welcome off* — desactivar\n\n` +
                `_Cuando está activado, el bot da la bienvenida y despedida automáticamente_ 🦋`,
            contextInfo: {
                externalAdReply: {
                    title: `🌸 ${global.botName || 'Nino Nakano'}`,
                    body: 'Sistema de Bienvenidas',
                    thumbnail: await getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }

    grupo.noWelcome = accion === 'off'

    return conn.sendMessage(m.chat, {
        text:
            `🌸 *BIENVENIDAS ${accion === 'on' ? 'ACTIVADAS ✅' : 'DESACTIVADAS ❌'}*\n\n` +
            `${accion === 'on'
                ? `Daré la bienvenida y despedida a los miembros automáticamente~ 🦋`
                : `Las bienvenidas y despedidas están desactivadas en este grupo. 🍂`}`,
        contextInfo: {
            externalAdReply: {
                title: `🌸 ${global.botName || 'Nino Nakano'}`,
                body: 'Sistema de Bienvenidas',
                thumbnail: await getBannerBuffer(),
                sourceUrl: global.rcanal || '',
                mediaType: 1,
                renderLargerThumbnail: false
            }
        }
    }, { quoted: m })
}

handler.command = ['welcome', 'setwelcome', 'bienvenida']
handler.group   = true

// ── Evento de participantes ───────────────────────────────────────────────────
handler.participantsUpdate = async (conn, anu, db) => {
    try {
        const metadata  = await conn.groupMetadata(anu.id)
        const grupoData = db?.groups?.[anu.id] || {}

        // Si el grupo tiene bienvenidas desactivadas, salir
        if (grupoData.noWelcome === true) return

        const canalLink = global.rcanal || ''

        for (const num of anu.participants) {
            const nombre = num.split('@')[0]

            // Obtener foto de perfil del usuario como Buffer
            let ppBuffer = null
            try {
                const ppUrl = await conn.profilePictureUrl(num, 'image')
                const ppRes = await fetch(ppUrl)
                ppBuffer    = Buffer.from(await ppRes.arrayBuffer())
            } catch {
                // Si no tiene foto, usar banner del bot
                ppBuffer = await getBannerBuffer()
            }

            if (anu.action === 'add') {
                // ── Bienvenida ────────────────────────────────────────────────
                const msgFn  = BIENVENIDAS[Math.floor(Math.random() * BIENVENIDAS.length)]
                const texto  = msgFn(nombre, metadata.subject)

                await conn.sendMessage(anu.id, {
                    image: ppBuffer,
                    caption: texto,
                    mentions: [num],
                    contextInfo: {
                        mentionedJid: [num],
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                            serverMessageId: '',
                            newsletterName: global.newsletterName || global.botName || 'Nino Nakano'
                        }
                    }
                })

            } else if (anu.action === 'remove') {
                // ── Despedida ─────────────────────────────────────────────────
                const msgFn = DESPEDIDAS[Math.floor(Math.random() * DESPEDIDAS.length)]
                const texto = msgFn(nombre, metadata.subject)

                await conn.sendMessage(anu.id, {
                    text: texto,
                    mentions: [num],
                    contextInfo: {
                        mentionedJid: [num],
                        externalAdReply: {
                            title: `👋 ${global.botName || 'Nino Nakano'}`,
                            body: metadata.subject,
                            thumbnail: ppBuffer || await getBannerBuffer(),
                            sourceUrl: canalLink,
                            mediaType: 1,
                            renderLargerThumbnail: false
                        }
                    }
                })
            }
        }
    } catch (e) {
        console.error('[WELCOME ERROR]', e.message)
    }
}

export default handler