/**
 * NSFW - NINO NAKANO
 * #nsfw on/off — activar/desactivar contenido adulto por grupo (solo admin)
 * #neko #waifu18 etc — contenido adulto si está activado
 * API: nekos.moe / waifu.pics
 */

import { database } from '../lib/database.js'

const CATEGORIAS_NSFW = ['neko', 'waifu', 'blowjob', 'anal', 'pussy', 'hentai', 'lewdkitsune', 'futa', 'oral', 'paizuri']
const CATEGORIAS_SFW  = ['neko', 'waifu', 'shinobu', 'megumin', 'cuddle', 'hug', 'pat', 'kiss', 'feed', 'wave']

const getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const sendNino = async (conn, m, text) => conn.sendMessage(m.chat, {
    text,
    contextInfo: {
        externalAdReply: {
            title: `🔞 ${global.botName || 'Nino Nakano'}`,
            body: 'Contenido Adulto',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, { quoted: m })

const getWaifuPics = async (categoria, nsfw = false) => {
    const tipo = nsfw ? 'nsfw' : 'sfw'
    const res  = await fetch(`https://api.waifu.pics/${tipo}/${categoria}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json?.url || null
}

let handler = async (m, { conn, command, text, isAdmin, isOwner, isGroup, db }) => {
    const cmd = command.toLowerCase()

    if (!isGroup) return sendNino(conn, m, `🏢 Este comando solo funciona en grupos. 🙄`)

    if (!db.groups) db.groups = {}
    if (!db.groups[m.chat]) db.groups[m.chat] = {}
    const grupo = db.groups[m.chat]

    // ── #nsfw on/off — toggle ─────────────────────────────────────────────────
    if (cmd === 'nsfw') {
        if (!isAdmin && !isOwner) return sendNino(conn, m, `👮 Solo los admins pueden configurar esto. 💅`)

        const accion = (text || '').toLowerCase().trim()
        if (accion !== 'on' && accion !== 'off') {
            return sendNino(conn, m,
                `🔞 *CONTENIDO ADULTO*\n\n` +
                `Estado actual: *${grupo.nsfw ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}*\n\n` +
                `Usa:\n` +
                `▸ *#nsfw on* — activar\n` +
                `▸ *#nsfw off* — desactivar\n\n` +
                `⚠️ _Solo para grupos de mayores de edad_ 🔞`
            )
        }

        grupo.nsfw = accion === 'on'
        return sendNino(conn, m,
            `🔞 *NSFW ${grupo.nsfw ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}*\n\n` +
            `${grupo.nsfw
                ? `El contenido adulto está habilitado en este grupo.\n\n⚠️ _Solo para mayores de 18 años_ 🔞`
                : `El contenido adulto ha sido desactivado. 🌸`}`
        )
    }

    // ── Comandos de imágenes ──────────────────────────────────────────────────
    const esNsfw = ['hentai', 'lewdkitsune', 'futa', 'oral', 'paizuri', 'blowjob', 'anal', 'pussy', 'waifu18', 'nsfwneko'].includes(cmd)

    if (esNsfw && !grupo.nsfw) {
        return sendNino(conn, m,
            `🔞 *CONTENIDO ADULTO DESACTIVADO*\n\n` +
            `El contenido adulto no está habilitado en este grupo.\n\n` +
            `Un admin debe usar *#nsfw on* para activarlo. 🦋`
        )
    }

    await m.react('🖼️')

    try {
        let imgUrl = null

        if (esNsfw) {
            // Mapear comandos a categorías de waifu.pics
            const catMap = {
                'hentai': 'hentai', 'waifu18': 'waifu', 'nsfwneko': 'neko',
                'blowjob': 'blowjob', 'oral': 'oral', 'paizuri': 'paizuri',
                'futa': 'futa', 'lewdkitsune': 'lewdkitsune',
                'anal': 'anal', 'pussy': 'pussy'
            }
            const cat = catMap[cmd] || 'waifu'
            imgUrl = await getWaifuPics(cat, true)
        } else {
            // SFW
            const catMap = {
                'neko': 'neko', 'nekosfw': 'neko', 'waifu': 'waifu',
                'pat': 'pat', 'feed': 'feed', 'wave': 'wave'
            }
            const cat = catMap[cmd] || 'neko'
            imgUrl = await getWaifuPics(cat, false)
        }

        if (!imgUrl) throw new Error('Sin URL de imagen')

        const imgRes = await fetch(imgUrl)
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
        const buffer = Buffer.from(await imgRes.arrayBuffer())

        await m.react('✅')
        await conn.sendMessage(m.chat, {
            image: buffer,
            caption: esNsfw
                ? `🔞 *${cmd.toUpperCase()}*\n> _${global.botName || 'Nino Nakano'}_ 🦋`
                : `🌸 *${cmd.toUpperCase()}*\n> _${global.botName || 'Nino Nakano'}_ 🦋`
        }, { quoted: m })

    } catch (e) {
        console.error('[NSFW ERROR]', e)
        await m.react('❌')
        return m.reply(`❌ No pude obtener la imagen. Intenta de nuevo 🦋`)
    }
}

handler.command = [
    'nsfw',
    // SFW
    'neko', 'nekosfw', 'pat', 'feed', 'wave',
    // NSFW
    'hentai', 'waifu18', 'nsfwneko', 'blowjob', 'oral', 'paizuri', 'futa', 'lewdkitsune', 'anal', 'pussy'
]
handler.group = true
export default handler