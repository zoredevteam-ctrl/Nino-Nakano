/**
 * TIKTOKSEARCH - NINO NAKANO
 * Busca videos en TikTok y descarga el primero
 * Comandos: #tiktoksearch, #tts, #buscartt
 * APIs: Tikwm search → AlyaBot → GiftedTech
 *
 * FIX: Tikwm a veces devuelve rutas relativas (/video/media/play/ID.mp4)
 * en lugar de URLs completas. Se normalizan con fixUrl().
 */

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const sendTts = async (conn, m, text, isError = false) => {
    const thumb = await global.getBannerThumb()
    const ctx   = global.getNewsletterCtx(
        thumb,
        (isError ? '❌ ' : '🔍 ') + global.botName,
        isError ? 'Error al buscar' : 'TikTok Search'
    )
    return conn.sendMessage(m.chat, { text, contextInfo: ctx }, { quoted: m })
}

const formatNum = (n) => {
    try {
        const v = parseInt(n) || 0
        if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
        if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'k'
        return v.toLocaleString()
    } catch { return String(n || 0) }
}

// Tikwm devuelve rutas relativas (/video/media/play/ID.mp4) — las convertimos a URL completa
const fixUrl = (url) => {
    if (!url) return null
    const s = String(url)
    if (s.startsWith('http')) return s
    if (s.startsWith('/'))    return 'https://www.tikwm.com' + s
    return null
}

// ─── BÚSQUEDA ─────────────────────────────────────────────────────────────────

const searchTikTok = async (query) => {

    // ── 1. Tikwm search ──
    try {
        const r = await fetch('https://www.tikwm.com/api/feed/search?keywords=' + encodeURIComponent(query) + '&count=5&cursor=0&web=1')
        const j = await r.json()
        if (j?.code !== 0 || !j?.data?.videos?.length) throw new Error('Sin resultados')
        const v = j.data.videos[0]
        // fixUrl convierte rutas relativas a URLs absolutas
        const videoUrl = fixUrl(v.play) || fixUrl(v.wmplay) || null
        if (!videoUrl) throw new Error('URL de video inválida')
        console.log('[TTS] OK Tikwm search:', v.title)
        return {
            videoId:  v.id,
            titulo:   v.title || query,
            autor:    v.author?.unique_id || 'Desconocido',
            likes:    v.digg_count || 0,
            plays:    v.play_count || 0,
            videoUrl,
            thumb:    fixUrl(v.cover) || fixUrl(v.origin_cover) || ''
        }
    } catch (e) { console.log('[TTS] Tikwm search falló:', e.message) }

    // ── 2. AlyaBot search ──
    try {
        const r = await fetch('https://rest.alyabotpe.xyz/search/tiktok?q=' + encodeURIComponent(query) + '&key=Duarte-zz12')
        const j = await r.json()
        const list = j?.data || j?.result || j?.results || []
        const v = Array.isArray(list) ? list[0] : list
        if (!v?.title && !v?.desc) throw new Error('Sin resultado')
        console.log('[TTS] OK AlyaBot search')
        return {
            videoId:  v.id || v.videoId || '',
            titulo:   v.title || v.desc || query,
            autor:    v.author || v.username || 'Desconocido',
            likes:    v.likes  || v.digg_count || 0,
            plays:    v.plays  || v.play_count || 0,
            videoUrl: fixUrl(v.play) || fixUrl(v.download) || fixUrl(v.url) || null,
            thumb:    fixUrl(v.cover) || fixUrl(v.thumbnail) || ''
        }
    } catch (e) { console.log('[TTS] AlyaBot search falló:', e.message) }

    // ── 3. GiftedTech TikTok search ──
    try {
        const r = await fetch('https://api.giftedtech.co.ke/api/search/tiktoksearch?apikey=Fedex&q=' + encodeURIComponent(query))
        const j = await r.json()
        const list = j?.result || j?.results || j?.data || []
        const v = Array.isArray(list) ? list[0] : list
        if (!v) throw new Error('Sin resultado')
        console.log('[TTS] OK GiftedTech search')
        return {
            videoId:  v.id || '',
            titulo:   v.title || v.desc || query,
            autor:    v.author || v.username || 'Desconocido',
            likes:    v.likes  || 0,
            plays:    v.plays  || 0,
            videoUrl: fixUrl(v.play) || fixUrl(v.url) || fixUrl(v.download) || null,
            thumb:    fixUrl(v.cover) || fixUrl(v.thumbnail) || ''
        }
    } catch (e) { console.log('[TTS] GiftedTech search falló:', e.message) }

    return null
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, text }) => {
    const query = (text || '').trim()

    if (!query) {
        return sendTts(conn, m,
            '🔍 *TIKTOK SEARCH*\n\n' +
            'Dime qué quieres buscar~\n\n' +
            '*Uso:*\n' +
            '› *' + global.prefix + 'tts <búsqueda>*\n\n' +
            '_Ejemplo: ' + global.prefix + 'tts bad bunny dance_'
        )
    }

    await m.react('🔍')

    try {
        // ── 1. Buscar ──
        const result = await searchTikTok(query)

        if (!result) {
            await m.react('❌')
            return sendTts(conn, m,
                '❌ No encontré resultados para *' + query + '*\n\n' +
                '_Intenta con otro término de búsqueda_ 🦋',
                true
            )
        }

        await m.react('⬇️')

        // ── 2. Si la búsqueda ya tiene videoUrl, usarla directamente ──
        // Si no, intentar descargar por ID usando Tikwm
        let finalUrl = result.videoUrl

        if (!finalUrl && result.videoId) {
            try {
                const ttUrl = 'https://www.tiktok.com/@' + result.autor + '/video/' + result.videoId
                const r = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(ttUrl))
                const j = await r.json()
                if (j?.code === 0) {
                    finalUrl = fixUrl(j.data?.play) || fixUrl(j.data?.wmplay)
                }
            } catch (e) { console.log('[TTS] Descarga por ID falló:', e.message) }
        }

        if (!finalUrl) throw new Error('No se pudo obtener el video del resultado')

        const caption =
            '🔍 *Resultado para: ' + query + '*\n\n' +
            '🎵 *' + result.titulo + '*\n' +
            '👤 *Creador:* @' + result.autor + '\n' +
            (result.likes ? '❤️ *Likes:* ' + formatNum(result.likes) + '\n' : '') +
            (result.plays ? '▶️ *Vistas:* '  + formatNum(result.plays) + '\n' : '') +
            '\n╭─────────────────╮\n' +
            '│  🦋 *' + global.botName + '*  │\n' +
            '╰─────────────────╯'

        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, result.titulo.slice(0, 60) || 'TikTok', global.botName + ' 🦋')
        ctx.externalAdReply.thumbnailUrl = result.thumb || global.banner

        await m.react('📤')

        await conn.sendMessage(m.chat, {
            video: { url: finalUrl },
            caption,
            mimetype: 'video/mp4',
            contextInfo: ctx
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error('[TTS ERROR]', e.message)
        await m.react('❌')
        return sendTts(conn, m,
            '❌ *Error al procesar la búsqueda*\n\n' +
            '⚠️ ' + e.message + '\n\n' +
            '_Intenta de nuevo en unos segundos_ 🦋',
            true
        )
    }
}

handler.command = ['tiktoksearch', 'tts', 'buscartt']
export default handler
