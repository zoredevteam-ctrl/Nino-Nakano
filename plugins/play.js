/**
 * PLAY - NINO NAKANO
 * Comandos: #play (audio), #playvid (video)
 * API: api.giftedtech.co.ke
 */

const API = 'https://api.giftedtech.co.ke/api'
const APIKEY = 'gifted'

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

        if (!searchRes?.result?.[0]) {
            await m.react('❌')
            return sendNino(conn, m, `❌ No encontré resultados para *${query}*\n\nIntenta con otro nombre 🦋`)
        }

        const song = searchRes.result[0]
        const title     = song.title     || 'Sin título'
        const duration  = song.duration  || 'N/A'
        const views     = song.views     || 'N/A'
        const channel   = song.channel   || 'N/A'
        const thumb     = song.thumbnail || ''
        const videoUrl  = song.url       || song.link || ''

        if (!videoUrl) {
            await m.react('❌')
            return sendNino(conn, m, `❌ No pude obtener el link del video.`)
        }

        await m.react('⬇️')

        // 2. Descargar audio o video
        let dlRes
        if (isVideo) {
            dlRes = await apiGet(`${API}/download/ytmp4?apikey=${APIKEY}&url=${encodeURIComponent(videoUrl)}`)
        } else {
            dlRes = await apiGet(`${API}/download/ytmp3?apikey=${APIKEY}&url=${encodeURIComponent(videoUrl)}`)
        }

        const dlUrl = dlRes?.result?.downloadUrl || dlRes?.result?.url || dlRes?.download_url || dlRes?.url

        if (!dlUrl) {
            // Intentar con servidor alternativo
            const dlRes2 = await apiGet(`${API}/download/dlmp3?apikey=${APIKEY}&url=${encodeURIComponent(videoUrl)}`)
            const dlUrl2 = dlRes2?.result?.downloadUrl || dlRes2?.result?.url || dlRes2?.download_url
            if (!dlUrl2) {
                await m.react('❌')
                return sendNino(conn, m, `❌ No pude descargar *${title}*.\n\nIntenta de nuevo en unos segundos 🦋`)
            }
        }

        const finalUrl = dlUrl || ''

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
