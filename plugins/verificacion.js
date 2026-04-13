/**
 * VERIFICACIÓN DE EDAD - NINO NAKANO
 * #setedad <minimo> — admin configura edad mínima del grupo
 * #verificar <edad> — usuario verifica su edad
 * #edadoff — desactivar verificación
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

const sendNino = async (conn, m, text) => conn.sendMessage(m.chat, {
    text,
    contextInfo: {
        externalAdReply: {
            title: `🔞 ${global.botName || 'Nino Nakano'}`,
            body: 'Verificación de Edad',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, { quoted: m })

let handler = async (m, { conn, command, text, args, isAdmin, isOwner, isGroup, isBotAdmin, db }) => {
    const cmd = command.toLowerCase()

    if (!isGroup) return m.reply(`🏢 Este comando solo funciona en grupos. 🙄`)

    if (!db.groups) db.groups = {}
    if (!db.groups[m.chat]) db.groups[m.chat] = {}
    const grupo = db.groups[m.chat]

    // ── #setedad — configurar edad mínima (admin) ─────────────────────────────
    if (cmd === 'setedad') {
        if (!isAdmin && !isOwner) return sendNino(conn, m, `👮 Solo los admins pueden configurar esto. 💅`)

        const edad = parseInt(args[0])
        if (!edad || edad < 1 || edad > 100) {
            return sendNino(conn, m,
                `🔞 *CONFIGURAR EDAD MÍNIMA*\n\n` +
                `Uso: *#setedad <edad>*\n` +
                `Ejemplo: *#setedad 18*\n\n` +
                `_Los usuarios deberán verificar tener esa edad mínima para usar el bot en este grupo_ 🦋`
            )
        }

        grupo.edadMinima    = edad
        grupo.verificarEdad = true

        return sendNino(conn, m,
            `✅ *VERIFICACIÓN DE EDAD ACTIVADA*\n\n` +
            `Edad mínima configurada: *${edad} años*\n\n` +
            `Los usuarios deben usar *#verificar <su edad>* para poder usar el bot.\n` +
            `Los que no cumplan la edad serán expulsados automáticamente. 🦋\n\n` +
            `_Usa *#edadoff* para desactivarlo_`
        )
    }

    // ── #edadoff — desactivar verificación ───────────────────────────────────
    if (cmd === 'edadoff') {
        if (!isAdmin && !isOwner) return sendNino(conn, m, `👮 Solo los admins pueden configurar esto. 💅`)

        grupo.verificarEdad = false
        grupo.edadMinima    = null

        return sendNino(conn, m,
            `✅ *VERIFICACIÓN DE EDAD DESACTIVADA*\n\n` +
            `Ya no se requiere verificación de edad en este grupo. 🌸`
        )
    }

    // ── #verificar — el usuario verifica su edad ──────────────────────────────
    if (cmd === 'verificar' || cmd === 'edad') {
        if (!grupo.verificarEdad) {
            return sendNino(conn, m,
                `💡 Este grupo no tiene verificación de edad activa.\n\n` +
                `_Los admins pueden activarla con *#setedad <edad>*_ 🦋`
            )
        }

        const edad = parseInt(args[0])
        if (!edad || edad < 1 || edad > 120) {
            return sendNino(conn, m,
                `🔞 *VERIFICACIÓN DE EDAD*\n\n` +
                `Este grupo requiere verificación de edad.\n\n` +
                `Usa: *#verificar <tu edad>*\n` +
                `Ejemplo: *#verificar 20*\n\n` +
                `> _Edad mínima requerida: ${grupo.edadMinima} años_ 🦋`
            )
        }

        const sender = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
        const user   = database.getUser(sender)

        // Guardar edad del usuario
        user.age = edad

        if (edad < grupo.edadMinima) {
            // No cumple la edad — expulsar si el bot es admin
            await sendNino(conn, m,
                `❌ *EDAD INSUFICIENTE*\n\n` +
                `@${sender.split('@')[0]}, necesitas tener al menos *${grupo.edadMinima} años* para estar en este grupo.\n\n` +
                `Lo siento... 🍂`
            )

            if (isBotAdmin) {
                try {
                    await conn.groupParticipantsUpdate(m.chat, [sender], 'remove')
                } catch {}
            }
        } else {
            // Cumple la edad — marcar como verificado
            user.edadVerificada = true
            user.edadVerificadaEn = m.chat

            await conn.sendMessage(m.chat, {
                text:
                    `✅ *VERIFICACIÓN EXITOSA*\n\n` +
                    `@${sender.split('@')[0]} verificó tener *${edad} años*. ¡Bienvenid@! 🌸\n\n` +
                    `_Ya puedes usar todos los comandos del grupo_ 🦋`,
                contextInfo: {
                    mentionedJid: [sender],
                    externalAdReply: {
                        title: `✅ Verificado`,
                        body: `${global.botName || 'Nino Nakano'} 🌸`,
                        thumbnail: await getBannerBuffer(),
                        sourceUrl: global.rcanal || '',
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            })
        }
    }
}

// ── handler.before — bloquear usuarios no verificados ────────────────────────
handler.before = async (m, { conn, isAdmin, isOwner }) => {
    if (!m.isGroup || !m.body) return false

    const db    = database.data
    const grupo = db?.groups?.[m.chat]
    if (!grupo?.verificarEdad || !grupo?.edadMinima) return false

    const sender = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
    if (isAdmin || isOwner) return false

    const user = database.getUser(sender)

    // Si ya está verificado, pasar
    if (user.edadVerificada) return false

    // Si intenta verificarse, dejar pasar
    const body = (m.body || '').trim().toLowerCase()
    if (body.startsWith('#verificar') || body.startsWith('#edad') ||
        body.startsWith('.verificar') || body.startsWith('.edad')) return false

    // Bloquear y recordar que debe verificarse
    try { await conn.sendMessage(m.chat, { delete: m.key }) } catch {}

    try {
        await conn.sendMessage(m.chat, {
            text:
                `🔞 @${sender.split('@')[0]}, este grupo requiere verificación de edad.\n\n` +
                `Usa *#verificar <tu edad>* para continuar.\n` +
                `_Edad mínima: ${grupo.edadMinima} años_ 🦋`,
            contextInfo: { mentionedJid: [sender] }
        })
    } catch {}

    return true
}

handler.command = ['setedad', 'edadoff', 'verificar', 'edad']
handler.group   = true
export default handler