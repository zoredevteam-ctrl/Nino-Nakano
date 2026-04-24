/**
 * PING - NINO NAKANO
 * Latencia del servidor
 * Comandos: #ping, #p, #speed, #latencia
 */

import { performance } from 'perf_hooks'

const getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        if (!res.ok) return null
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const rateLatency = (ms) => {
    const n = parseFloat(ms)
    if (n < 100) return '✦ Excelente'
    if (n < 300) return '◈ Buena'
    if (n < 600) return '◇ Regular'
    return           '✧ Lenta'
}

let handler = async (m, { conn }) => {
    const start    = performance.now()
    await m.reply('...')
    const latencia = (performance.now() - start).toFixed(2)
    const thumb    = await getBannerBuffer()

    const txt =
        `─── ❖ ── ✦ ── ❖ ───\n` +
        `  P I N G  —  ${global.botName || 'Nino Nakano'}\n` +
        `─── ❖ ── ✦ ── ❖ ───\n\n` +
        `  ↬ Latencia   ${latencia} ms\n` +
        `  ↬ Estado     ${rateLatency(latencia)}\n` +
        `  ↬ Canal      ${global.rcanal || 'Sin configurar'}\n\n` +
        `  ⋆ Z0RT SYSTEMS ⋆`

    await conn.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid:   global.newsletterJid  || '120363408182996815@newsletter',
                newsletterName:  global.newsletterName || global.botName || 'Nino Nakano',
                serverMessageId: -1
            },
            externalAdReply: {
                title:                 global.botName || 'Nino Nakano',
                body:                  `${latencia} ms  —  ${rateLatency(latencia)}`,
                mediaType:             1,
                thumbnail:             thumb,
                renderLargerThumbnail: false,
                sourceUrl:             global.rcanal || ''
            }
        }
    }, { quoted: m })
}

handler.command = ['ping', 'p', 'speed', 'latencia']
export default handler