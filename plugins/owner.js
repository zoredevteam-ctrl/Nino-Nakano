import { database } from '../lib/database.js'

/**
 * Comandos exclusivos del Owner - Nino Nakano
 * #restart, #setprefix, #delprefix
 */

const RCANAL = 'https://whatsapp.com/channel/0029Vb6p68rF6smrH4Jeay3Y'

const sendNino = async (conn, m, text) => {
    return conn.sendMessage(m.chat, {
        text,
        contextInfo: {
            externalAdReply: {
                title: global.botName || 'Nino Nakano',
                body: 'Owner Panel 👑',
                thumbnailUrl: global.banner || '',
                sourceUrl: global.rcanal || RCANAL,
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false
            }
        }
    }, { quoted: m })
}

let handler = async (m, { conn, command, text, args, isOwner, db }) => {
    const cmd = command.toLowerCase()

    if (!isOwner) {
        return sendNino(conn, m, `👑 Este comando es exclusivo para los dueños de *${global.botName || 'Nino Nakano'}*.`)
    }

    // ==================== #restart ====================
    if (cmd === 'restart') {
        await sendNino(conn, m, `🔄 Reiniciando *${global.botName || 'Nino Nakano'}*...\n\nVuelvo en unos segundos 🦋`)
        setTimeout(() => process.exit(0), 2000)
        return
    }

    // ==================== #setprefix ====================
    if (cmd === 'setprefix') {
        const newPrefix = (text || '').trim().slice(0, 1)

        if (!newPrefix) {
            return sendNino(conn, m,
                `👑 *CAMBIAR PREFIJO*\n\n` +
                `Uso: *#setprefix <símbolo>*\n` +
                `Ejemplo: *#setprefix .*\n\n` +
                `Prefijo actual: *${global.prefix || '#'}*`
            )
        }

        const prefijosValidos = ['#', '.', '/', '$', '!', '?', '-', '+', '*', '&', '%']
        if (!prefijosValidos.includes(newPrefix)) {
            return sendNino(conn, m,
                `❌ Prefijo inválido.\n\n` +
                `Prefijos permitidos: ${prefijosValidos.join(' ')}`
            )
        }

        const prevPrefix = global.prefix || '#'
        global.prefix = newPrefix

        // Guardar en db.settings para que persista
        if (!db.settings) db.settings = {}
        db.settings.prefix = newPrefix

        return sendNino(conn, m,
            `✅ Prefijo cambiado de *${prevPrefix}* a *${newPrefix}*\n\n` +
            `Ahora usa *${newPrefix}menu* para ver los comandos 🦋`
        )
    }

    // ==================== #delprefix (volver al # por defecto) ====================
    if (cmd === 'delprefix') {
        const prevPrefix = global.prefix || '#'
        global.prefix = '#'

        if (!db.settings) db.settings = {}
        db.settings.prefix = '#'

        return sendNino(conn, m,
            `✅ Prefijo restaurado a *#* (por defecto)\n\n` +
            `Prefijo anterior: *${prevPrefix}* 🦋`
        )
    }
}

handler.command = ['restart', 'setprefix', 'delprefix']
handler.owner = true
export default handler
