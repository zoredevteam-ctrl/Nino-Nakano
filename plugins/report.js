/**
 * REPORT - NINO NAKANO
 * Comando: #report <descripción>
 * El usuario reporta un problema y le llega solo al root owner en privado
 */

import { database } from '../lib/database.js'

const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutos entre reportes

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
            title: `📢 ${global.botName || 'Nino Nakano'}`,
            body: 'Sistema de Reportes',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, quoted ? { quoted } : {})

// ✅ Obtener solo el JID del root owner (el que tiene true como tercer parámetro)
const getRootOwnerJid = () => {
    const owners = Array.isArray(global.owner) ? global.owner : []
    const root   = owners.find(o => Array.isArray(o) && o[2] === true)
    if (!root) return null
    return root[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
}

let handler = async (m, { conn, text, isOwner }) => {
    const sender    = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
    const user      = database.getUser(sender)
    const ahora     = Date.now()
    const pushName  = m.pushName || 'Usuario'

    // ── Sin descripción ───────────────────────────────────────────────────────
    if (!text?.trim()) {
        return sendNino(conn, m.chat,
            `📢 *REPORTAR PROBLEMA*\n\n` +
            `Usa este comando para reportarle un error o problema al dueño del bot.\n\n` +
            `*Uso:* *#report <descripción del problema>*\n\n` +
            `*Ejemplo:*\n` +
            `_#report El comando #play no funciona, me aparece error HTTP 500_\n\n` +
            `> _Los reportes llegan directamente al dueño_ 🦋`, m
        )
    }

    // ── Cooldown ──────────────────────────────────────────────────────────────
    const lastReport   = user.lastReport || 0
    const tiempoEspera = COOLDOWN_MS - (ahora - lastReport)

    if (tiempoEspera > 0 && !isOwner) {
        const min = Math.ceil(tiempoEspera / 60000)
        return sendNino(conn, m.chat,
            `⏳ *ESPERA UN MOMENTO*\n\n` +
            `Ya enviaste un reporte hace poco.\n` +
            `Espera *${min} minuto${min !== 1 ? 's' : ''}* antes de enviar otro. 🦋`, m
        )
    }

    user.lastReport = ahora

    const descripcion = text.trim()
    const fecha       = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })
    const chatInfo    = m.isGroup ? `👥 *Grupo:* ${m.chat}` : `💬 *Privado*`

    // ✅ Solo al root owner
    const rootJid = getRootOwnerJid()

    if (!rootJid) {
        console.error('[REPORT] No se encontró root owner en global.owner')
        return sendNino(conn, m.chat, `❌ Error interno al enviar el reporte. Contacta al dueño directamente. 🦋`, m)
    }

    // ── Armar mensaje ─────────────────────────────────────────────────────────
    const reportMsg =
        `📢 *NUEVO REPORTE*\n\n` +
        `👤 *Usuario:* ${pushName}\n` +
        `📱 *Número:* +${sender.split('@')[0]}\n` +
        `${chatInfo}\n` +
        `🕐 *Fecha:* ${fecha}\n\n` +
        `📝 *Descripción:*\n${descripcion}\n\n` +
        `> _Reporte enviado desde ${global.botName || 'Nino Nakano'}_ 🦋`

    // ── Enviar al root owner ──────────────────────────────────────────────────
    try {
        await conn.sendMessage(rootJid, {
            text: reportMsg,
            contextInfo: {
                externalAdReply: {
                    title: `📢 Reporte de ${pushName}`,
                    body: descripcion.slice(0, 60) + (descripcion.length > 60 ? '...' : ''),
                    thumbnail: await getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        })

        return sendNino(conn, m.chat,
            `✅ *REPORTE ENVIADO*\n\n` +
            `Tu reporte llegó al dueño del bot. 🌸\n\n` +
            `📝 *Tu reporte:*\n_${descripcion}_\n\n` +
            `_Gracias por ayudarnos a mejorar~ 🦋_`, m
        )
    } catch (e) {
        console.error('[REPORT] Error al enviar:', e.message)
        return sendNino(conn, m.chat,
            `❌ *No se pudo enviar el reporte*\n\n` +
            `Hubo un problema al contactar al dueño.\n` +
            `Intenta de nuevo más tarde. 🦋`, m
        )
    }
}

handler.command = ['report', 'reportar', 'bug']
export default handler