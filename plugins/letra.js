/**
 * LETRA DE CANCIONES - NINO NAKANO
 * Comando: #letra <canción - artista>
 * API: api.giftedtech.co.ke + lyrics.ovh (gratuita)
 */

const GIFTED_API = 'https://api.giftedtech.co.ke/api'
const GIFTED_KEY = 'gifted'

const getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const getLyrics = async (query) => {
    // Intentar separar artista y canción
    const partes  = query.split('-').map(p => p.trim())
    const artista = partes.length > 1 ? partes[0] : ''
    const cancion = partes.length > 1 ? partes.slice(1).join('-').trim() : query

    const fuentes = [
        {
            nombre: 'GiftedTech Lyrics',
            fn: async () => {
                const r = await fetch(`${GIFTED_API}/search/lyrics?apikey=${GIFTED_KEY}&query=${encodeURIComponent(query)}`)
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                const j = await r.json()
                const data = j?.result || j?.results?.[0] || j
                return {
                    titulo:  data?.title || data?.song || cancion,
                    artista: data?.artist || artista || 'Desconocido',
                    letra:   data?.lyrics || data?.result || null
                }
            }
        },
        {
            nombre: 'Lyrics.ovh',
            fn: async () => {
                if (!artista || !cancion) throw new Error('Necesita formato: artista - canción')
                const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artista)}/${encodeURIComponent(cancion)}`)
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                const j = await r.json()
                if (!j?.lyrics) throw new Error('Sin letra')
                return {
                    titulo:  cancion,
                    artista: artista,
                    letra:   j.lyrics
                }
            }
        }
    ]

    for (const { nombre, fn } of fuentes) {
        try {
            console.log(`[LETRA] 🔄 ${nombre}`)
            const result = await fn()
            if (result?.letra) {
                console.log(`[LETRA] ✅ ${nombre}`)
                return result
            }
        } catch (e) {
            console.log(`[LETRA] ❌ ${nombre}: ${e.message}`)
        }
    }
    return null
}

let handler = async (m, { conn, text }) => {
    const query = (text || '').trim()

    if (!query) {
        return conn.sendMessage(m.chat, {
            text:
                `🎵 *LETRA DE CANCIONES*\n\n` +
                `Busca la letra de cualquier canción~\n\n` +
                `*Uso:* *#letra <canción>*\n\n` +
                `*Ejemplos:*\n` +
                `▸ #letra Despacito\n` +
                `▸ #letra Luis Fonsi - Despacito\n` +
                `▸ #letra Bad Bunny - Tití Me Preguntó\n\n` +
                `_Para mejores resultados usa: artista - canción_ 🦋`,
            contextInfo: {
                externalAdReply: {
                    title: `🎵 ${global.botName || 'Nino Nakano'}`,
                    body: 'Letras de Canciones 🎶',
                    thumbnail: await getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }

    await m.react('🔍')

    const result = await getLyrics(query)

    if (!result?.letra) {
        await m.react('❌')
        return m.reply(
            `❌ No encontré la letra de *${query}*\n\n` +
            `Intenta con el formato: *artista - canción*\n` +
            `Ejemplo: *#letra Bad Bunny - Tití Me Preguntó* 🦋`
        )
    }

    await m.react('🎵')

    // Dividir letra si es muy larga (WhatsApp tiene límite de ~65k chars)
    const letra    = result.letra.trim()
    const MAX_LEN  = 3500
    const cabecera =
        `🎵 *${result.titulo}*\n` +
        `👤 *Artista:* ${result.artista}\n\n` +
        `━━━━━━━━━━━━━━━━━\n\n`

    if (letra.length <= MAX_LEN) {
        await conn.sendMessage(m.chat, {
            text: cabecera + letra + `\n\n> _${global.botName || 'Nino Nakano'} 🎵_`,
            contextInfo: {
                externalAdReply: {
                    title: `🎵 ${result.titulo}`,
                    body: result.artista,
                    thumbnail: await getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    } else {
        // Enviar en partes
        await conn.sendMessage(m.chat, {
            text: cabecera + letra.slice(0, MAX_LEN) + '\n\n_(continúa...)_',
            contextInfo: {
                externalAdReply: {
                    title: `🎵 ${result.titulo}`,
                    body: result.artista,
                    thumbnail: await getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })

        // Segunda parte
        await conn.sendMessage(m.chat, {
            text: letra.slice(MAX_LEN, MAX_LEN * 2) + `\n\n> _${global.botName || 'Nino Nakano'} 🎵_`
        })
    }
}

handler.command = ['letra', 'lyrics', 'cancion', 'song']
export default handler