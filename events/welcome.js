/**
 * EVENTS/WELCOME.JS — NINO NAKANO
 * Bienvenida y despedida automática al entrar/salir del grupo
 * Se registra automáticamente desde handler.js
 * Z0RT SYSTEMS 🦋
 */

import { database } from '../lib/database.js'

// ─── MENSAJES DE BIENVENIDA ───────────────────────────────────────────────────

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

// ─── MENSAJES DE DESPEDIDA ────────────────────────────────────────────────────

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

// ─── EVENTO ───────────────────────────────────────────────────────────────────

export const event = 'group-participants.update'

export const run = async (conn, anu) => {
    try {
        if (!anu?.id || !anu?.participants?.length) return

        const db        = database.data
        const grupoData = db?.groups?.[anu.id] || {}

        // Si el grupo tiene bienvenidas desactivadas, salir
        if (grupoData.noWelcome === true) return

        // Obtener metadata del grupo
        let metadata
        try {
            metadata = await conn.groupMetadata(anu.id)
        } catch {
            console.log('[WELCOME] No se pudo obtener metadata del grupo:', anu.id)
            return
        }

        for (const num of anu.participants) {
            const nombre = num.split('@')[0]

            // Obtener foto de perfil — fallback al banner del bot
            let ppBuffer = null
            try {
                const ppUrl = await conn.profilePictureUrl(num, 'image')
                const ppRes = await fetch(ppUrl)
                ppBuffer    = Buffer.from(await ppRes.arrayBuffer())
            } catch {
                ppBuffer = await global.getBannerThumb()
            }

            if (anu.action === 'add') {
                // ── BIENVENIDA ────────────────────────────────────────────────
                const msgFn = BIENVENIDAS[Math.floor(Math.random() * BIENVENIDAS.length)]
                const texto = msgFn(nombre, metadata.subject)

                const thumb = ppBuffer || await global.getBannerThumb()
                const ctx   = global.getNewsletterCtx(
                    thumb,
                    `🎀 ${global.botName}`,
                    metadata.subject
                )
                ctx.externalAdReply.renderLargerThumbnail = true

                await conn.sendMessage(anu.id, {
                    image:       ppBuffer || await global.getBannerThumb(),
                    caption:     texto,
                    mentions:    [num],
                    contextInfo: ctx
                })

            } else if (anu.action === 'remove') {
                // ── DESPEDIDA ─────────────────────────────────────────────────
                const msgFn = DESPEDIDAS[Math.floor(Math.random() * DESPEDIDAS.length)]
                const texto = msgFn(nombre, metadata.subject)

                const thumb = ppBuffer || await global.getBannerThumb()
                const ctx   = global.getNewsletterCtx(
                    thumb,
                    `👋 ${global.botName}`,
                    metadata.subject
                )

                await conn.sendMessage(anu.id, {
                    text:        texto,
                    mentions:    [num],
                    contextInfo: ctx
                })
            }
        }

    } catch (e) {
        console.error('[WELCOME ERROR]', e.message)
    }
}
