/**
 * PLAY - NINO NAKANO
 * #play (audio) | #playvid (video)
 * Busqueda: yt-search (principal) → APIs fallback
 * APIs: GiftedTech (Fedex) -> AlyaBot -> Causas
 */

import yts from 'yt-search'

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
            forwardedNewstelterMessageInfo: {
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
        if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
        if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M'
        if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'k'
        return n.toLocaleString()
    } catch { return String(views || 0) }
}

// ─── BÚSQUEDA YOUTUBE ─────────────────────────────────────────────────────────

const searchYoutube = async (query) => {

    // ── 1. yt-search ──
    try {
        const { videos } = await yts(query)
        if (videos && videos.length > 0) {
            const s = videos[0]
            console.log('[PLAY] OK yt-search: ' + s.title)
            return {
                title:    s.title,
                videoUrl: s.url,
                author:   s.author?.name || 'N/A',
                duration: s.timestamp || 'N/A',
                views:    formatViews(s.views || 0),
                thumb:    s.thumbnail || s.image || ''
            }
        }
    } catch (e) { console.log('[PLAY] yt-search fallo: ' + e.message) }

    // ── 2. GiftedTech ytsearch ──
    try {
        const r = await apiGet(GIFTED_API + '/search/ytsearch?apikey=' + GIFTED_KEY + '&q=' + encodeURIComponent(query))
        const s = r?.result?.[0] || r?.results?.[0] || r?.data?.[0]
        if (s?.title) {
            const vid = s.id || s.videoId
            console.log('[PLAY] OK GiftedTech ytsearch: ' + s.title)
            return {
                title:    s.title,
                videoUrl: vid ? 'https://youtube.com/watch?v=' + vid : s.url || '',
                author:   s.channel || s.author || 'N/A',
                duration: s.duration || s.length || 'N/A',
                views:    formatViews(s.views || s.viewCount || 0),
                thumb:    s.thumbnail || s.image || ''
            }
        }
    } catch (e) { console.log('[PLAY] GiftedTech ytsearch fallo: ' + e.message) }

    // ── 3. AlyaBot search ──
    try {
        const r = await apiGet('https://rest.alyabotpe.xyz/search/youtube?q=' + encodeURIComponent(query) + '&key=' + ALYA_KEY)
        const results = r?.data || r?.result || r?.results || []
        const s = Array.isArray(results) ? results[0] : results
        if (s?.title) {
            const vid = s.id || s.videoId
            console.log('[PLAY] OK AlyaBot search: ' + s.title)
            return {
                title:    s.title,
                videoUrl: vid ? 'https://youtube.com/watch?v=' + vid : s.url || '',
                author:   s.channel || s.author || 'N/A',
                duration: s.duration || s.length || 'N/A',
                views:    formatViews(s.views || s.viewCount || 0),
                thumb:    s.thumbnail || s.image || ''
            }
        }
    } catch (e) { console.log('[PLAY] AlyaBot search fallo: ' + e.message) }

    // ── 4. API Causas search ──
    try {
        const r = await apiGet('https://api-causas.duckdns.org/api/v1/buscar/youtube?q=' + encodeURIComponent(query) + '&apikey=causa-adc2c572476abdd8')
        const s = r?.data?.[0] || r?.result?.[0] || r?.results?.[0]
        if (s?.title) {
            const vid = s.id || s.videoId
            console.log('[PLAY] OK Causas search: ' + s.title)
            return {
                title:    s.title,
                videoUrl: vid ? 'https://youtube.com/watch?v=' + vid : s.url || '',
                author:   s.channel || s.author || 'N/A',
                duration: s.duration || 'N/A',
                views:    formatViews(s.views || 0),
                thumb:    s.thumbnail || s.image || ''
            }
        }
    } catch (e) { console.log('[PLAY] Causas search fallo: ' + e.message) }

    // ── 5. GiftedTech ytdl — manda el query directo, busca y descarga ──
    try {
        const r = await apiGet(GIFTED_API + '/download/ytdl?apikey=' + GIFTED_KEY + '&url=' + encodeURIComponent(query), 20000)
        if (r?.result?.title) {
            console.log('[PLAY] OK GiftedTech ytdl: ' + r.result.title)
            return {
                title:     r.result.title,
                videoUrl:  r.result.videoUrl || query,
                author:    r.result.channel || 'N/A',
                duration:  r.result.duration || 'N/A',
                views:     'N/A',
                thumb:     r.result.thumbnail || '',
                directUrl: r.result.url || null
            }
        }
    } catch (e) { console.log('[PLAY] GiftedTech ytdl fallo: ' + e.message) }

    // ── 6. AlyaBot youtubeplay — última opción, manda query crudo ──
    try {
        const r = await apiGet('https://rest.alyabotpe.xyz/dl/youtubeplay?query=' + encodeURIComponent(query) + '&key=' + ALYA_KEY, 20000)
        if (r?.status && r?.data) {
            console.log('[PLAY] OK AlyaBot youtubeplay directo')
            return {
                title:     r.data.title || query,
                videoUrl:  r.data.videoUrl || r.data.url || query,
                author:    r.data.channel || 'N/A',
                duration:  r.data.duration || 'N/A',
                views:     'N/A',
                thumb:     r.data.thumbnail || '',
                directUrl: r.data.download || r.data.dl || null
            }
        }
    } catch (e) { console.log('[PLAY] AlyaBot youtubeplay fallo: ' + e.message) }

    return null
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
            nombre: 'AlyaBot ytmp3',
            fn: async () => {
                const r = await apiGet('https://rest.alyabotpe.xyz/dl/ytmp3?url=' + encodeURIComponent(url) + '&key=' + ALYA_KEY)
                return r?.status ? (r.data?.dl || r.data?.url || r.data?.download) : null
            }
        },
        {
            nombre: 'AlyaBot Play',
            fn: async () => {
                const r = await apiGet('https://rest.alyabotpe.xyz/dl/youtubeplay?query=' + encodeURIComponent(url) + '&key=' + ALYA_KEY)
                return r?.status ? (r.data?.download || r.data?.dl || r.data?.url) : null
            }
        }
    ]

    for (const { nombre, fn } of fuentes) {
        try {
            console.log('[PLAY] Intentando audio: ' + nombre)
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                console.log('[PLAY] Audio OK: ' + nombre)
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
            console.log('[PLAYVID] Intentando video: ' + nombre)
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                console.log('[PLAYVID] Video OK: ' + nombre)
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
        // 1. Resolver si es link directo o búsqueda
        let song = null

        if (query.includes('youtube.com/watch') || query.includes('youtu.be/')) {
            // Link directo — construir objeto mínimo
            song = {
                title:    query,
                videoUrl: query,
                author:   'N/A',
                duration: 'N/A',
                views:    'N/A',
                thumb:    global.banner || ''
            }
        } else {
            song = await searchYoutube(query)
        }

        if (!song || !song.videoUrl) {
            await m.react('❌')
            return sendPlay(conn, m,
                '❌ No encontré resultados para *' + query + '*\n\n' +
                '_Intenta con el link directo o un nombre más específico_\n' +
                '_Ejemplo: https://youtube.com/watch?v=..._'
            )
        }

        await m.react('⬇️')

        // 2. Si GiftedTech ytdl ya dio URL directa, usarla; si no, descargar
        let finalUrl = song.directUrl || null
        if (!finalUrl) {
            finalUrl = isVideo
                ? await getVideo(song.videoUrl)
                : await getAudio(song.videoUrl)
        }

        // 3. Descargar buffer con timeout de 60s
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 60000)
        let buffer
        try {
            const mediaRes = await fetch(finalUrl, { signal: controller.signal })
            if (!mediaRes.ok) throw new Error('Error al descargar archivo: HTTP ' + mediaRes.status)
            buffer = Buffer.from(await mediaRes.arrayBuffer())
        } finally {
            clearTimeout(timer)
        }

        if (!buffer || buffer.length < 1000) {
            throw new Error('El archivo descargado está vacío o corrupto')
        }

        // 4. Texto de info
        const infoTxt =
            '🎵 *' + song.title + '*\n' +
            '👤 *Canal:* ' + song.author + '\n' +
            '⏱️ *Duración:* ' + song.duration + '\n' +
            '👁️ *Vistas:* ' + song.views + '\n' +
            '🔗 ' + song.videoUrl

        // 5. Contexto newsletter
        const thumbnail = await getThumbnail()
        const ctxInfo = {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                serverMessageId: '',
                newsletterName: global.newsletterName || 'Nino Nakano'
            },
            externalAdReply: {
                title: song.title.slice(0, 60),
                body: (global.botName || 'Nino Nakano') + ' Music',
                thumbnailUrl: song.thumb,
                sourceUrl: song.videoUrl,
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
            await conn.sendMessage(m.chat, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: ctxInfo
            }, { quoted: m })

            await conn.sendMessage(m.chat, {
                image: { url: song.thumb || global.banner || '' },
                caption: infoTxt,
                contextInfo: {
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                        serverMessageId: '',
                        newsletterName: global.newsletterName || 'Nino Nakano'
                    },
                    externalAdReply: {
                        title: song.title.slice(0, 60),
                        body: (global.botName || 'Nino Nakano') + ' Music',
                        thumbnailUrl: song.thumb,
                        sourceUrl: song.videoUrl,
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
            '🔍 Búsqueda: *' + query + '*\n' +
            '⚠️ ' + e.message + '\n\n' +
            '_Intenta de nuevo en unos segundos_'
        )
    }
}

handler.command = ['play', 'playvid', 'playv', 'musica']
export default handler
