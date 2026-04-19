/**
 * NSFW TEXT + IMAGEN - NINO NAKANO
 * Comando: #caliente | #erotica | #nsfwtext
 * Solo funciona si el grupo tiene #nsfw on (usa exactamente el mismo sistema que nsfw.js)
 * Z0RT SYSTEMS 🔥
 */

import { database } from '../lib/database.js'

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

const getWaifuPics = async (categoria = 'waifu', nsfw = true) => {
    const tipo = nsfw ? 'nsfw' : 'sfw'
    const res = await fetch(`https://api.waifu.pics/\( {tipo}/ \){categoria}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json?.url || null
}

// Textos eróticos bien calientes (puedes agregar más)
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

let handler = async (m, { conn, command, isAdmin, isOwner, isGroup, db }) => {
    if (!isGroup) return sendNino(conn, m, `❌ Este comando solo funciona en grupos.`)

    if (!db.groups) db.groups = {}
    if (!db.groups[m.chat]) db.groups[m.chat] = {}
    const grupo = db.groups[m.chat]

    // Chequeo exacto del NSFW (igual que en nsfw.js)
    if (!grupo.nsfw) {
        return sendNino(conn, m,
            `*CONTENIDO ADULTO DESACTIVADO*\n\n` +
            `El modo NSFW no está activado en este grupo.\n` +
            `Un admin debe usar *#nsfw on* para poder usar este comando.`
        )
    }

    await m.react('🔥')

    try {
        // Imagen NSFW random (mismo estilo que nsfw.js)
        const categoriasNsfw = ['hentai', 'blowjob', 'anal', 'pussy', 'waifu', 'neko']
        const cat = categoriasNsfw[Math.floor(Math.random() * categoriasNsfw.length)]
        const imgUrl = await getWaifuPics(cat, true)

        const imgRes = await fetch(imgUrl)
        const buffer = Buffer.from(await imgRes.arrayBuffer())

        // Texto erótico random
        const texto = textosEroticos[Math.floor(Math.random() * textosEroticos.length)]

        await m.react('✅')

        await conn.sendMessage(m.chat, {
            image: buffer,
            caption: `🔥 *\( {command.toUpperCase()}* 🔥\n\n \){texto}\n\n> _${global.botName || 'Nino Nakano'}_`
        }, { quoted: m })

    } catch (e) {
        console.error('[NSFW TEXT ERROR]', e)
        await m.react('❌')
        return m.reply(`❌ No pude cargar el contenido. Intenta de nuevo.`)
    }
}

handler.command = ['caliente', 'erotica', 'nsfwtext']
handler.group = true
export default handler