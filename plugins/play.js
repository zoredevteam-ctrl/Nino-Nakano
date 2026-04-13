import yts from 'yt-search'
import fetch from 'node-fetch'

const apiGet = async (url, timeout = 20000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
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

const handler = async (m, { conn, command, text }) => {
    const query = (text || '').trim()
    if (!query) return m.reply(`🎵 *PLAY*\n\nUso: *${global.prefix + command} <nombre o link>*`)

    await m.react('🔍')

    try {
        let song = null
        const { videos } = await yts(query)
        if (videos && videos.length > 0) {
            const s = videos[0]
            song = {
                title: s.title,
                url: s.url,
                author: s.author?.name || 'Desconocido',
                duration: s.timestamp || 'N/A',
                views: formatViews(s.views || 0),
                thumb: s.thumbnail || s.image || ''
            }
        }

        if (!song) {
            await m.react('❌')
            return m.reply('❌ No encontré resultados.')
        }

        const isVideo = command.includes('vid') || command.includes('v')
        await m.react(isVideo ? '🎬' : '🎵')

        const type = isVideo ? 'ytvideo' : 'ytaudio'
        const apiUrl = `https://api-gohan.onrender.com/download/${type}?url=${encodeURIComponent(song.url)}`
        const res = await apiGet(apiUrl)

        if (!res?.status || !res?.result?.download_url) {
            throw new Error('No se pudo obtener el enlace de descarga.')
        }

        const finalUrl = res.result.download_url
        const caption = `🎵 *${song.title}*\n👤 *Canal:* ${song.author}\n⏱️ *Duración:* ${song.duration}\n👁️ *Vistas:* ${song.views}\n🔗 ${song.url}`

        if (isVideo) {
            await conn.sendMessage(m.chat, {
                video: { url: finalUrl },
                caption: caption,
                mimetype: 'video/mp4'
            }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, {
                audio: { url: finalUrl },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: m })
            
            if (song.thumb) {
                await conn.sendMessage(m.chat, { image: { url: song.thumb }, caption: caption }, { quoted: m })
            }
        }

        await m.react('✅')

    } catch (e) {
        console.error(e)
        await m.react('❌')
        m.reply('❌ Error: ' + e.message)
    }
}

handler.help = ['play', 'playvid']
handler.tags = ['descargas']
handler.command = ['play', 'playvid', 'playv', 'musica']

export default handler