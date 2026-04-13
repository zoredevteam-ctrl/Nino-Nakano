/**
 * ESTADÍSTICAS DEL GRUPO - NINO NAKANO
 * #estadisticas / #topgrupo — quien habla más, ranking de actividad
 * Cuenta mensajes automáticamente en segundo plano
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

let handler = async (m, { conn, command }) => {
    const cmd = command.toLowerCase()
    const db  = database.data

    if (!db.groups)         db.groups         = {}
    if (!db.groups[m.chat]) db.groups[m.chat] = {}
    const grupo = db.groups[m.chat]
    if (!grupo.stats) grupo.stats = {}

    // ── #estadisticas / #topgrupo — ver ranking ───────────────────────────────
    if (cmd === 'estadisticas' || cmd === 'topgrupo' || cmd === 'rankgrupo') {
        const stats = grupo.stats || {}
        const lista = Object.entries(stats)
            .sort((a, b) => (b[1].mensajes || 0) - (a[1].mensajes || 0))
            .slice(0, 10)

        if (!lista.length) {
            return conn.sendMessage(m.chat, {
                text:
                    `📊 *ESTADÍSTICAS DEL GRUPO*\n\n` +
                    `Aún no hay datos suficientes.\n` +
                    `Las estadísticas se acumulan con el tiempo~ 🦋`,
                contextInfo: {
                    externalAdReply: {
                        title: `📊 ${global.botName || 'Nino Nakano'}`,
                        body: 'Estadísticas del grupo',
                        thumbnail: await getBannerBuffer(),
                        sourceUrl: global.rcanal || '',
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            }, { quoted: m })
        }

        const medals  = ['🥇', '🥈', '🥉']
        const ranking = lista.map(([jid, data], i) => {
            const num    = jid.split('@')[0]
            const nombre = data.nombre || `+${num}`
            const msgs   = data.mensajes || 0
            const words  = data.palabras || 0
            return `${medals[i] || `*${i + 1}.*`} ${nombre}\n   💬 ${msgs} mensajes | 📝 ${words} palabras`
        }).join('\n\n')

        const totalMensajes = Object.values(stats).reduce((s, d) => s + (d.mensajes || 0), 0)
        const totalUsuarios = Object.keys(stats).length

        return conn.sendMessage(m.chat, {
            text:
                `📊 *TOP ACTIVIDAD DEL GRUPO*\n\n` +
                `👥 *Usuarios activos:* ${totalUsuarios}\n` +
                `💬 *Total mensajes:* ${totalMensajes.toLocaleString()}\n\n` +
                `*╭╼ RANKING DE ACTIVIDAD 𐦯*\n\n` +
                `${ranking}\n\n` +
                `> _Estadísticas actualizadas en tiempo real_ 🦋`,
            contextInfo: {
                externalAdReply: {
                    title: `📊 Top Actividad`,
                    body: `${global.botName || 'Nino Nakano'} 🌸`,
                    thumbnail: await getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }

    // ── #miperfil / #miactividad — ver tus propias stats ─────────────────────
    if (cmd === 'miperfil' || cmd === 'miactividad') {
        const sender = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
        const data   = grupo.stats?.[sender]

        if (!data) {
            return m.reply(`📊 Aún no tienes estadísticas en este grupo. ¡Sé más activo/a! 🦋`)
        }

        const msgs    = data.mensajes || 0
        const words   = data.palabras || 0
        const stickers = data.stickers || 0
        const imgs    = data.imagenes || 0

        // Calcular puesto
        const lista = Object.entries(grupo.stats || {})
            .sort((a, b) => (b[1].mensajes || 0) - (a[1].mensajes || 0))
        const puesto = lista.findIndex(([j]) => j === sender) + 1

        return m.reply(
            `📊 *TUS ESTADÍSTICAS EN ESTE GRUPO*\n\n` +
            `👤 *Nombre:* ${m.pushName || 'Desconocido'}\n` +
            `🏆 *Puesto:* #${puesto} de ${lista.length}\n\n` +
            `💬 *Mensajes:* ${msgs.toLocaleString()}\n` +
            `📝 *Palabras:* ${words.toLocaleString()}\n` +
            `🖼️ *Imágenes:* ${imgs}\n` +
            `😄 *Stickers:* ${stickers}\n\n` +
            `> _Sigue así para subir en el ranking_ 🦋`
        )
    }

    // ── #resetstats — resetear estadísticas (admin) ───────────────────────────
    if (cmd === 'resetstats') {
        const isAdmin  = false // se valida en el handler
        grupo.stats = {}
        return m.reply(`✅ Estadísticas del grupo reseteadas. 🌸`)
    }
}

// ── handler.before — contar mensajes automáticamente ─────────────────────────
handler.before = async (m, { conn }) => {
    if (!m.isGroup || !m.message) return false

    const db = database.data
    if (!db.groups)         db.groups         = {}
    if (!db.groups[m.chat]) db.groups[m.chat] = {}
    const grupo = db.groups[m.chat]
    if (!grupo.stats) grupo.stats = {}

    const sender = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
    if (!grupo.stats[sender]) {
        grupo.stats[sender] = {
            nombre:   m.pushName || sender.split('@')[0],
            mensajes: 0,
            palabras: 0,
            stickers: 0,
            imagenes: 0
        }
    }

    const data = grupo.stats[sender]

    // Actualizar nombre siempre
    if (m.pushName) data.nombre = m.pushName

    // Contar según tipo de mensaje
    const mtype = Object.keys(m.message || {})[0]

    if (mtype === 'stickerMessage') {
        data.stickers++
    } else if (mtype === 'imageMessage' || mtype === 'videoMessage') {
        data.imagenes++
        data.mensajes++
    } else if (m.body) {
        data.mensajes++
        data.palabras += m.body.trim().split(/\s+/).filter(Boolean).length
    } else {
        data.mensajes++
    }

    return false // Nunca bloquear
}

handler.command = ['estadisticas', 'topgrupo', 'rankgrupo', 'miperfil', 'miactividad', 'resetstats']
export default handler