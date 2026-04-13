/**
 * CARTAS ANÓNIMAS - NINO NAKANO
 * #carta <mensaje> — envía una carta anónima al grupo
 * #cartaon / #cartaoff — activar/desactivar (admin)
 */

import { database } from '../lib/database.js'

const COOLDOWN_MS = 2 * 60 * 1000 // 2 minutos entre cartas

const getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

let handler = async (m, { conn, command, text, isAdmin, isOwner, isGroup, db }) => {
    const cmd = command.toLowerCase()

    if (!isGroup) return m.reply(`🏢 Este comando solo funciona en grupos. 🙄`)

    if (!db.groups) db.groups = {}
    if (!db.groups[m.chat]) db.groups[m.chat] = {}
    const grupo = db.groups[m.chat]

    // ── #cartaon / #cartaoff ──────────────────────────────────────────────────
    if (cmd === 'cartaon' || cmd === 'cartaoff') {
        if (!isAdmin && !isOwner) return m.reply(`👮 Solo los admins pueden configurar las cartas. 💅`)
        grupo.cartasActivas = cmd === 'cartaon'
        return conn.sendMessage(m.chat, {
            text:
                `💌 *CARTAS ANÓNIMAS ${grupo.cartasActivas ? 'ACTIVADAS ✅' : 'DESACTIVADAS ❌'}*\n\n` +
                `${grupo.cartasActivas
                    ? `Los usuarios ya pueden enviar cartas anónimas con *#carta <mensaje>* 🌸`
                    : `Las cartas anónimas han sido desactivadas en este grupo. 🦋`}`,
            contextInfo: {
                externalAdReply: {
                    title: `💌 ${global.botName || 'Nino Nakano'}`,
                    body: 'Cartas Anónimas',
                    thumbnail: await getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }

    // ── #carta — enviar carta anónima ─────────────────────────────────────────
    if (cmd === 'carta' || cmd === 'anonimo' || cmd === 'anon') {
        if (!grupo.cartasActivas && !isOwner) {
            return m.reply(`💌 Las cartas anónimas no están activadas en este grupo.\n\nPide a un admin que use *#cartaon* 🦋`)
        }

        if (!text?.trim()) {
            return conn.sendMessage(m.chat, {
                text:
                    `💌 *CARTAS ANÓNIMAS*\n\n` +
                    `Escribe tu carta y la enviaré al grupo sin revelar quién eres~\n\n` +
                    `*Uso:* *#carta <mensaje>*\n\n` +
                    `*Ejemplo:*\n` +
                    `_#carta Me gustas mucho pero no me atrevo a decírtelo... 🌸_\n\n` +
                    `> _Tu identidad siempre será secreta_ 🤫🦋`,
                contextInfo: {
                    externalAdReply: {
                        title: `💌 ${global.botName || 'Nino Nakano'}`,
                        body: 'Cartas Anónimas 🤫',
                        thumbnail: await getBannerBuffer(),
                        sourceUrl: global.rcanal || '',
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            }, { quoted: m })
        }

        // Cooldown
        const sender     = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
        const user       = database.getUser(sender)
        const ahora      = Date.now()
        const lastCarta  = user.lastCarta || 0
        const esperaMs   = COOLDOWN_MS - (ahora - lastCarta)

        if (esperaMs > 0 && !isOwner) {
            const seg = Math.ceil(esperaMs / 1000)
            return m.reply(`⏳ Espera *${seg} segundos* antes de enviar otra carta. 🦋`)
        }

        // Intentar borrar el mensaje original para proteger el anonimato
        try { await conn.sendMessage(m.chat, { delete: m.key }) } catch {}

        user.lastCarta = ahora

        const mensaje = text.trim()
        const numero  = Math.floor(Math.random() * 9000) + 1000 // ID anónimo

        await conn.sendMessage(m.chat, {
            text:
                `💌 *CARTA ANÓNIMA #${numero}*\n\n` +
                `╭─────────────────╮\n` +
                `${mensaje}\n` +
                `╰─────────────────╯\n\n` +
                `> _~ Anónimo/a 🤫_`,
            contextInfo: {
                externalAdReply: {
                    title: `💌 Carta Anónima`,
                    body: `${global.botName || 'Nino Nakano'} 🤫`,
                    thumbnail: await getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        })
    }
}

handler.command = ['carta', 'anonimo', 'anon', 'cartaon', 'cartaoff']
handler.group   = true
export default handler