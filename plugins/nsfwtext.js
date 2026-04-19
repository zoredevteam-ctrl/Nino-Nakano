/**
 * NSFW COMPLETO - NINO NAKANO (TODO EN UN SOLO ARCHIVO)
 * #nsfw on/off — activar/desactivar
 * #tetas #pussy #caliente y todos los demás
 * ¡Ahora #tetas y #pussy usan la misma API estable de nekobot! 🔥
 */

import { database } from '../lib/database.js'
import fetch from 'node-fetch'

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
            title: `🔥 NSFW ${global.botName || 'Nino Nakano'}`,
            body: 'Contenido Adulto +18',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, { quoted: m })

const getWaifuPics = async (categoria, nsfw = false) => {
    const tipo = nsfw ? 'nsfw' : 'sfw'
    const res  = await fetch(`https://api.waifu.pics/\( {tipo}/ \){categoria}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json?.url || null
}

// Textos eróticos para #caliente
const textosEroticos = [
    "Te tengo contra la pared, mi mano bajando despacio por tu cuerpo mientras te muerdo el cuello… siento cómo tiemblas cuando mis dedos llegan a tu cintura y te aprieto contra mí. ¿Quieres que siga más abajo, papi?",
    "Estoy de rodillas frente a ti, mirándote a los ojos mientras te la chupo lento y profundo… mi lengua jugando con la punta, tragándomela toda mientras gimes mi nombre. ¿Más rápido o quieres que te haga sufrir un rato?",
    "Te acabo de sentar en mi cara y no pienso levantarme hasta que me mojes toda la boca… muevo la lengua rápido y fuerte mientras te agarras de mi pelo y te corres en mi cara.",
    "Te estoy follando por detrás, jalándote el pelo fuerte mientras te susurro al oído lo puta que eres para mí… cada embestida más dura, sintiendo cómo aprietas alrededor de mí.",
    "Estoy encima de ti, moviéndome lento y profundo, mirándote a los ojos mientras te digo lo rica que te sientes… quiero que te corras gritando mi nombre.",
    "Te tengo atada a la cama, con las piernas abiertas… te como entera mientras te retuerces y me suplicas que te folle ya.",
    "Mi mano en tu garganta mientras te follo fuerte… siento cómo palpitas alrededor de mí, a punto de explotar.",
    "Te acabo de poner en cuatro y te estoy dando duro… cada nalgada resuena mientras te corres sin control."
]

let handler = async (m, { conn, command, text, isAdmin, isOwner, isGroup, db }) => {
    const cmd = command.toLowerCase()

    if (!isGroup) return sendNino(conn, m, `❌ Este comando solo funciona en grupos.`)

    if (!db.groups) db.groups = {}
    if (!db.groups[m.chat]) db.groups[m.chat] = {}
    const grupo = db.groups[m.chat]

    // ── #nsfw on/off ─────────────────────────────────────────────────
    if (cmd === 'nsfw') {
        if (!isAdmin && !isOwner) return sendNino(conn, m, `❌ Solo los admins pueden configurar esto.`)

        const accion = (text || '').toLowerCase().trim()
        if (accion !== 'on' && accion !== 'off') {
            return sendNino(conn, m,
                `*CONTENIDO ADULTO*\n\n` +
                `Estado actual: *${grupo.nsfw ? '✅ ACTIVADO' : '❌ DESACTIVADO'}*\n\n` +
                `Usa:\n` +
                `▸ *#nsfw on* — activar\n` +
                `▸ *#nsfw off* — desactivar`
            )
        }

        grupo.nsfw = accion === 'on'
        return sendNino(conn, m,
            `*NSFW ${grupo.nsfw ? '✅ ACTIVADO' : '❌ DESACTIVADO'}*\n\n` +
            `${grupo.nsfw ? `✅ Contenido adulto habilitado.\n_Solo +18_` : `❌ Contenido adulto desactivado.`}`
        )
    }

    // ── Chequeo NSFW ─────────────────────────────────────────────────
    const comandosNSFW = ['hentai', 'lewdkitsune', 'futa', 'oral', 'paizuri', 'blowjob', 'anal', 'pussy', 'waifu18', 'nsfwneko', 'tetas', 'caliente']
    const esNsfw = comandosNSFW.includes(cmd)

    if (esNsfw && !grupo.nsfw) {
        return sendNino(conn, m,
            `*CONTENIDO ADULTO DESACTIVADO*\n\n` +
            `El modo NSFW no está activado en este grupo.\n` +
            `Un admin debe usar *#nsfw on* para poder usar este comando.`
        )
    }

    await m.react('🔥')

    try {
        let imgUrl = null
        let caption = `*\( {cmd.toUpperCase()}* 🔥\n> _ \){global.botName || 'Nino Nakano'}_`

        // TUS COMANDOS CON API ESTABLE (nekobot)
        if (cmd === 'tetas') {
            const res = await fetch('https://nekobot.xyz/api/image?type=boobs')
            const json = await res.json()
            if (!json.success) throw new Error('Error nekobot tetas')
            imgUrl = json.message
        } 
        else if (cmd === 'pussy') {
            const res = await fetch('https://nekobot.xyz/api/image?type=pussy')
            const json = await res.json()
            if (!json.success) throw new Error('Error nekobot pussy')
            imgUrl = json.message
        } 
        else if (cmd === 'caliente') {
            const categorias = ['waifu', 'neko', 'blowjob', 'trap']
            const cat = categorias[Math.floor(Math.random() * categorias.length)]
            imgUrl = await getWaifuPics(cat, true)
            caption = `🔥 *CALIENTE* 🔥\n\n\( {textosEroticos[Math.floor(Math.random() * textosEroticos.length)]}\n\n> _ \){global.botName || 'Nino Nakano'}_`
        } 
        else if (esNsfw) {
            // Resto de comandos waifu.pics
            const catMap = {
                'hentai': 'hentai', 'waifu18': 'waifu', 'nsfwneko': 'neko',
                'blowjob': 'blowjob', 'oral': 'oral', 'paizuri': 'paizuri',
                'futa': 'futa', 'lewdkitsune': 'lewdkitsune',
                'anal': 'anal', 'pussy': 'pussy'
            }
            const cat = catMap[cmd] || 'waifu'
            imgUrl = await getWaifuPics(cat, true)
        }

        if (!imgUrl) throw new Error('Sin URL')

        const imgRes = await fetch(imgUrl)
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
        const buffer = Buffer.from(await imgRes.arrayBuffer())

        await m.react('✅')

        await conn.sendMessage(m.chat, {
            image: buffer,
            caption: caption
        }, { quoted: m })

    } catch (e) {
        console.error('[NSFW ERROR]', e)
        await m.react('❌')
        return m.reply(`❌ No pude cargar el contenido. Intenta de nuevo.`)
    }
}

handler.command = [
    'nsfw',
    // SFW
    'neko', 'nekosfw', 'pat', 'feed', 'wave',
    // NSFW (incluyendo los tuyos + caliente)
    'hentai', 'waifu18', 'nsfwneko', 'blowjob', 'oral', 'paizuri', 'futa', 'lewdkitsune', 'anal', 'pussy', 'tetas', 'caliente'
]
handler.group = true
export default handler