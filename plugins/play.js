/**
 * PLAY - NINO NAKANO
 * Comandos: #play (audio), #playvid (video)
 * APIs: api.giftedtech.co.ke (primaria) + rest.alyabotpe.xyz (fallback)
 */

import yts from 'yt-search'

const GIFTED_API = 'https://api.giftedtech.co.ke/api'
const GIFTED_KEY = 'gifted'
const ALYA_KEY   = 'Duarte-zz12'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const apiGet = async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

const sendNino = async (conn, m, text) => conn.sendMessage(m.chat, {
    text,
    contextInfo: {
        externalAdReply: {
            title: `🎵 ${global.botName || 'Nino Nakano'}`,
            body: 'Music Player 🎶',
            thumbnailUrl: global.banner || '',
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false,
            showAdAttribution: false
        }
    }
}, { quoted: m })

const formatViews = (views) => {
    try {
        const n = parseInt(views) || 0
        if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
        if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`
        if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}k`
        return n.toLocaleString()
    } catch { return String(views) }
}

// ─── DESCARGA AUDIO ───────────────────────────────────────────────────────────
// Orden: GiftedTech ytmp3 → AlyaBot Play → AlyaBot ytmp3

const getAudio = async (url) => {
    const fuentes = [
        {
            nombre: 'GiftedTech ytmp3',
            fn: async () => {
                const r = await apiGet(`${GIFTED_API}/download/ytmp3?apikey=${GIFTED_KEY}&url=${encodeURIComponent(url)}`)
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.audio || r?.url || null
            }
        },
        {
            nombre: 'AlyaBot Play',
            fn: async () => {
                const r = await apiGet(`https://rest.alyabotpe.xyz/dl/youtubeplay?query=${encodeURIComponent(url)}&key=${ALYA_KEY}`)
                return r?.status ? (r.data?.download || r.data?.dl || r.data?.url) : null
            }
        },
        {
            nombre: 'AlyaBot ytmp3',
            fn: async () => {
                const r = await apiGet(`https://rest.alyabotpe.xyz/dl/ytmp3?url=${encodeURIComponent(url)}&key=${ALYA_KEY}`)
                return r?.status ? (r.data?.dl || r.data?.url || r.data?.download) : null
            }
        }
    ]

    for (const { nombre, fn } of fuentes) {
        try {
            console.log(`[PLAY] 🔄 ${nombre}`)
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                console.log(`[PLAY] ✅ ${nombre}`)
                return link
            }
            console.log(`[PLAY] ❌ ${nombre} sin URL`)
        } catch (e) {
            console.log(`[PLAY] ❌ ${nombre}: ${e.message}`)
        }
    }
    throw new Error('Ninguna API pudo obtener el audio')
}

// ─── DESCARGA VIDEO ───────────────────────────────────────────────────────────
// Orden: GiftedTech ytmp4 → AlyaBot ytmp4 → API Causas

const getVideo = async (url) => {
    const fuentes = [
        {
            nombre: 'GiftedTech ytmp4',
            fn: async () => {
                const r = await apiGet(`${GIFTED_API}/download/ytmp4?apikey=${GIFTED_KEY}&url=${encodeURIComponent(url)}`)
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.video || r?.url || null
            }
        },
        {
            nombre: 'AlyaBot ytmp4',
            fn: async () => {
                const r = await apiGet(`https://rest.alyabotpe.xyz/dl/ytmp4?url=${encodeURIComponent(url)}&key=${ALYA_KEY}`)
                return r?.status ? (r.data?.dl || r.data?.url || r.data?.download) : null
            }
        },
        {
            nombre: 'API Causas',
            fn: async () => {
                const r = await apiGet(`https://api-causas.duckdns.org/api/v1/descargas/youtube?url=${encodeURIComponent(url)}&type=video&apikey=causa-adc2c572476abdd8`)
                return r?.status ? (r.data?.download?.url || r.data?.download) : null
            }
        }
    ]

    for (const { nombre, fn } of fuentes) {
        try {
            console.log(`[PLAYVID] 🔄 ${nombre}`)
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                console.log(`[PLAYVID] ✅ ${nombre}`)
                return link
            }
            console.log(`[PLAYVID] ❌ ${nombre} sin URL`)
        } catch (e) {
            console.log(`[PLAYVID] ❌ ${nombre}: ${e.message}`)
        }
    }
    throw new Error('Ninguna API pudo obtener el video')
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────

let handler = async (m, { conn, command, text }) => {
    const cmd     = command.toLowerCase()
    const isVideo = cmd === 'playvid' || cmd === 'playv'
    const query   = (text || '').trim()

    if (!query) {
        return sendNino(conn, m,
            `🎵 *${isVideo ? 'PLAY VIDEO' : 'PLAY MÚSICA'}*\n\n` +
            `Uso: *#${cmd} <nombre o link de YouTube>*\n` +
            `Ejemplo: *#${cmd} bad bunny un verano sin ti*`
        )
    }

    await m.react('🔍')

    try {
        // 1. Buscar con yts
        const search = await yts(query)
        const song   = search?.videos?.[0] || search?.all?.[0]

        if (!song) {
            await m.react('❌')
            return sendNino(conn, m, `❌ No encontré resultados para *${query}*\n\nIntenta con otro nombre 🦋`)
        }

        const title    = song.title                                    || 'Sin título'
        const duration = song.timestamp || song.duration               || 'N/A'
        const views    = formatViews(song.views ?? song.viewCount ?? 0)
        const channel  = song.author?.name || song.author             || 'N/A'
        const thumb    = song.thumbnail || song.image                  || ''
        const videoUrl = song.url                                      || ''

        if (!videoUrl) {
            await m.react('❌')
            return sendNino(conn, m, `❌ No pude obtener el link del video.`)
        }

        await m.react('⬇️')

        // 2. Descargar con fallback automático
        const finalUrl = isVideo
            ? await getVideo(videoUrl)
            : await getAudio(videoUrl)

        // 3. Descargar buffer
        const mediaRes = await fetch(finalUrl)
        if (!mediaRes.ok) throw new Error(`Error al descargar el archivo: HTTP ${mediaRes.status}`)
        const buffer = Buffer.from(await mediaRes.arrayBuffer())

        // 4. Armar info
        const infoTxt =
            `🎵 *${title}*\n` +
            `👤 *Canal:* ${channel}\n` +
            `⏱️ *Duración:* ${duration}\n` +
            `👁️ *Vistas:* ${views}\n` +
            `🔗 *Link:* ${videoUrl}`

        const contextInfo = {
            externalAdReply: {
                title,
                body: `${global.botName || 'Nino Nakano'} Music 🎵`,
                thumbnailUrl: thumb || global.banner || '',
                sourceUrl: videoUrl,
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false
            }
        }

        // 5. Enviar
        await m.react('📤')

        if (isVideo) {
            await conn.sendMessage(m.chat, {
                video: buffer,
                caption: infoTxt,
                mimetype: 'video/mp4',
                contextInfo
            }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo
            }, { quoted: m })

            await conn.sendMessage(m.chat, {
                text: infoTxt,
                contextInfo
            }, { quoted: m })
        }

        await m.react('✅')

    } catch (e) {
        console.error('[PLAY ERROR]', e)
        await m.react('❌')
        return sendNino(conn, m,
            `❌ Ocurrió un error al procesar *${query}*\n\n` +
            `Error: ${e.message}\n\n` +
            `_Intenta de nuevo en unos segundos_ 🦋`
        )
    }
}

handler.command = ['play', 'playvid', 'playv', 'música', 'musica']
export default handler