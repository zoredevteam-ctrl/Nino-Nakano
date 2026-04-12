/**
 * PLAY - NINO NAKANO
 * #play (audio) | #playvid (video)
 * Búsqueda: yt-search → AlyaBot → GiftedTech
 * Descarga: AlyaBot ytmp3v2 / ytmp4 → GiftedTech → Causas
 */

import yts from 'yt-search'

const GIFTED_API = 'https://api.giftedtech.co.ke/api'
const GIFTED_KEY = 'Fedex'
const ALYA_BASE  = 'https://rest.alyabotpe.xyz'
const ALYA_KEY   = 'Duarte-zz12'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const apiGet = async (url, timeout = 15000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Accept': 'application/json'
            }
        })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
    } finally {
        clearTimeout(timer)
    }
}

// Usa getBannerThumb y getNewsletterCtx de settings.js directamente
const sendPlay = async (conn, m, text) => {
    const thumbnail = await global.getBannerThumb()
    const ctx = global.getNewsletterCtx(thumbnail, '🎵 ' + global.botName + ' Music', 'Sistema de Música')
    return conn.sendMessage(m.chat, { text, contextInfo: ctx }, { quoted: m })
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

    // ── 1. yt-search (sin API key, método principal) ──
    try {
        const { videos } = await yts(query)
        if (videos?.length) {
            const s = videos[0]
            console.log('[PLAY] OK yt-search:', s.title)
            return {
                title:    s.title,
                videoUrl: s.url,
                author:   s.author?.name || 'Desconocido',
                duration: s.timestamp || 'N/A',
                views:    formatViews(s.views || 0),
                thumb:    s.thumbnail || s.image || ''
            }
        }
    } catch (e) { console.log('[PLAY] yt-search falló:', e.message) }

    // ── 2. AlyaBot search ──
    try {
        const r = await apiGet(`${ALYA_BASE}/search/youtube?q=${encodeURIComponent(query)}&key=${ALYA_KEY}`)
        const results = r?.data || r?.result || r?.results || []
        const s = Array.isArray(results) ? results[0] : results
        if (s?.title) {
            const vid = s.id || s.videoId
            console.log('[PLAY] OK AlyaBot search:', s.title)
            return {
                title:    s.title,
                videoUrl: vid ? `https://youtube.com/watch?v=${vid}` : s.url || '',
                author:   s.channel || s.author || 'Desconocido',
                duration: s.duration || s.length || 'N/A',
                views:    formatViews(s.views || s.viewCount || 0),
                thumb:    s.thumbnail || s.image || ''
            }
        }
    } catch (e) { console.log('[PLAY] AlyaBot search falló:', e.message) }

    // ── 3. AlyaBot youtubeplay (busca y da descarga directa) ──
    try {
        const r = await apiGet(`${ALYA_BASE}/dl/youtubeplay?query=${encodeURIComponent(query)}&key=${ALYA_KEY}`, 20000)
        if (r?.status && r?.data?.title) {
            console.log('[PLAY] OK AlyaBot youtubeplay:', r.data.title)
            return {
                title:     r.data.title,
                videoUrl:  r.data.videoUrl || r.data.url || query,
                author:    r.data.channel || 'Desconocido',
                duration:  r.data.duration || 'N/A',
                views:     'N/A',
                thumb:     r.data.thumbnail || '',
                directUrl: r.data.download || r.data.dl || null
            }
        }
    } catch (e) { console.log('[PLAY] AlyaBot youtubeplay falló:', e.message) }

    // ── 4. GiftedTech ytsearch ──
    try {
        const r = await apiGet(`${GIFTED_API}/search/ytsearch?apikey=${GIFTED_KEY}&q=${encodeURIComponent(query)}`)
        const s = r?.result?.[0] || r?.results?.[0] || r?.data?.[0]
        if (s?.title) {
            const vid = s.id || s.videoId
            console.log('[PLAY] OK GiftedTech ytsearch:', s.title)
            return {
                title:    s.title,
                videoUrl: vid ? `https://youtube.com/watch?v=${vid}` : s.url || '',
                author:   s.channel || s.author || 'Desconocido',
                duration: s.duration || s.length || 'N/A',
                views:    formatViews(s.views || s.viewCount || 0),
                thumb:    s.thumbnail || s.image || ''
            }
        }
    } catch (e) { console.log('[PLAY] GiftedTech ytsearch falló:', e.message) }

    return null
}

// ─── DESCARGA AUDIO ───────────────────────────────────────────────────────────

const getAudio = async (url) => {
    const fuentes = [
        {
            // Principal — igual que el bot de referencia
            nombre: 'AlyaBot ytmp3v2',
            fn: async () => {
                const r = await apiGet(`${ALYA_BASE}/dl/ytmp3v2?url=${encodeURIComponent(url)}&key=${ALYA_KEY}`)
                return r?.status ? (r.data?.dl || r.data?.url || r.data?.download) : null
            }
        },
        {
            nombre: 'AlyaBot ytmp3',
            fn: async () => {
                const r = await apiGet(`${ALYA_BASE}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${ALYA_KEY}`)
                return r?.status ? (r.data?.dl || r.data?.url || r.data?.download) : null
            }
        },
        {
            nombre: 'GiftedTech ytmp3',
            fn: async () => {
                const r = await apiGet(`${GIFTED_API}/download/ytmp3?apikey=${GIFTED_KEY}&url=${encodeURIComponent(url)}`)
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.audio || null
            }
        },
        {
            nombre: 'GiftedTech savetubemp3',
            fn: async () => {
                const r = await apiGet(`${GIFTED_API}/download/savetubemp3?apikey=${GIFTED_KEY}&url=${encodeURIComponent(url)}`)
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.audio || null
            }
        }
    ]

    for (const { nombre, fn } of fuentes) {
        try {
            console.log('[PLAY] Intentando audio:', nombre)
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                console.log('[PLAY] Audio OK:', nombre)
                return link
            }
        } catch (e) {
            console.log('[PLAY] Falló', nombre + ':', e.message)
        }
    }
    throw new Error('Ninguna API pudo obtener el audio')
}

// ─── DESCARGA VIDEO ───────────────────────────────────────────────────────────

const getVideo = async (url) => {
    const fuentes = [
        {
            // Principal — igual que el bot de referencia
            nombre: 'AlyaBot ytmp4',
            fn: async () => {
                const r = await apiGet(`${ALYA_BASE}/dl/ytmp4?url=${encodeURIComponent(url)}&key=${ALYA_KEY}`)
                return r?.status ? (r.data?.dl || r.data?.url || r.data?.download) : null
            }
        },
        {
            nombre: 'GiftedTech ytmp4',
            fn: async () => {
                const r = await apiGet(`${GIFTED_API}/download/ytmp4?apikey=${GIFTED_KEY}&url=${encodeURIComponent(url)}`)
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.video || null
            }
        },
        {
            nombre: 'GiftedTech savetubemp4',
            fn: async () => {
                const r = await apiGet(`${GIFTED_API}/download/savetubemp4?apikey=${GIFTED_KEY}&url=${encodeURIComponent(url)}`)
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.video || null
            }
        },
        {
            nombre: 'API Causas video',
            fn: async () => {
                const r = await apiGet(`https://api-causas.duckdns.org/api/v1/descargas/youtube?url=${encodeURIComponent(url)}&type=video&apikey=causa-adc2c572476abdd8`)
                return r?.status ? (r.data?.download?.url || r.data?.download) : null
            }
        }
    ]

    for (const { nombre, fn } of fuentes) {
        try {
            console.log('[PLAYVID] Intentando video:', nombre)
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                console.log('[PLAYVID] Video OK:', nombre)
                return link
            }
        } catch (e) {
            console.log('[PLAYVID] Falló', nombre + ':', e.message)
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
            (isVideo ? '🎬' : '🎵') + ' *' + (isVideo ? 'PLAY VIDEO' : 'PLAY MÚSICA') + '*\n\n' +
            'Uso: *' + global.prefix + cmd + ' <nombre o link>*\n' +
            'Ejemplo: *' + global.prefix + cmd + ' bad bunny titi me pregunto*'
        )
    }

    await m.react('🔍')

    try {
        // ── 1. Resolver búsqueda o link directo ──
        let song = null
        const isYtLink = query.includes('youtube.com/watch') || query.includes('youtu.be/')

        if (isYtLink) {
            song = {
                title:    'YouTube Video',
                videoUrl: query,
                author:   'N/A',
                duration: 'N/A',
                views:    'N/A',
                thumb:    global.banner
            }
        } else {
            song = await searchYoutube(query)
        }

        if (!song?.videoUrl) {
            await m.react('❌')
            return sendPlay(conn, m,
                '❌ No encontré resultados para *' + query + '*\n\n' +
                '_Intenta con el link directo o un nombre más específico_\n' +
                '_Ejemplo: https://youtube.com/watch?v=..._'
            )
        }

        await m.react('⬇️')

        // ── 2. Obtener URL de descarga ──
        const finalUrl = song.directUrl || (
            isVideo ? await getVideo(song.videoUrl) : await getAudio(song.videoUrl)
        )

        // ── 3. Contexto newsletter usando getNewsletterCtx de settings.js ──
        const thumbnail = await global.getBannerThumb()
        const ctxInfo = global.getNewsletterCtx(
            thumbnail,
            song.title.slice(0, 60),
            global.botName + ' Music 🎵'
        )
        ctxInfo.externalAdReply.thumbnailUrl          = song.thumb || global.banner
        ctxInfo.externalAdReply.sourceUrl             = song.videoUrl
        ctxInfo.externalAdReply.renderLargerThumbnail = isVideo

        // ── 4. Info del track ──
        const infoTxt =
            '🎵 *' + song.title + '*\n' +
            '👤 *Canal:* ' + song.author + '\n' +
            '⏱️ *Duración:* ' + song.duration + '\n' +
            '👁️ *Vistas:* ' + song.views + '\n' +
            '🔗 ' + song.videoUrl

        await m.react('📤')

        if (isVideo) {
            // Video por URL directa (evita timeout en archivos grandes)
            await conn.sendMessage(m.chat, {
                video: { url: finalUrl },
                caption: infoTxt,
                mimetype: 'video/mp4',
                contextInfo: ctxInfo
            }, { quoted: m })

        } else {
            // Audio como buffer (requerido por Baileys para audio/mpeg)
            const audioRes = await fetch(finalUrl)
            if (!audioRes.ok) throw new Error('Error al descargar audio: HTTP ' + audioRes.status)
            const audioBuffer = Buffer.from(await audioRes.arrayBuffer())

            if (!audioBuffer || audioBuffer.length < 1000) {
                throw new Error('El archivo de audio está vacío o corrupto')
            }

            await conn.sendMessage(m.chat, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: ctxInfo
            }, { quoted: m })

            // Imagen con info (igual que el bot de referencia)
            if (song.thumb) {
                const thumbCtx = global.getNewsletterCtx(thumbnail, song.title.slice(0, 60), global.botName + ' Music 🎵')
                thumbCtx.externalAdReply.thumbnailUrl = song.thumb
                thumbCtx.externalAdReply.sourceUrl    = song.videoUrl

                await conn.sendMessage(m.chat, {
                    image: { url: song.thumb },
                    caption: infoTxt,
                    contextInfo: thumbCtx
                }, { quoted: m })
            }
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
