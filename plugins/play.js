/**
 * PLAY - NINO NAKANO
 * Comandos: #play (audio), #playvid (video)
 * API: api.giftedtech.co.ke
 */

const API = 'https://api.giftedtech.co.ke/api'
const APIKEY = 'Fedex'

const sendNino = async (conn, m, text) => conn.sendMessage(m.chat, {
    text,
    contextInfo: {
        externalAdReply: {
            title: `🎵 ${global.botName || 'Nino Nakano'}`,
            body: 'Music Player 🎶',
            thumbnailUrl: global.banner || '',
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false,
            showAdAttribution: false
        }
    }
}, { quoted: m })

const apiGet = async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

let handler = async (m, { conn, command, text }) => {
    const cmd = command.toLowerCase()
    const isVideo = cmd === 'playvid' || cmd === 'playv'
    const query = (text || '').trim()

    if (!query) {
        return sendNino(conn, m,
            `🎵 *${isVideo ? 'PLAY VIDEO' : 'PLAY MÚSICA'}*\n\n` +
            `Uso: *#${cmd} <nombre de la canción>*\n` +
            `Ejemplo: *#${cmd} bad bunny un verano sin ti*`
        )
    }

    await m.react('🔍')

    try {
        // 1. Buscar en YouTube
        const searchRes = await apiGet(`${API}/search/youtube?apikey=${APIKEY}&query=${encodeURIComponent(query)}`)

        // Manejar distintas estructuras de respuesta
        const results = searchRes?.result || searchRes?.results || searchRes?.data || []
        if (!results.length) {
            await m.react('❌')
            return sendNino(conn, m, `❌ No encontré resultados para *${query}*\n\nIntenta con otro nombre 🦋`)
        }

        const song = results[0]
        const title    = song.title     || song.name        || 'Sin título'
        const duration = song.duration  || song.length      || 'N/A'
        const views    = song.views     || song.viewCount   || 'N/A'
        const channel  = song.channel   || song.author      || song.uploader || 'N/A'
        const thumb    = song.thumbnail || song.thumbnailUrl || song.image || ''
        const videoUrl = song.url       || song.link        || song.videoUrl  || song.id
            ? (song.url || song.link || song.videoUrl || `https://youtube.com/watch?v=${song.id}`)
            : ''

        if (!videoUrl) {
            await m.react('❌')
            return sendNino(conn, m, `❌ No pude obtener el link del video.`)
        }

        await m.react('⬇️')

        // 2. Descargar — probar varios servidores en orden
        let finalUrl = null

        const servidores = isVideo
            ? ['savetubemp4', 'ytmp4', 'ytvideo', 'ytv']
            : ['savetubemp3', 'ytmp3', 'ytaudio', 'yta', 'dlmp3']

        for (const srv of servidores) {
            try {
                const dlRes = await apiGet(`${API}/download/${srv}?apikey=${APIKEY}&url=${encodeURIComponent(videoUrl)}`)
                const url = dlRes?.result?.downloadUrl || dlRes?.result?.url || dlRes?.result?.audio
                    || dlRes?.result?.video || dlRes?.download_url || dlRes?.url || dlRes?.link
                if (url) { finalUrl = url; break }
            } catch { continue }
        }

        if (!finalUrl) {
            await m.react('❌')
            return sendNino(conn, m, `❌ No pude descargar *${title}*.\n\nIntenta de nuevo en unos segundos 🦋`)
        }''

        // 3. Descargar el buffer
        const mediaRes = await fetch(finalUrl)
        if (!mediaRes.ok) throw new Error(`No se pudo descargar el archivo: ${mediaRes.status}`)
        const buffer = Buffer.from(await mediaRes.arrayBuffer())

        // 4. Info del track
        const infoTxt =
            `🎵 *${title}*\n` +
            `👤 *Canal:* ${channel}\n` +
            `⏱️ *Duración:* ${duration}\n` +
            `👁️ *Vistas:* ${views}\n` +
            `🔗 *Link:* ${videoUrl}`

        // 5. Enviar media con info del bot
        await m.react('📤')

        const contextInfo = {
            externalAdReply: {
                title: title,
                body: `${global.botName || 'Nino Nakano'} Music 🎵`,
                thumbnailUrl: thumb || global.banner || '',
                sourceUrl: videoUrl,
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false
            }
        }

        if (isVideo) {
            await conn.sendMessage(m.chat, {
                video: buffer,
                caption: infoTxt,
                mimetype: 'video/mp4',
                contextInfo
            }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo
            }, { quoted: m })

            // Enviar info en mensaje aparte
            await conn.sendMessage(m.chat, {
                text: infoTxt,
                contextInfo
            }, { quoted: m })
        }

        await m.react('✅')

    } catch (e) {
        console.error('[PLAY ERROR]', e)
        await m.react('❌')
        return sendNino(conn, m,
            `❌ Ocurrió un error al procesar *${query}*\n\n` +
            `Error: ${e.message}\n\n` +
            `_Intenta de nuevo en unos segundos_ 🦋`
        )
    }
}

handler.command = ['play', 'playvid', 'playv', 'música', 'musica']
export default handler
