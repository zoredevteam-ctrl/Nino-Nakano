/**
 * PLAY - NINO NAKANO 🦋
 * Descarga audio de YouTube
 * API: NexEvo (nex-magical.vercel.app)
 * Z0RT SYSTEMS
 */

const NEX_BASE = 'https://nex-magical.vercel.app'
const NEX_KEY  = 'NEX-D0E7E64C8F5E44E98F00D6B4'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// NexEvo a veces responde con valores en español — normalizamos siempre
const nexFetch = async (url, timeout = 25000) => {
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
        const fixed = raw
            .replace(/\bverdadero\b/g, 'true')
            .replace(/\bfalso\b/g,     'false')
            .replace(/\bnulo\b/g,      'null')
        return JSON.parse(fixed)
    } finally {
        clearTimeout(timer)
    }
}

// ─── BÚSQUEDA YOUTUBE ─────────────────────────────────────────────────────────

const searchYoutube = async (query) => {
    try {
        const r = await nexFetch(`${NEX_BASE}/search/youtube?q=${encodeURIComponent(query)}&apikey=${NEX_KEY}`)
        if (r?.status && r?.result?.length) {
            // Preferir videos de más de 1 minuto (evitar shorts)
            const filtered = r.result.filter(v => {
                const parts = (v.duration || '0:00').split(':')
                const secs  = parts.length >= 2
                    ? parseInt(parts[parts.length - 2] || 0) * 60 + parseInt(parts[parts.length - 1] || 0)
                    : 0
                return secs >= 60
            })
            const s = filtered[0] || r.result[0]
            console.log('[PLAY] OK NexEvo search:', s.title)
            return {
                title:    s.title    || query,
                url:      s.link     || '',
                author:   s.channel  || 'Desconocido',
                duration: s.duration || 'N/A',
                views:    'N/A',
                thumb:    s.imageUrl || ''
            }
        }
    } catch (e) { console.log('[PLAY] NexEvo search falló:', e.message) }
    return null
}

// ─── DESCARGA AUDIO ───────────────────────────────────────────────────────────

const getAudio = async (videoUrl) => {
    try {
        // NexEvo necesita el URL encodado correctamente
        const encoded = encodeURIComponent(videoUrl)
        const r = await nexFetch(`${NEX_BASE}/download/audio?url=${encoded}&apikey=${NEX_KEY}`)
        console.log('[PLAY] NexEvo download response status:', r?.status, '| tiene url:', !!r?.result?.url)
        // Soporta tanto inglés (status/result/url) como español (estado/resultado/url)
        const link = r?.result?.url || r?.resultado?.url || null
        if (link && link.startsWith('http')) return link
        throw new Error('NexEvo no devolvió URL de descarga')
    } catch (e) {
        throw new Error('NexEvo falló: ' + e.message)
    }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, text }) => {
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
                    `> ✰ Intenta con un nombre más específico o el link directo~\n\n` +
                    `_Ejemplo: https://youtu.be/..._ 🦋`,
                contextInfo: ctx
            }, { quoted: m })
        }

        // ── 2. Enviar info mientras descarga ──
        const caption =
            `╭━━━━━━━━━━━━━━━━╮\n` +
            `┃  🎵 *NINO MUSIC* 🎵\n` +
            `╰━━━━━━━━━━━━━━━━╯\n\n` +
            `➥ *${song.title}*\n\n` +
            `✿⃘ *Canal* › ${song.author}\n` +
            `✿⃘ *Duración* › ${song.duration}\n` +
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

        // ── 3. Descargar audio desde NexEvo ──
        const audioUrl    = await getAudio(song.url)
        const audioRes    = await fetch(audioUrl)
        if (!audioRes.ok) throw new Error('Error al descargar audio: HTTP ' + audioRes.status)
        const audioBuffer = Buffer.from(await audioRes.arrayBuffer())

        if (!audioBuffer || audioBuffer.length < 1000) {
            throw new Error('El audio descargado está vacío o corrupto')
        }

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
