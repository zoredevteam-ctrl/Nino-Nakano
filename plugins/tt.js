/**
 * TT - NINO NAKANO
 * Descarga videos de TikTok sin marca de agua
 * Comandos: #tt, #tiktok, #tiktokvid
 * APIs: Tikwm → AlyaBot → GiftedTech
 */

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const sendTt = async (conn, m, text, isError = false) => {
    const thumb = await global.getBannerThumb()
    const ctx   = global.getNewsletterCtx(
        thumb,
        (isError ? '❌ ' : '🎵 ') + global.botName,
        isError ? 'Error al descargar' : 'TikTok Downloader'
    )
    return conn.sendMessage(m.chat, { text, contextInfo: ctx }, { quoted: m })
}

const downloadTikTok = async (url) => {
    let videoUrl = null
    let autor    = 'Desconocido'
    let titulo   = ''
    let likes    = 0
    let plays    = 0

    const apis = [
        async () => {
            const r = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(url))
            const j = await r.json()
            if (j?.code !== 0) throw new Error('Tikwm error ' + j?.code)
            autor  = j.data?.author?.unique_id || 'Desconocido'
            titulo = j.data?.title  || ''
            likes  = j.data?.digg_count  || 0
            plays  = j.data?.play_count  || 0
            return j.data?.play || j.data?.wmplay || null
        },
        async () => {
            const r = await fetch('https://rest.alyabotpe.xyz/dl/tiktok?url=' + encodeURIComponent(url) + '&key=Duarte-zz12')
            const j = await r.json()
            if (!j?.status) throw new Error('AlyaBot sin status')
            autor  = j.data?.author   || j.data?.username || 'Desconocido'
            titulo = j.data?.title    || j.data?.desc     || ''
            return j.data?.download   || j.data?.dl || j.data?.url || null
        },
        async () => {
            const r = await fetch('https://api.giftedtech.co.ke/api/download/tiktok?apikey=Fedex&url=' + encodeURIComponent(url))
            const j = await r.json()
            const d = j?.result || j?.data
            if (!d) throw new Error('GiftedTech sin resultado')
            autor  = d.author || d.username || 'Desconocido'
            titulo = d.title  || d.desc     || ''
            return d.video?.noWatermark || d.video?.watermark || d.download?.url || d.url || null
        }
    ]

    for (const fn of apis) {
        try {
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                videoUrl = link
                break
            }
        } catch (e) { console.log('[TT] API falló:', e.message) }
    }

    if (!videoUrl) throw new Error('Ninguna API pudo descargar el video')
    return { videoUrl, autor, titulo, likes, plays }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, args }) => {
    const url = args[0] || (m.quoted?.text ? m.quoted.text.trim() : '')

    if (!url || !url.includes('tiktok.com')) {
        return sendTt(conn, m,
            '🎵 *TIKTOK DOWNLOADER*\n\n' +
            'Envíame un link de TikTok~\n\n' +
            '*Uso:*\n' +
            '› *' + global.prefix + 'tt <link>*\n' +
            '› O responde a un mensaje con el link\n\n' +
            '_Ejemplo: ' + global.prefix + 'tt https://vt.tiktok.com/..._'
        )
    }

    await m.react('⏳')

    try {
        const { videoUrl, autor, titulo, likes, plays } = await downloadTikTok(url)
        await m.react('⬇️')

        const caption =
            '🎵 *' + (titulo || 'TikTok Video') + '*\n\n' +
            '👤 *Creador:* @' + autor + '\n' +
            (likes ? '❤️ *Likes:* ' + Number(likes).toLocaleString() + '\n' : '') +
            (plays ? '▶️ *Reproducciones:* ' + Number(plays).toLocaleString() + '\n' : '') +
            '🔗 *Fuente:* TikTok\n\n' +
            '╭─────────────────╮\n' +
            '│  🦋 *' + global.botName + '*  │\n' +
            '╰─────────────────╯'

        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, titulo.slice(0, 60) || 'TikTok', global.botName + ' 🦋')
        ctx.externalAdReply.sourceUrl = url

        await m.react('📤')

        await conn.sendMessage(m.chat, {
            video: { url: videoUrl },
            caption,
            mimetype: 'video/mp4',
            contextInfo: ctx
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error('[TT ERROR]', e.message)
        await m.react('❌')
        return sendTt(conn, m,
            '❌ *Error al descargar el video*\n\n' +
            '⚠️ ' + e.message + '\n\n' +
            '_Intenta de nuevo en unos segundos_ 🦋',
            true
        )
    }
}

handler.command = ['tt', 'tiktok', 'tiktokvid']
export default handler
