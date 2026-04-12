/**
 * OWNER TOOLS - NINO NAKANO
 * modoadmin, modoowner, boton, botoff
 * Solo owners
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
            title: `👑 ${global.botName || 'Nino Nakano'}`,
            body: 'Panel de Control',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, { quoted: m })

let handler = async (m, { conn, command, isOwner, isAdmin, isGroup, db }) => {
    const cmd = command.toLowerCase()

    if (!db.settings) db.settings = {}
    if (!db.groups)   db.groups   = {}
    if (isGroup && !db.groups[m.chat]) db.groups[m.chat] = { modoadmin: false, muted: [] }

    // ── #modoadmin — solo admins/owner pueden usar comandos en el grupo ───────
    if (cmd === 'modoadmin') {
        if (!isGroup)          return sendNino(conn, m, `🏢 Este comando solo funciona en grupos.`)
        if (!isAdmin && !isOwner) return sendNino(conn, m, `👮 Solo los admins pueden activar esto.`)

        const grupo = db.groups[m.chat]
        grupo.modoadmin = !grupo.modoadmin

        return sendNino(conn, m,
            `⚙️ *MODO ADMIN ${grupo.modoadmin ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}*\n\n` +
            `${grupo.modoadmin
                ? `Solo los administradores pueden darme órdenes en este grupo ahora. El resto que se calle~ 💅`
                : `Todos pueden usar mis comandos de nuevo. 🌸`}`
        )
    }

    // ── #modoowner — solo owners pueden usar el bot ───────────────────────────
    if (cmd === 'modoowner') {
        if (!isOwner) return sendNino(conn, m, `👑 Solo mis dueños pueden activar esto.`)

        db.settings.modoowner = !db.settings.modoowner
        global.modoowner = db.settings.modoowner

        return sendNino(conn, m,
            `👑 *MODO OWNER ${db.settings.modoowner ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}*\n\n` +
            `${db.settings.modoowner
                ? `Ahora solo mis dueños pueden hablar conmigo. El resto... ni lo intenten~ 🦋`
                : `Todos pueden usarme de nuevo. 🌸`}`
        )
    }

    // ── #botoff / #boton — apagar/encender el bot ─────────────────────────────
    if (cmd === 'botoff') {
        if (!isOwner) return sendNino(conn, m, `👑 Solo mis dueños pueden apagarme.`)

        global.botOff = true
        return sendNino(conn, m,
            `😴 *BOT DESACTIVADO*\n\n` +
            `Me voy a descansar un momento... Solo mis dueños pueden despertarme.\n\n` +
            `_Usa *#boton* para reactivarme_ 🦋`
        )
    }

    if (cmd === 'boton') {
        if (!isOwner) return sendNino(conn, m, `👑 Solo mis dueños pueden encenderme.`)

        global.botOff = false
        return sendNino(conn, m,
            `✨ *BOT ACTIVADO*\n\n` +
            `¡Estoy de vuelta! Lista para atenderte~ 🌸🦋`
        )
    }
}

handler.command = ['modoadmin', 'modoowner', 'botoff', 'boton']
handler.owner   = false // La validación se hace dentro
export default handler