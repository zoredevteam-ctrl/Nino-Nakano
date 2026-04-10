/**
 * REACCIONES DE ANIME - NINO NAKANO
 * Comandos: #kiss #hug #push #dormir #triste #no #hola #borracho
 * API: nekos.best — enviados como sticker animado (webp)
 */

const ACCIONES = {
    kiss:     { ep: 'kiss',      emoji: '💋', solo: 'se manda un besito~',       target: 'le da un besito a' },
    hug:      { ep: 'hug',       emoji: '🤗', solo: 'se abraza a sí mismo~',     target: 'abraza con cariño a' },
    push:     { ep: 'poke',      emoji: '👉', solo: 'se empuja solo... raro~',   target: 'empuja a' },
    dormir:   { ep: 'sleep',     emoji: '😴', solo: 'se quedó dormido~',         target: 'hace dormir a' },
    triste:   { ep: 'cry',       emoji: '😢', solo: 'está llorando...',          target: 'llora por' },
    no:       { ep: 'no',        emoji: '🙅', solo: 'dice que NO~',              target: 'le dice NO a' },
    hola:     { ep: 'wave',      emoji: '👋', solo: 'saluda a todos~',           target: 'le saluda a' },
    borracho: { ep: 'handshake', emoji: '🍺', solo: 'está bien borracho~',       target: 'bebe con' }
}

const ALIASES = {
    beso: 'kiss', abrazo: 'hug', empujar: 'push',
    sleep: 'dormir', sad: 'triste', llorar: 'triste',
    hello: 'hola', saludar: 'hola', drunk: 'borracho', nope: 'no'
}

const fetchGif = async (endpoint) => {
    const res = await fetch(`https://nekos.best/api/v2/${endpoint}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const url = json.results?.[0]?.url
    if (!url) throw new Error('Sin resultados')
    return url
}

const _getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

let handler = async (m, { conn, command }) => {
    const cmd    = ALIASES[command.toLowerCase()] || command.toLowerCase()
    const accion = ACCIONES[cmd]
    if (!accion) return

    // ── Resolver target ───────────────────────────────────────────────────────
    let targetJid  = null
    let targetName = null

    if (m.mentionedJid?.[0]) {
        targetJid  = m.mentionedJid[0]
        targetName = `@${targetJid.split('@')[0]}`
    } else if (m.quoted?.sender) {
        targetJid  = m.quoted.sender
        targetName = m.quoted.pushName || `@${targetJid.split('@')[0]}`
    }

    const senderName = m.pushName || 'Alguien'
    const botName    = global.botName || 'Nino Nakano'

    const textoAccion = targetJid
        ? `*${senderName}* ${accion.target} *${targetName}* ${accion.emoji}`
        : `*${senderName}* ${accion.solo} ${accion.emoji}`

    await m.react(accion.emoji)

    try {
        const gifUrl = await fetchGif(accion.ep)

        const imgRes = await fetch(gifUrl)
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
        const buffer = Buffer.from(await imgRes.arrayBuffer())

        // ✅ Primero enviar el texto con el contexto
        await conn.sendMessage(m.chat, {
            text: `${textoAccion}\n\n> _${botName}_ 🦋`,
            contextInfo: {
                mentionedJid: targetJid ? [targetJid] : [],
                externalAdReply: {
                    title: `${accion.emoji} ${botName}`,
                    body: textoAccion,
                    thumbnail: await _getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })

        // ✅ Luego enviar el GIF como sticker animado — se ve perfecto en WhatsApp
        await conn.sendMessage(m.chat, {
            sticker: buffer
        })

    } catch (e) {
        console.error(`[REACCION ${cmd.toUpperCase()} ERROR]`, e)
        await m.react('❌')
        return m.reply(`❌ No pude obtener el GIF ahora mismo.\nError: ${e.message} 🦋`)
    }
}

handler.command = [
    'kiss', 'beso',
    'hug', 'abrazo',
    'push', 'empujar',
    'dormir', 'sleep',
    'triste', 'sad', 'llorar',
    'no', 'nope',
    'hola', 'hello', 'saludar',
    'borracho', 'drunk'
]

export default handler