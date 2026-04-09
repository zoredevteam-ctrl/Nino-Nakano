/**
 * ENVIARTT - NINO NAKANO
 * Descarga un TikTok y lo envia al canal oficial
 * Comandos: #enviartt, #sendtt
 * Solo owners
 */

const API_KEY   = 'causa-ec43262f206b3305'
const RCANAL    = 'https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G'
const CANAL_JID = '120363408182996815@newsletter'

const _getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) {
            return Buffer.from(src.split(',')[1], 'base64')
        }
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const sendCtx = async (conn, m, text, isError = false) => {
    const thumb = await _getBannerBuffer()
    return conn.sendMessage(m.chat, {
        text,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.newsletterJid || CANAL_JID,
                serverMessageId: '',
                newsletterName: global.newsletterName || global.botName || 'Nino Nakano'
            },
            externalAdReply: {
                title: (isError ? '❌ ' : '🎵 ') + (global.botName || 'Nino Nakano'),
                body: isError ? 'Error al enviar' : 'TikTok Canal',
                thumbnail: thumb,
                sourceUrl: global.rcanal || RCANAL,
                mediaType: 1,
                renderLargerThumbnail: false,
                showAdAttribution: false
            }
        }
    }, { quoted: m })
}

let handler = async (m, { conn, args }) => {
    const url = args[0] || (m.quoted?.text ? m.quoted.text.trim() : '')

    if (!url || !url.includes('tiktok.com')) {
        return sendCtx(conn, m,
            '🎵 *ENVIAR AL CANAL*\n\n' +
            'Necesito un link valido de TikTok~\n\n' +
            '*Uso:*\n' +
            '› *#enviartt <link>*\n' +
            '› O responde a un mensaje con el link\n\n' +
            '_Ejemplo: #enviartt https://vt.tiktok.com/..._'
        )
    }

    await m.react('⏳')

    try {
        // Usar el JID del canal directo desde settings
        const JID_CANAL = global.newsletterJid || CANAL_JID
        const canalNombre = global.newsletterName || 'Canal de Nino'

        // Descargar video de TikTok
        const res = await fetch(
            'https://rest.apicausas.xyz/api/v1/descargas/tiktok?url=' + encodeURIComponent(url) + '&apikey=' + API_KEY
        )
        const json = await res.json()

        if (!json.status) throw new Error('La API de TikTok no respondio correctamente.')

        const videoUrl = json.data?.download?.url
        if (!videoUrl) throw new Error('No se obtuvo URL de descarga.')

        await m.react('⬇️')

        const videoRes = await fetch(videoUrl)
        if (!videoRes.ok) throw new Error('Error al descargar el video: HTTP ' + videoRes.status)
        const buffer = Buffer.from(await videoRes.arrayBuffer())

        const autor  = json.data?.autor  || 'Desconocido'
        const titulo = json.data?.titulo || ''

        // Enviar al canal
        await conn.sendMessage(JID_CANAL, {
            video: buffer,
            caption:
                '🌸 *' + titulo + '*\n\n' +
                '👤 *Creador:* @' + autor + '\n' +
                '🔗 *Fuente:* TikTok\n\n' +
                '╭─────────────────╮\n' +
                '│  🦋 *' + (global.botName || 'Nino Nakano') + '*  │\n' +
                '│  ✦ Z0RT SYSTEMS ✦  │\n' +
                '╰─────────────────╯',
            mimetype: 'video/mp4',
            fileName: autor + '_tiktok.mp4'
        })

        await m.react('✅')

        // Confirmar al owner
        return sendCtx(conn, m,
            '✅ *Video enviado al canal!*\n\n' +
            '📺 *Canal:* ' + canalNombre + '\n' +
            '👤 *Autor:* @' + autor + '\n' +
            '📝 *Titulo:* ' + (titulo || '—') + '\n\n' +
            '_El video ya esta en el canal_ 🦋'
        )

    } catch (e) {
        console.error('[ENVIARTT ERROR]', e)
        await m.react('❌')
        return sendCtx(conn, m,
            '❌ *Error al procesar el video*\n\n' +
            (e.message || String(e)) + '\n\n' +
            '_Revisa que el bot sea administrador del canal_ 🦋',
            true
        )
    }
}

handler.command = ['enviartt', 'sendtt']
handler.owner = true
export default handler
