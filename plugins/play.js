/**
 * PLAY - NINO NAKANO
 * #play (audio) | #playvid (video)
 * Z0RT SYSTEMS 🦋
 */

const ALYA_BASE  = 'https://rest.alyabotpe.xyz'
const ALYA_KEY   = 'Duarte-zz12'

const apiGet = async (url, timeout = 25000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

const searchYoutube = async (query) => {
    try {
        const r = await apiGet(`${ALYA_BASE}/search/youtube?q=${encodeURIComponent(query)}&key=${ALYA_KEY}`)
        const list = r?.data || r?.result || []
        const s = Array.isArray(list) ? list[0] : list
        if (s?.title) {
            return {
                title:    s.title,
                url:      s.id ? `https://youtube.com/watch?v=${s.id}` : s.url || '',
                author:   s.channel || s.author || 'Desconocido',
                duration: s.duration || s.length || 'N/A',
                views:    formatViews(s.views || 0),
                thumb:    s.thumbnail || s.image || ''
            }
        }
    } catch (e) { console.log(e.message) }
    return null
}

const handler = async (m, { conn, command, text }) => {
    const cmd     = command.toLowerCase()
    const isVideo = ["playvid", "ytmp4", "play2", "playv"].includes(cmd)
    const query   = (text || '').trim()

    if (!query) return m.reply(
        `${isVideo ? '🎬' : '🎵'} *${isVideo ? 'PLAY VIDEO' : 'PLAY MÚSICA'}*\n\n` +
        `Uso: *${global.prefix + cmd} <nombre o link>*\n` +
        `Ejemplo: *${global.prefix + cmd} bad bunny titi me pregunto*`
    )

    await m.react('🔍')

    try {
        let song = null
        const isYtLink = query.startsWith('https://')

        if (isYtLink) {
            song = { title: 'YouTube Media', url: query, author: 'N/A', duration: 'N/A', views: 'N/A', thumb: '' }
        } else {
            song = await searchYoutube(query)
        }

        if (!song?.url) {
            await m.react('❌')
            return m.reply(`❌ No encontré resultados para *${query}*`)
        }

        await m.react(isVideo ? '🎬' : '🎵')

        const apiUrl = isVideo 
            ? `https://api-gohan.onrender.com/download/ytvideo?url=${encodeURIComponent(song.url)}`
            : `https://api-gohan.onrender.com/download/ytaudio?url=${encodeURIComponent(song.url)}`

        const response = await fetch(apiUrl)
        const data = await response.json()
        const finalUrl = data?.result?.download_url

        if (!finalUrl) throw new Error('Error en la API de descarga.')

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
            await conn.sendMessage(m.chat, {
                audio: { url: finalUrl },
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
        await m.react('❌')
        m.reply(`❌ *Error*\n\n⚠️ ${e.message}`)
    }
}

handler.help    = ['play', 'playvid']
handler.tags    = ['descargas']
handler.command = ['play', 'playvid', 'playv', 'musica', 'ytmp3', 'ytmp4', 'play2']

export default handler