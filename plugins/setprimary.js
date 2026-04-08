/**
 * SETPRIMARY - NINO NAKANO
 * Marca un grupo para que solo responda el bot principal.
 * Comandos: #setprimary, #removeprimary
 * Permisos: owner o admin del grupo
 */

let handler = async (m, { conn, command, isOwner, isAdmin, isGroup, db }) => {
    if (!isGroup) return m.reply(`🏢 *SOLO EN GRUPOS*\nEste comando solo funciona dentro de un grupo. 🙄`)

    if (!isAdmin && !isOwner) {
        return m.reply(`👮 *SOLO ADMINS*\nNo recibo órdenes de plebeyos. Consigue admin y luego hablamos 💅`)
    }

    // Asegurar estructura en db
    if (!db.groups) db.groups = {}
    if (!db.groups[m.chat]) db.groups[m.chat] = {}

    const cmd = command.toLowerCase()

    if (cmd === 'setprimary') {
        // Si ya está activo no hacer nada
        if (db.groups[m.chat].primaryOnly) {
            return m.reply(
                `🌸 *PRIMARY YA ACTIVO*\n\n` +
                `Este grupo ya está marcado como principal.\n` +
                `Solo yo respondo aquí, como debe ser. 🦋`
            )
        }

        db.groups[m.chat].primaryOnly = true

        await conn.sendMessage(m.chat, {
            text:
                `✅ *MODO PRIMARY ACTIVADO* 🌸\n\n` +
                `A partir de ahora *solo el bot principal* responderá en este grupo.\n` +
                `Los sub-bots se quedarán callados aquí. 🦋\n\n` +
                `> Para desactivarlo usa *#removeprimary*`,
            contextInfo: {
                externalAdReply: {
                    title: `🌸 ${global.botName || 'Nino Nakano'}`,
                    body: 'Modo Primary activado',
                    thumbnailUrl: global.banner || '',
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })

    } else if (cmd === 'removeprimary') {
        if (!db.groups[m.chat].primaryOnly) {
            return m.reply(
                `💭 *PRIMARY NO ESTABA ACTIVO*\n\n` +
                `Este grupo no tenía el modo primary activado. 🦋`
            )
        }

        db.groups[m.chat].primaryOnly = false

        await conn.sendMessage(m.chat, {
            text:
                `🍂 *MODO PRIMARY DESACTIVADO*\n\n` +
                `Los sub-bots ya pueden responder en este grupo nuevamente. 🦋\n\n` +
                `> Para reactivarlo usa *#setprimary*`,
            contextInfo: {
                externalAdReply: {
                    title: `🌸 ${global.botName || 'Nino Nakano'}`,
                    body: 'Modo Primary desactivado',
                    thumbnailUrl: global.banner || '',
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }
}

handler.command = ['setprimary', 'removeprimary']
handler.group = true
export default handler