/**
 * PLAY - NINO NAKANO
 * #play (audio) | #playvid (video)
 * Busqueda: yt-search
 * APIs: GiftedTech (Fedex) -> AlyaBot -> Causas
 */

const GIFTED_API = 'https://api.giftedtech.co.ke/api'
const GIFTED_KEY = 'Fedex'
const ALYA_KEY   = 'Duarte-zz12'
const RCANAL     = 'https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const apiGet = async (url, timeout = 15000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
    } finally {
        clearTimeout(timer)
    }
}

const getThumbnail = async () => {
    try {
        const res = await fetch(global.banner || 'https://causas-files.vercel.app/fl/cyns.png')
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const sendPlay = async (conn, m, text) => {
    const thumbnail = await getThumbnail()
    return conn.sendMessage(m.chat, {
        text,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                serverMessageId: '',
                newsletterName: global.newsletterName || 'Nino Nakano'
            },
            externalAdReply: {
                title: '🎵 ' + (global.botName || 'Nino Nakano') + ' Music',
                body: 'Sistema de Musica',
                thumbnailUrl: global.banner || '',
                sourceUrl: global.rcanal || RCANAL,
                thumbnail,
                mediaType: 1,
                renderLargerThumbnail: false,
                showAdAttribution: false
            }
        }
    }, { quoted: m })
}

const formatViews = (views) => {
    try {
        const n = parseInt(views) || 0
        if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B'
        if (n >= 1000000)    return (n / 1000000).toFixed(1) + 'M'
        if (n >= 1000)       return (n / 1000).toFixed(1) + 'k'
        return n.toLocaleString()
    } catch { return String(views || 0) }
}

// ─── DESCARGA AUDIO ───────────────────────────────────────────────────────────

const getAudio = async (url) => {
    const fuentes = [
        {
            nombre: 'GiftedTech savetubemp3',
            fn: async () => {
                const r = await apiGet(GIFTED_API + '/download/savetubemp3?apikey=' + GIFTED_KEY + '&url=' + encodeURIComponent(url))
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.audio || null
            }
        },
        {
            nombre: 'GiftedTech ytmp3',
            fn: async () => {
                const r = await apiGet(GIFTED_API + '/download/ytmp3?apikey=' + GIFTED_KEY + '&url=' + encodeURIComponent(url))
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.audio || null
            }
        },
        {
            nombre: 'AlyaBot Play',
            fn: async () => {
                const r = await apiGet('https://rest.alyabotpe.xyz/dl/youtubeplay?query=' + encodeURIComponent(url) + '&key=' + ALYA_KEY)
                return r?.status ? (r.data?.download || r.data?.dl || r.data?.url) : null
            }
        },
        {
            nombre: 'AlyaBot ytmp3',
            fn: async () => {
                const r = await apiGet('https://rest.alyabotpe.xyz/dl/ytmp3?url=' + encodeURIComponent(url) + '&key=' + ALYA_KEY)
                return r?.status ? (r.data?.dl || r.data?.url || r.data?.download) : null
            }
        }
    ]

    for (const { nombre, fn } of fuentes) {
        try {
            console.log('[PLAY] Intentando: ' + nombre)
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                console.log('[PLAY] OK: ' + nombre)
                return link
            }
        } catch (e) {
            console.log('[PLAY] Fallo ' + nombre + ': ' + e.message)
        }
    }
    throw new Error('Ninguna API pudo obtener el audio')
}

// ─── DESCARGA VIDEO ───────────────────────────────────────────────────────────

const getVideo = async (url) => {
    const fuentes = [
        {
            nombre: 'GiftedTech savetubemp4',
            fn: async () => {
                const r = await apiGet(GIFTED_API + '/download/savetubemp4?apikey=' + GIFTED_KEY + '&url=' + encodeURIComponent(url))
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.video || null
            }
        },
        {
            nombre: 'GiftedTech ytmp4',
            fn: async () => {
                const r = await apiGet(GIFTED_API + '/download/ytmp4?apikey=' + GIFTED_KEY + '&url=' + encodeURIComponent(url))
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.video || null
            }
        },
        {
            nombre: 'AlyaBot ytmp4',
            fn: async () => {
                const r = await apiGet('https://rest.alyabotpe.xyz/dl/ytmp4?url=' + encodeURIComponent(url) + '&key=' + ALYA_KEY)
                return r?.status ? (r.data?.dl || r.data?.url || r.data?.download) : null
            }
        },
        {
            nombre: 'API Causas',
            fn: async () => {
                const r = await apiGet('https://api-causas.duckdns.org/api/v1/descargas/youtube?url=' + encodeURIComponent(url) + '&type=video&apikey=causa-adc2c572476abdd8')
                return r?.status ? (r.data?.download?.url || r.data?.download) : null
            }
        }
    ]

    for (const { nombre, fn } of fuentes) {
        try {
            console.log('[PLAYVID] Intentando: ' + nombre)
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                console.log('[PLAYVID] OK: ' + nombre)
                return link
            }
        } catch (e) {
            console.log('[PLAYVID] Fallo ' + nombre + ': ' + e.message)
        }
    }
    throw new Error('Ninguna API pudo obtener el video')
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, command, text }) => {
    const cmd     = command.toLowerCase()
    const isVideo = cmd === 'playvid' || cmd === 'playv'
    const query   = (text || '').trim()

    if (!query) {
        return sendPlay(conn, m,
            (isVideo ? '🎬' : '🎵') + ' *' + (isVideo ? 'PLAY VIDEO' : 'PLAY MUSICA') + '*\n\n' +
            'Uso: *#' + cmd + ' <nombre o link>*\n' +
            'Ejemplo: *#' + cmd + ' bad bunny titi me pregunto*'
        )
    }

    await m.react('🔍')

    try {
        // 1. Buscar via GiftedTech YouTube Search
        let title = query, duration = 'N/A', views = 'N/A', channel = 'N/A'
        let thumb = global.banner || '', videoUrl = ''

        try {
            const searchRes = await apiGet(GIFTED_API + '/search/youtube?apikey=' + GIFTED_KEY + '&query=' + encodeURIComponent(query))
            const results = searchRes?.result || searchRes?.results || searchRes?.data || []
            const song = results[0]
            if (song) {
                title    = song.title || query
                duration = song.duration || song.length || 'N/A'
                views    = formatViews(song.views || song.viewCount || 0)
                channel  = song.channel || song.author || song.uploader || 'N/A'
                thumb    = song.thumbnail || song.image || global.banner || ''
                videoUrl = song.url || song.link || (song.id ? 'https://youtube.com/watch?v=' + song.id : '')
            }
        } catch (e) {
            console.log('[PLAY] Busqueda fallida: ' + e.message)
        }

        // Si la busqueda fallo, intentar con el query como URL directa
        if (!videoUrl) {
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                videoUrl = query
                title = query
            } else {
                await m.react('❌')
                return sendPlay(conn, m, '❌ No encontre resultados para *' + query + '*\n\nIntenta con otro nombre')
            }
        }

        await m.react('⬇️')

        // 2. Descargar con fallback automatico
        const finalUrl = isVideo ? await getVideo(videoUrl) : await getAudio(videoUrl)

        // 3. Descargar buffer con timeout
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 60000)
        let buffer
        try {
            const mediaRes = await fetch(finalUrl, { signal: controller.signal })
            if (!mediaRes.ok) throw new Error('Error descargando archivo: HTTP ' + mediaRes.status)
            buffer = Buffer.from(await mediaRes.arrayBuffer())
        } finally {
            clearTimeout(timer)
        }

        if (!buffer || buffer.length < 1000) {
            throw new Error('El archivo descargado esta vacio o corrupto')
        }

        // 4. Info del track
        const infoTxt =
            '🎵 *' + title + '*\n' +
            '👤 *Canal:* ' + channel + '\n' +
            '⏱️ *Duracion:* ' + duration + '\n' +
            '👁️ *Vistas:* ' + views + '\n' +
            '🔗 ' + videoUrl

        // 5. Contexto con newsletter
        const thumbnail = await getThumbnail()
        const ctxInfo = {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                serverMessageId: '',
                newsletterName: global.newsletterName || 'Nino Nakano'
            },
            externalAdReply: {
                title: title.slice(0, 60),
                body: (global.botName || 'Nino Nakano') + ' Music',
                thumbnailUrl: thumb,
                sourceUrl: videoUrl,
                thumbnail,
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false
            }
        }

        // 6. Enviar
        await m.react('📤')

        if (isVideo) {
            await conn.sendMessage(m.chat, {
                video: buffer,
                caption: infoTxt,
                mimetype: 'video/mp4',
                contextInfo: ctxInfo
            }, { quoted: m })
        } else {
            // Audio + info separados
            await conn.sendMessage(m.chat, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: ctxInfo
            }, { quoted: m })

            await conn.sendMessage(m.chat, {
                image: { url: thumb },
                caption: infoTxt,
                contextInfo: {
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                        serverMessageId: '',
                        newsletterName: global.newsletterName || 'Nino Nakano'
                    },
                    externalAdReply: {
                        title: title.slice(0, 60),
                        body: (global.botName || 'Nino Nakano') + ' Music',
                        thumbnailUrl: thumb,
                        sourceUrl: videoUrl,
                        mediaType: 1,
                        renderLargerThumbnail: false,
                        showAdAttribution: false
                    }
                }
            }, { quoted: m })
        }

        await m.react('✅')

    } catch (e) {
        console.error('[PLAY ERROR]', e.message)
        await m.react('❌')
        return sendPlay(conn, m,
            '❌ *Error al procesar tu solicitud*\n\n' +
            '🔍 Busqueda: *' + query + '*\n' +
            '⚠️ ' + e.message + '\n\n' +
            '_Intenta de nuevo en unos segundos_'
        )
    }
}

handler.command = ['play', 'playvid', 'playv', 'musica']
export default handler
