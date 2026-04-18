/**
 * PLAY - NINO NAKANO
 * #play (audio) | #playvid (video)
 * Sin yt-search ni node-fetch — usa fetch global de Node 18+
 * Z0RT SYSTEMS 🦋
 */

const ALYA_BASE  = 'https://rest.alyabotpe.xyz'
const ALYA_KEY   = 'Duarte-zz12'
const GIFTED_API = 'https://api.giftedtech.co.ke/api'
const GIFTED_KEY = 'Fedex'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const apiGet = async (url, timeout = 20000) => {
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

const formatViews = (views) => {
    try {
        const n = parseInt(views) || 0
        if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
        if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M'
        if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'k'
        return n.toLocaleString()
    } catch { return String(views || 0) }
}

// ─── BÚSQUEDA YOUTUBE — sin scraping, solo APIs ───────────────────────────────

const searchYoutube = async (query) => {

    // ── 1. AlyaBot youtubeplay (busca + descarga en 1 call) ──
    try {
        const r = await apiGet(`${ALYA_BASE}/dl/youtubeplay?query=${encodeURIComponent(query)}&key=${ALYA_KEY}`)
        if (r?.status && (r.data?.title || r.result?.title)) {
            const d = r.data || r.result
            console.log('[PLAY] OK AlyaBot youtubeplay:', d.title)
            return {
                title:     d.title    || query,
                url:       d.videoUrl || d.url || '',
                author:    d.channel  || 'Desconocido',
                duration:  d.duration || 'N/A',
                views:     'N/A',
                thumb:     d.thumbnail || '',
                directUrl: d.download  || d.dl || null
            }
        }
    } catch (e) { console.log('[PLAY] AlyaBot youtubeplay falló:', e.message) }

    // ── 2. AlyaBot search ──
    try {
        const r = await apiGet(`${ALYA_BASE}/search/youtube?q=${encodeURIComponent(query)}&key=${ALYA_KEY}`)
        const list = r?.data || r?.result || r?.results || []
        const s = Array.isArray(list) ? list[0] : list
        if (s?.title) {
            const vid = s.id || s.videoId
            console.log('[PLAY] OK AlyaBot search:', s.title)
            return {
                title:    s.title,
                url:      vid ? `https://youtube.com/watch?v=${vid}` : s.url || '',
                author:   s.channel  || s.author || 'Desconocido',
                duration: s.duration || s.length || 'N/A',
                views:    formatViews(s.views || s.viewCount || 0),
                thumb:    s.thumbnail || s.image || ''
            }
        }
    } catch (e) { console.log('[PLAY] AlyaBot search falló:', e.message) }

    // ── 3. GiftedTech ytsearch ──
    try {
        const r = await apiGet(`${GIFTED_API}/search/ytsearch?apikey=${GIFTED_KEY}&q=${encodeURIComponent(query)}`)
        const s = r?.result?.[0] || r?.results?.[0] || r?.data?.[0]
        if (s?.title) {
            const vid = s.id || s.videoId
            console.log('[PLAY] OK GiftedTech ytsearch:', s.title)
            return {
                title:    s.title,
                url:      vid ? `https://youtube.com/watch?v=${vid}` : s.url || '',
                author:   s.channel  || s.author || 'Desconocido',
                duration: s.duration || s.length || 'N/A',
                views:    formatViews(s.views || s.viewCount || 0),
                thumb:    s.thumbnail || s.image || ''
            }
        }
    } catch (e) { console.log('[PLAY] GiftedTech ytsearch falló:', e.message) }

    // ── 4. GiftedTech ytdl ──
    try {
        const r = await apiGet(`${GIFTED_API}/download/ytdl?apikey=${GIFTED_KEY}&url=${encodeURIComponent(query)}`)
        if (r?.result?.title) {
            console.log('[PLAY] OK GiftedTech ytdl:', r.result.title)
            return {
                title:     r.result.title,
                url:       r.result.videoUrl || query,
                author:    r.result.channel  || 'Desconocido',
                duration:  r.result.duration || 'N/A',
                views:     'N/A',
                thumb:     r.result.thumbnail || '',
                directUrl: r.result.url || null
            }
        }
    } catch (e) { console.log('[PLAY] GiftedTech ytdl falló:', e.message) }

    return null
}

// ─── DESCARGA AUDIO ───────────────────────────────────────────────────────────

const getAudio = async (url) => {
    const fuentes = [
        {
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
        }
    ]
    for (const { nombre, fn } of fuentes) {
        try {
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                console.log('[PLAY] Audio OK:', nombre)
                return link
            }
        } catch (e) { console.log('[PLAY] Falló', nombre + ':', e.message) }
    }
    throw new Error('Ninguna API pudo obtener el audio')
}

// ─── DESCARGA VIDEO ───────────────────────────────────────────────────────────

const getVideo = async (url) => {
    const fuentes = [
        {
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
        }
    ]
    for (const { nombre, fn } of fuentes) {
        try {
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                console.log('[PLAYVID] Video OK:', nombre)
                return link
            }
        } catch (e) { console.log('[PLAYVID] Falló', nombre + ':', e.message) }
    }
    throw new Error('Ninguna API pudo obtener el video')
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

const handler = async (m, { conn, command, text }) => {
    const cmd     = command.toLowerCase()
    const isVideo = cmd.includes('vid') || cmd.includes('v') || cmd === 'playv'
    const query   = (text || '').trim()

    if (!query) return m.reply(
        `${isVideo ? '🎬' : '🎵'} *${isVideo ? 'PLAY VIDEO' : 'PLAY MÚSICA'}*\n\n` +
        `Uso: *${global.prefix + cmd} <nombre o link>*\n` +
        `Ejemplo: *${global.prefix + cmd} bad bunny titi me pregunto*`
    )

    await m.react('🔍')

    try {
        // ── 1. Resolver búsqueda o link directo ──
        let song = null
        const isYtLink = query.includes('youtube.com/watch') || query.includes('youtu.be/')

        if (isYtLink) {
            song = { title: 'YouTube Video', url: query, author: 'N/A', duration: 'N/A', views: 'N/A', thumb: '' }
        } else {
            song = await searchYoutube(query)
        }

        if (!song?.url) {
            await m.react('❌')
            return m.reply(`❌ No encontré resultados para *${query}*\n\n_Intenta con el link directo o un nombre más específico_`)
        }

        await m.react(isVideo ? '🎬' : '🎵')

        // ── 2. Obtener URL de descarga ──
        const finalUrl = song.directUrl || (isVideo ? await getVideo(song.url) : await getAudio(song.url))

        const caption =
            `🎵 *${song.title}*\n` +
            `👤 *Canal:* ${song.author}\n` +
            `⏱️ *Duración:* ${song.duration}\n` +
            `👁️ *Vistas:* ${song.views}\n` +
            `🔗 ${song.url}`

        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, song.title.slice(0, 60), global.botName + ' Music 🎵')
        ctx.externalAdReply.thumbnailUrl          = song.thumb || global.banner
        ctx.externalAdReply.sourceUrl             = song.url
        ctx.externalAdReply.renderLargerThumbnail = isVideo

        await m.react('📤')

        if (isVideo) {
            await conn.sendMessage(m.chat, {
                video: { url: finalUrl },
                caption,
                mimetype: 'video/mp4',
                contextInfo: ctx
            }, { quoted: m })
        } else {
            const audioRes = await fetch(finalUrl)
            if (!audioRes.ok) throw new Error('Error al descargar audio: HTTP ' + audioRes.status)
            const audioBuffer = Buffer.from(await audioRes.arrayBuffer())

            await conn.sendMessage(m.chat, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: ctx
            }, { quoted: m })

            if (song.thumb) {
                const thumbCtx = global.getNewsletterCtx(thumb, song.title.slice(0, 60), global.botName + ' Music 🎵')
                thumbCtx.externalAdReply.thumbnailUrl = song.thumb
                thumbCtx.externalAdReply.sourceUrl    = song.url
                await conn.sendMessage(m.chat, {
                    image: { url: song.thumb },
                    caption,
                    contextInfo: thumbCtx
                }, { quoted: m })
            }
        }

        await m.react('✅')

    } catch (e) {
        console.error('[PLAY ERROR]', e.message)
        await m.react('❌')
        m.reply(`❌ *Error al procesar*\n\n⚠️ ${e.message}\n\n_Intenta de nuevo en unos segundos_ 🦋`)
    }
}

handler.help    = ['play', 'playvid']
handler.tags    = ['descargas']
handler.command = ['play', 'playvid', 'playv', 'musica']
export default handler
