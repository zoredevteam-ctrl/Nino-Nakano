/**
 * PLAY - NINO NAKANO 🦋
 * Descarga audio de YouTube
 * API Principal: NexEvo (nex-magical.vercel.app)
 * Fallback: AlyaBot → GiftedTech
 * Z0RT SYSTEMS
 */

const NEX_BASE   = 'https://nex-magical.vercel.app'
const NEX_KEY    = 'NEX-D0E7E64C8F5E44E98F00D6B4'
const ALYA_BASE  = 'https://rest.alyabotpe.xyz'
const ALYA_KEY   = 'Duarte-zz12'
const GIFTED_API = 'https://api.giftedtech.co.ke/api'
const GIFTED_KEY = 'Fedex'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// NexEvo devuelve JSON con valores en español (verdadero/falso/nulo)
// que NO son JSON válido — hay que parsear manualmente
const nexFetch = async (url, timeout = 20000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36',
                'Accept': 'application/json',
                'x-api-key': NEX_KEY
            }
        })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const raw = await res.text()
        // Reemplazar valores en español por valores JSON válidos
        const fixed = raw
            .replace(/\bverdadero\b/g, 'true')
            .replace(/\bfalso\b/g,     'false')
            .replace(/\bnulo\b/g,      'null')
        return JSON.parse(fixed)
    } finally {
        clearTimeout(timer)
    }
}

const apiGet = async (url, timeout = 20000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36',
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

// ─── BÚSQUEDA YOUTUBE ─────────────────────────────────────────────────────────

const searchYoutube = async (query) => {

    // ── 1. NexEvo search/youtube — principal ──
    try {
        const r = await nexFetch(`${NEX_BASE}/search/youtube?q=${encodeURIComponent(query)}&apikey=${NEX_KEY}`)
        if (r?.status && r?.result?.length) {
            // Preferir videos de más de 1 minuto (evitar shorts)
            const filtered = r.result.filter(v => {
                const parts = (v.duration || '0:00').split(':')
                const secs  = parts.length >= 2
                    ? parseInt(parts[parts.length - 2]) * 60 + parseInt(parts[parts.length - 1])
                    : 0
                return secs >= 60
            })
            const s = filtered[0] || r.result[0]
            console.log('[PLAY] OK NexEvo search:', s.title)
            return {
                title:    s.title,
                url:      s.link,
                author:   s.channel  || 'Desconocido',
                duration: s.duration || 'N/A',
                views:    'N/A',
                thumb:    s.imageUrl || ''
            }
        }
    } catch (e) { console.log('[PLAY] NexEvo search falló:', e.message) }

    // ── 2. AlyaBot youtubeplay ──
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

    // ── 3. AlyaBot search ──
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

    // ── 4. GiftedTech ytsearch ──
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

    return null
}

// ─── DESCARGA AUDIO ───────────────────────────────────────────────────────────

const getAudio = async (url) => {
    const fuentes = [
        {
            // NexEvo devuelve JSON con español — usar nexFetch
            nombre: 'NexEvo download/audio',
            fn: async () => {
                const r = await nexFetch(`${NEX_BASE}/download/audio?url=${encodeURIComponent(url)}&apikey=${NEX_KEY}`)
                console.log('[PLAY] NexEvo raw:', JSON.stringify(r).slice(0, 100))
                return r?.estado ? (r.resultado?.url || null) : null
            }
        },
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
            console.log('[PLAY] Intentando:', nombre)
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                console.log('[PLAY] Audio OK:', nombre)
                return link
            }
        } catch (e) { console.log('[PLAY] Falló', nombre + ':', e.message) }
    }
    throw new Error('Ninguna API pudo obtener el audio')
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, command, text }) => {
    const query = (text || '').trim()

    if (!query) {
        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, `🎵 ${global.botName}`, 'Music Downloader')
        return conn.sendMessage(m.chat, {
            text:
                `╭━━━━━━━━━━━━━━━━╮\n` +
                `┃  🎵 *NINO MUSIC* 🎵\n` +
                `╰━━━━━━━━━━━━━━━━╯\n\n` +
                `*ᐛ🎀* ¿Qué canción quieres escuchar?\n` +
                `> ✰ Dime el nombre o pega el link de YouTube~\n\n` +
                `✦ *Uso:*\n` +
                `› *${global.prefix}play* nombre o link\n\n` +
                `✦ *Ejemplos:*\n` +
                `› *${global.prefix}play* bad bunny tití me preguntó\n` +
                `› *${global.prefix}play* https://youtu.be/...\n\n` +
                `_¡No me hagas esperar, tonto!_ 🦋`,
            contextInfo: ctx
        }, { quoted: m })
    }

    await m.react('🔍')

    try {
        // ── 1. Resolver búsqueda o link directo ──
        let song = null
        const isYtLink = query.includes('youtube.com/watch') || query.includes('youtu.be/')

        if (isYtLink) {
            const videoId = query.match(/(?:youtu\.be\/|watch\?v=)([a-zA-Z0-9_-]{11})/)?.[1]
            song = {
                title:    'YouTube Video',
                url:      query,
                author:   'N/A',
                duration: 'N/A',
                views:    'N/A',
                thumb:    videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : ''
            }
        } else {
            song = await searchYoutube(query)
        }

        if (!song?.url) {
            await m.react('❌')
            const thumb = await global.getBannerThumb()
            const ctx   = global.getNewsletterCtx(thumb, `❌ ${global.botName}`, 'Sin resultados')
            return conn.sendMessage(m.chat, {
                text:
                    `╭━━━━━━━━━━━━━━━━╮\n` +
                    `┃  ❌ *SIN RESULTADOS*\n` +
                    `╰━━━━━━━━━━━━━━━━╯\n\n` +
                    `*ᐛ🎀* No encontré nada para *${query}*\n` +
                    `> ✰ Intenta con un nombre más específico o usa el link directo~\n\n` +
                    `_Ejemplo: https://youtu.be/..._ 🦋`,
                contextInfo: ctx
            }, { quoted: m })
        }

        // ── 2. Enviar thumbnail con info ──
        const caption =
            `╭━━━━━━━━━━━━━━━━╮\n` +
            `┃  🎵 *NINO MUSIC* 🎵\n` +
            `╰━━━━━━━━━━━━━━━━╯\n\n` +
            `➥ *${song.title}*\n\n` +
            `✿⃘ *Canal* › ${song.author}\n` +
            `✿⃘ *Duración* › ${song.duration}\n` +
            `✿⃘ *Vistas* › ${song.views}\n` +
            `✿⃘ *Link* › ${song.url}\n\n` +
            `𐙚 ❀ ｡ ↻ _Dame un momento, ya te envío el audio~_ 🦋`

        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, song.title.slice(0, 60), global.botName + ' Music 🎵')
        ctx.externalAdReply.thumbnailUrl = song.thumb || global.banner
        ctx.externalAdReply.sourceUrl    = song.url

        if (song.thumb) {
            await conn.sendMessage(m.chat, { image: { url: song.thumb }, caption, contextInfo: ctx }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { text: caption, contextInfo: ctx }, { quoted: m })
        }

        await m.react('⬇️')

        // ── 3. Descargar audio ──
        const audioUrl    = song.directUrl || await getAudio(song.url)
        const audioRes    = await fetch(audioUrl)
        if (!audioRes.ok) throw new Error('Error al descargar: HTTP ' + audioRes.status)
        const audioBuffer = Buffer.from(await audioRes.arrayBuffer())

        if (!audioBuffer || audioBuffer.length < 1000) throw new Error('El audio está vacío o corrupto')

        // ── 4. Enviar audio ──
        const audioCtx = global.getNewsletterCtx(thumb, song.title.slice(0, 60), global.botName + ' Music 🎵')
        audioCtx.externalAdReply.thumbnailUrl = song.thumb || global.banner
        audioCtx.externalAdReply.sourceUrl    = song.url

        await conn.sendMessage(m.chat, {
            audio:       audioBuffer,
            mimetype:    'audio/mpeg',
            ptt:         false,
            fileName:    song.title.slice(0, 60) + '.mp3',
            contextInfo: audioCtx
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error('[PLAY ERROR]', e.message)
        await m.react('❌')
        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, `❌ ${global.botName}`, 'Error')
        return conn.sendMessage(m.chat, {
            text:
                `╭━━━━━━━━━━━━━━━━╮\n` +
                `┃  ❌ *ERROR AL PROCESAR*\n` +
                `╰━━━━━━━━━━━━━━━━╯\n\n` +
                `*ᐛ🎀* Ugh, algo salió mal...\n` +
                `> ✰ ${e.message}\n\n` +
                `_Intenta de nuevo en unos segundos, tonto_ 🦋`,
            contextInfo: ctx
        }, { quoted: m })
    }
}

handler.help    = ['play <canción o link>']
handler.tags    = ['descargas']
handler.command = ['play', 'mp3', 'ytmp3', 'musica', 'playaudio']
export default handler
