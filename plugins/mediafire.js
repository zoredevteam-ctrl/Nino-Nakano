/**
 * MEDIAFIRE - NINO NAKANO
 * Obtiene el link directo de descarga de MediaFire
 * Comandos: #mediafire, #mf
 * APIs: GiftedTech → AlyaBot → Causas
 */

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const sendMf = async (conn, m, text, isError = false) => {
    const thumb = await global.getBannerThumb()
    const ctx   = global.getNewsletterCtx(
        thumb,
        (isError ? '❌ ' : '☁️ ') + global.botName,
        isError ? 'Error al obtener link' : 'MediaFire Downloader'
    )
    return conn.sendMessage(m.chat, { text, contextInfo: ctx }, { quoted: m })
}

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

const formatSize = (bytes) => {
    if (!bytes) return 'N/A'
    const b = parseInt(bytes)
    if (b >= 1_073_741_824) return (b / 1_073_741_824).toFixed(2) + ' GB'
    if (b >= 1_048_576)     return (b / 1_048_576).toFixed(1) + ' MB'
    if (b >= 1_024)         return (b / 1_024).toFixed(1) + ' KB'
    return b + ' B'
}

// ─── OBTENER LINK MEDIAFIRE ───────────────────────────────────────────────────

const getMediaFire = async (url) => {
    // ── 1. GiftedTech MediaFire ──
    try {
        const r = await apiGet('https://api.giftedtech.co.ke/api/download/mediafire?apikey=Fedex&url=' + encodeURIComponent(url))
        const d = r?.result || r?.data
        if (d?.downloadUrl || d?.download || d?.url || d?.direct) {
            console.log('[MF] OK GiftedTech mediafire')
            return {
                nombre:   d.filename || d.name || d.title || 'archivo',
                size:     formatSize(d.size || d.filesize),
                download: d.downloadUrl || d.download || d.direct || d.url
            }
        }
    } catch (e) { console.log('[MF] GiftedTech falló:', e.message) }

    // ── 2. AlyaBot MediaFire ──
    try {
        const r = await apiGet('https://rest.alyabotpe.xyz/dl/mediafire?url=' + encodeURIComponent(url) + '&key=Duarte-zz12')
        const d = r?.data || r?.result
        if (r?.status && (d?.download || d?.dl || d?.url || d?.direct)) {
            console.log('[MF] OK AlyaBot mediafire')
            return {
                nombre:   d.filename || d.name || 'archivo',
                size:     formatSize(d.size || d.filesize),
                download: d.download || d.dl || d.direct || d.url
            }
        }
    } catch (e) { console.log('[MF] AlyaBot falló:', e.message) }

    // ── 3. API Causas MediaFire ──
    try {
        const r = await apiGet('https://api-causas.duckdns.org/api/v1/descargas/mediafire?url=' + encodeURIComponent(url) + '&apikey=causa-adc2c572476abdd8')
        const d = r?.data || r?.result
        if (r?.status && (d?.download || d?.url)) {
            console.log('[MF] OK Causas mediafire')
            return {
                nombre:   d.filename || d.name || 'archivo',
                size:     formatSize(d.size),
                download: d.download || d.url
            }
        }
    } catch (e) { console.log('[MF] Causas falló:', e.message) }

    return null
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, args, text }) => {
    const url = (args[0] || text || '').trim()

    if (!url || !url.includes('mediafire.com')) {
        return sendMf(conn, m,
            '☁️ *MEDIAFIRE DOWNLOADER*\n\n' +
            'Envíame un link de MediaFire~\n\n' +
            '*Uso:*\n' +
            '› *' + global.prefix + 'mediafire <link>*\n' +
            '› *' + global.prefix + 'mf <link>*\n\n' +
            '_Ejemplo:_\n' +
            '_• ' + global.prefix + 'mf https://www.mediafire.com/file/..._'
        )
    }

    await m.react('⏳')

    try {
        const result = await getMediaFire(url)

        if (!result?.download) {
            await m.react('❌')
            return sendMf(conn, m,
                '❌ No pude obtener el link directo\n\n' +
                '_Verifica que el link sea válido y el archivo esté disponible_ ☁️',
                true
            )
        }

        await m.react('☁️')

        const caption =
            '☁️ *MEDIAFIRE*\n\n' +
            '📄 *Archivo:* ' + result.nombre + '\n' +
            '💾 *Tamaño:* ' + result.size + '\n\n' +
            '🔗 *Link directo:*\n' + result.download + '\n\n' +
            '╭─────────────────╮\n' +
            '│  🦋 *' + global.botName + '*  │\n' +
            '╰─────────────────╯'

        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, result.nombre.slice(0, 60), 'MediaFire ☁️')
        ctx.externalAdReply.sourceUrl = url

        await conn.sendMessage(m.chat, {
            text: caption,
            contextInfo: ctx
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error('[MEDIAFIRE ERROR]', e.message)
        await m.react('❌')
        return sendMf(conn, m,
            '❌ *Error al procesar el link*\n\n' +
            '⚠️ ' + e.message + '\n\n' +
            '_Intenta de nuevo en unos segundos_ ☁️',
            true
        )
    }
}

handler.command = ['mediafire', 'mf']
export default handler
