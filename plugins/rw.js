/**
 * RANDOM WAIFU - NINO NAKANO
 * Comando: #rw
 * Reclama una waifu aleatoria con cooldown de 30 segundos
 * API: nekos.best
 */

import { database } from '../lib/database.js'

const COOLDOWN_MS = 30 * 1000 // 30 segundos
const MAX_COLECCION = 50      // máximo de waifus por usuario

// Categorías de waifus disponibles en nekos.best
const CATEGORIAS = [
    'waifu', 'neko', 'kitsune', 'shinobu',
    'megumin', 'cuddle', 'hug', 'kiss'
]

const getRandom = arr => arr[Math.floor(Math.random() * arr.length)]

const getWaifu = async () => {
    const categoria = getRandom(CATEGORIAS)
    const res = await fetch(`https://nekos.best/api/v2/${categoria}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const data = json.results?.[0]
    if (!data) throw new Error('Sin resultados')
    return {
        url:       data.url,
        nombre:    data.source_url ? data.source_url.split('/').pop()?.replace(/_/g, ' ') || 'Desconocida' : 'Desconocida',
        anime:     data.anime_name || 'Desconocido',
        artista:   data.artist_name || null,
        categoria
    }
}

let handler = async (m, { conn }) => {
    const sender = m.sender
    const user   = database.getUser(sender)
    const ahora  = Date.now()

    // ── Inicializar colección si no existe ────────────────────────────────────
    if (!user.waifus)         user.waifus = []
    if (!user.lastRW)         user.lastRW = 0

    // ── Cooldown ──────────────────────────────────────────────────────────────
    const tiempoRestante = COOLDOWN_MS - (ahora - user.lastRW)
    if (tiempoRestante > 0) {
        const seg = Math.ceil(tiempoRestante / 1000)
        return conn.sendMessage(m.chat, {
            text:
                `⏳ *COOLDOWN ACTIVO*\n\n` +
                `Espera *${seg} segundo${seg !== 1 ? 's' : ''}* antes de reclamar otra waifu.\n\n` +
                `_¿Tan ansioso estás? Paciencia~ 🦋_`,
            contextInfo: {
                externalAdReply: {
                    title: `🌸 ${global.botName || 'Nino Nakano'}`,
                    body: 'Random Waifu 💕',
                    thumbnail: await _getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }

    await m.react('🎲')

    try {
        const waifu = await getWaifu()

        // ── Descargar imagen ──────────────────────────────────────────────────
        const imgRes = await fetch(waifu.url)
        if (!imgRes.ok) throw new Error(`No se pudo descargar la imagen: HTTP ${imgRes.status}`)
        const buffer = Buffer.from(await imgRes.arrayBuffer())

        // ── Actualizar cooldown ───────────────────────────────────────────────
        user.lastRW = ahora

        // ── Guardar en colección ──────────────────────────────────────────────
        const yaEnColeccion = user.waifus.some(w => w.url === waifu.url)
        let mensajeColeccion = ''

        if (!yaEnColeccion) {
            if (user.waifus.length >= MAX_COLECCION) {
                // Si la colección está llena, reemplazar la más antigua
                user.waifus.shift()
                mensajeColeccion = `\n⚠️ _Colección llena (${MAX_COLECCION}). Se eliminó la más antigua._`
            }
            user.waifus.push({
                url:       waifu.url,
                anime:     waifu.anime,
                categoria: waifu.categoria,
                fecha:     ahora
            })
            mensajeColeccion += `\n✨ *¡Waifu añadida a tu colección!* (${user.waifus.length}/${MAX_COLECCION})`
        } else {
            mensajeColeccion = `\n💭 _Esta waifu ya estaba en tu colección~_`
        }

        // ── Armar caption ─────────────────────────────────────────────────────
        const caption =
            `🎀 *¡NUEVA WAIFU RECLAMADA!*\n\n` +
            `*╭╼ INFORMACIÓN 𐦯*\n` +
            `*│✎ Anime:* ${waifu.anime}\n` +
            `*│✎ Categoría:* ${waifu.categoria}\n` +
            (waifu.artista ? `*│✎ Artista:* ${waifu.artista}\n` : '') +
            `*│✎ Colección:* ${user.waifus.length}/${MAX_COLECCION}\n` +
            `*╰────────────────╯*` +
            mensajeColeccion + `\n\n` +
            `> _Usa *#miswaifu* para ver tu colección_ 🦋`

        // ── Enviar imagen ─────────────────────────────────────────────────────
        await conn.sendMessage(m.chat, {
            image: buffer,
            caption,
            contextInfo: {
                externalAdReply: {
                    title: `🎀 ${global.botName || 'Nino Nakano'}`,
                    body: 'Random Waifu 💕',
                    thumbnail: await _getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })

        await m.react('💕')

    } catch (e) {
        console.error('[RW ERROR]', e)
        await m.react('❌')
        return conn.sendMessage(m.chat, {
            text:
                `❌ No pude obtener una waifu ahora mismo.\n\n` +
                `Error: ${e.message}\n\n` +
                `_Intenta de nuevo en unos segundos_ 🦋`,
            contextInfo: {
                externalAdReply: {
                    title: `🌸 ${global.botName || 'Nino Nakano'}`,
                    body: 'Random Waifu 💕',
                    thumbnail: await _getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }
}

// ── #miswaifu — ver colección ─────────────────────────────────────────────────
let handlerColeccion = async (m, { conn }) => {
    const user = database.getUser(m.sender)

    if (!user.waifus?.length) {
        return conn.sendMessage(m.chat, {
            text:
                `💔 *SIN COLECCIÓN*\n\n` +
                `Aún no has reclamado ninguna waifu.\n\n` +
                `Usa *#rw* para reclamar tu primera waifu~ 🎲`,
            contextInfo: {
                externalAdReply: {
                    title: `🌸 ${global.botName || 'Nino Nakano'}`,
                    body: 'Mi Colección 💕',
                    thumbnail: await _getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }

    const lista = user.waifus
        .slice(-20) // últimas 20
        .reverse()
        .map((w, i) => `*${i + 1}.* ${w.anime} _(${w.categoria})_`)
        .join('\n')

    return conn.sendMessage(m.chat, {
        text:
            `💕 *MI COLECCIÓN DE WAIFUS*\n\n` +
            `*Total:* ${user.waifus.length}/${MAX_COLECCION}\n\n` +
            `${lista}\n\n` +
            `> _Usa *#rw* para seguir reclamando waifus~ 🎲_`,
        contextInfo: {
            externalAdReply: {
                title: `💕 ${global.botName || 'Nino Nakano'}`,
                body: `Colección de ${m.pushName || 'Usuario'}`,
                thumbnail: await _getBannerBuffer(),
                sourceUrl: global.rcanal || '',
                mediaType: 1,
                renderLargerThumbnail: false
            }
        }
    }, { quoted: m })
}

handlerColeccion.command = ['miswaifu', 'coleccion', 'waifus']

// ── Helper banner ─────────────────────────────────────────────────────────────
const _getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

handler.command = ['rw', 'randomwaifu', 'waifu']
export default handler