/**
 * APK - NINO NAKANO
 * Busca y descarga APKs desde APKPure / APKCombo
 * Comandos: #apk, #descargarapk
 * APIs: GiftedTech → AlyaBot → Causas
 */

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const sendApk = async (conn, m, text, isError = false) => {
    const thumb = await global.getBannerThumb()
    const ctx   = global.getNewsletterCtx(
        thumb,
        (isError ? '❌ ' : '📦 ') + global.botName,
        isError ? 'Error al buscar APK' : 'APK Downloader'
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
    if (b >= 1_000_000) return (b / 1_000_000).toFixed(1) + ' MB'
    if (b >= 1_000)     return (b / 1_000).toFixed(1) + ' KB'
    return b + ' B'
}

// ─── BÚSQUEDA / DESCARGA APK ─────────────────────────────────────────────────

const getApk = async (query) => {
    // ── 1. GiftedTech APK ──
    try {
        const r = await apiGet('https://api.giftedtech.co.ke/api/download/apkdl?apikey=Fedex&q=' + encodeURIComponent(query))
        const d = r?.result || r?.data
        if (d?.downloadUrl || d?.download || d?.url) {
            console.log('[APK] OK GiftedTech apkdl')
            return {
                nombre:   d.name    || d.title || query,
                version:  d.version || 'N/A',
                size:     formatSize(d.size),
                rating:   d.rating  || 'N/A',
                devName:  d.developer || d.dev || 'N/A',
                icon:     d.icon    || d.thumbnail || d.image || '',
                download: d.downloadUrl || d.download || d.url
            }
        }
    } catch (e) { console.log('[APK] GiftedTech apkdl falló:', e.message) }

    // ── 2. AlyaBot APK ──
    try {
        const r = await apiGet('https://rest.alyabotpe.xyz/dl/apk?q=' + encodeURIComponent(query) + '&key=Duarte-zz12')
        const d = r?.data || r?.result
        if (r?.status && (d?.download || d?.dl || d?.url)) {
            console.log('[APK] OK AlyaBot apk')
            return {
                nombre:   d.name    || d.title || query,
                version:  d.version || 'N/A',
                size:     formatSize(d.size),
                rating:   d.rating  || 'N/A',
                devName:  d.developer || 'N/A',
                icon:     d.icon    || d.thumbnail || '',
                download: d.download || d.dl || d.url
            }
        }
    } catch (e) { console.log('[APK] AlyaBot falló:', e.message) }

    // ── 3. API Causas APK ──
    try {
        const r = await apiGet('https://api-causas.duckdns.org/api/v1/descargas/apk?q=' + encodeURIComponent(query) + '&apikey=causa-adc2c572476abdd8')
        const d = r?.data || r?.result
        if (r?.status && (d?.download || d?.url)) {
            console.log('[APK] OK Causas apk')
            return {
                nombre:   d.name    || d.title || query,
                version:  d.version || 'N/A',
                size:     formatSize(d.size),
                rating:   d.rating  || 'N/A',
                devName:  d.developer || 'N/A',
                icon:     d.icon    || d.thumbnail || '',
                download: d.download || d.url
            }
        }
    } catch (e) { console.log('[APK] Causas falló:', e.message) }

    return null
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, text }) => {
    const query = (text || '').trim()

    if (!query) {
        return sendApk(conn, m,
            '📦 *APK DOWNLOADER*\n\n' +
            'Envíame el nombre de la app que quieres~\n\n' +
            '*Uso:*\n' +
            '› *' + global.prefix + 'apk <nombre>*\n\n' +
            '_Ejemplos:_\n' +
            '_• ' + global.prefix + 'apk WhatsApp_\n' +
            '_• ' + global.prefix + 'apk Spotify_\n' +
            '_• ' + global.prefix + 'apk Minecraft_'
        )
    }

    await m.react('🔍')

    try {
        const apk = await getApk(query)

        if (!apk?.download) {
            await m.react('❌')
            return sendApk(conn, m,
                '❌ No encontré el APK de *' + query + '*\n\n' +
                '_Intenta con el nombre exacto de la app_ 📦',
                true
            )
        }

        await m.react('📦')

        const caption =
            '📦 *' + apk.nombre + '*\n\n' +
            '🏷️ *Versión:* ' + apk.version + '\n' +
            '💾 *Tamaño:* ' + apk.size + '\n' +
            '⭐ *Rating:* ' + apk.rating + '\n' +
            '👨‍💻 *Developer:* ' + apk.devName + '\n\n' +
            '🔗 *Descarga:*\n' + apk.download + '\n\n' +
            '╭─────────────────╮\n' +
            '│  🦋 *' + global.botName + '*  │\n' +
            '╰─────────────────╯'

        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, apk.nombre, 'APK Downloader 📦')
        ctx.externalAdReply.thumbnailUrl = apk.icon || global.banner

        // Si hay ícono de la app, enviar con imagen; si no, solo texto
        if (apk.icon) {
            await conn.sendMessage(m.chat, {
                image: { url: apk.icon },
                caption,
                contextInfo: ctx
            }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, {
                text: caption,
                contextInfo: ctx
            }, { quoted: m })
        }

        await m.react('✅')

    } catch (e) {
        console.error('[APK ERROR]', e.message)
        await m.react('❌')
        return sendApk(conn, m,
            '❌ *Error al buscar el APK*\n\n' +
            '⚠️ ' + e.message + '\n\n' +
            '_Intenta de nuevo en unos segundos_ 📦',
            true
        )
    }
}

handler.command = ['apk', 'descargarapk']
export default handler
