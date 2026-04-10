/**
 * REACCIONES DE ANIME - NINO NAKANO
 * Comandos: #kiss #hug #push #dormir #triste #no #hola #borracho
 * API: nekos.best
 * Funciona solo o mencionando/respondiendo a alguien
 */

// ── Mapeo de comandos a endpoints de nekos.best ───────────────────────────────
const ACCIONES = {
    // Acción        endpoint        emoji   texto solo                          texto con target
    kiss:     { ep: 'kiss',     emoji: '💋', solo: 'te manda un besito~',        target: 'le da un besito a' },
    hug:      { ep: 'hug',      emoji: '🤗', solo: 'se abraza a sí mismo~',      target: 'abraza con cariño a' },
    push:     { ep: 'poke',     emoji: '👉', solo: 'se empuja solo... raro~',    target: 'empuja a' },
    dormir:   { ep: 'sleep',    emoji: '😴', solo: 'se quedó dormido~',          target: 'hace dormir a' },
    triste:   { ep: 'cry',      emoji: '😢', solo: 'está llorando...',           target: 'llora por' },
    no:       { ep: 'no',       emoji: '🙅', solo: 'dice que NO~',               target: 'le dice NO a' },
    hola:     { ep: 'wave',     emoji: '👋', solo: 'saluda a todos~',            target: 'le saluda a' },
    borracho: { ep: 'handshake',emoji: '🍺', solo: 'está bien borracho~',        target: 'bebe con' }
}

// Comandos alternativos
const ALIASES = {
    beso: 'kiss',
    abrazo: 'hug',
    empujar: 'push',
    sleep: 'dormir',
    sad: 'triste',
    llorar: 'triste',
    hello: 'hola',
    saludar: 'hola',
    drunk: 'borracho',
    nope: 'no'
}

const fetchGif = async (endpoint) => {
    const res = await fetch(`https://nekos.best/api/v2/${endpoint}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const data = json.results?.[0]
    if (!data?.url) throw new Error('Sin resultados')
    return data.url
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

let handler = async (m, { conn, command, text }) => {
    // Resolver comando real (alias → comando base)
    const cmd = ALIASES[command.toLowerCase()] || command.toLowerCase()
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

    // ── Armar texto de la acción ──────────────────────────────────────────────
    let textoAccion
    if (targetJid) {
        textoAccion = `*${senderName}* ${accion.target} *${targetName}* ${accion.emoji}`
    } else {
        textoAccion = `*${senderName}* ${accion.solo} ${accion.emoji}`
    }

    await m.react(accion.emoji)

    try {
        const gifUrl = await fetchGif(accion.ep)

        const imgRes = await fetch(gifUrl)
        if (!imgRes.ok) throw new Error(`No se pudo descargar el GIF: HTTP ${imgRes.status}`)
        const buffer = Buffer.from(await imgRes.arrayBuffer())

        const caption =
            `${accion.emoji} ${textoAccion}\n\n` +
            `> _${botName}_ 🦋`

        await conn.sendMessage(m.chat, {
            video: buffer,
            caption,
            mimetype: 'video/mp4',
            gifPlayback: true,
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