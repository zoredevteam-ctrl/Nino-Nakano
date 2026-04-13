/**
 * CHATBOT IA - NINO NAKANO
 * Comando: #ia <pregunta> o mencionar al bot
 * API: api.giftedtech.co.ke (GPT gratuito)
 */

const GIFTED_API = 'https://api.giftedtech.co.ke/api'
const GIFTED_KEY = 'gifted'

const getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

let handler = async (m, { conn, command, text }) => {
    const query = (text || '').trim()
    if (!query) {
        return conn.sendMessage(m.chat, {
            text:
                `💬 *CHATBOT IA*\n\n` +
                `Puedes preguntarme cualquier cosa~\n\n` +
                `*Uso:* *#ia <pregunta>*\n` +
                `*Ejemplo:* #ia ¿Cuál es la capital de Francia?\n\n` +
                `_También puedes mencionarme en el grupo y te respondo_ 🦋`,
            contextInfo: {
                externalAdReply: {
                    title: `💬 ${global.botName || 'Nino Nakano'} IA`,
                    body: 'Chatbot 🤖',
                    thumbnail: await getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }

    await m.react('🤔')

    try {
        const res  = await fetch(`${GIFTED_API}/ai/gpt4?apikey=${GIFTED_KEY}&q=${encodeURIComponent(query)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const respuesta = json?.result || json?.response || json?.answer || null

        if (!respuesta) throw new Error('Sin respuesta de la IA')

        await m.react('✅')

        return conn.sendMessage(m.chat, {
            text:
                `💬 *${global.botName || 'Nino Nakano'} IA*\n\n` +
                `❓ *Pregunta:* ${query}\n\n` +
                `🤖 *Respuesta:*\n${respuesta}`,
            contextInfo: {
                externalAdReply: {
                    title: `💬 ${global.botName || 'Nino Nakano'} IA`,
                    body: 'Respuesta de IA 🤖',
                    thumbnail: await getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })

    } catch (e) {
        console.error('[IA ERROR]', e)
        await m.react('❌')
        return m.reply(`❌ No pude obtener respuesta ahora mismo.\nError: ${e.message} 🦋`)
    }
}

// ── handler.before — responder cuando mencionan al bot ───────────────────────
handler.before = async (m, { conn }) => {
    if (!m.isGroup || !m.body || !m.message) return false

    const botJid    = conn.user?.id?.split(':')[0] + '@s.whatsapp.net'
    const mencionado = m.mentionedJid?.includes(botJid) || m.mentionedJid?.includes(conn.user?.id)
    if (!mencionado) return false

    // Limpiar la mención del texto
    const query = m.body
        .replace(/@\d+/g, '')
        .replace(/\s+/g, ' ')
        .trim()

    if (!query || query.length < 2) return false

    await m.react('🤔')

    try {
        const res  = await fetch(`${GIFTED_API}/ai/gpt4?apikey=${GIFTED_KEY}&q=${encodeURIComponent(query)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const respuesta = json?.result || json?.response || json?.answer || null

        if (!respuesta) throw new Error('Sin respuesta')

        await m.react('✅')
        await conn.sendMessage(m.chat, {
            text: `💬 *${global.botName || 'Nino Nakano'}*\n\n${respuesta}`,
            contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: m })

    } catch (e) {
        console.error('[IA MENTION ERROR]', e)
        await m.react('❌')
    }

    return false // No bloquear el mensaje
}

handler.command = ['ia', 'ai', 'gpt', 'pregunta']
export default handler