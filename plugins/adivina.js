/**
 * ADIVINA EL PERSONAJE - NINO NAKANO
 * #adivina — adivina el personaje de anime por descripción
 * #adivinafoto — adivina por imagen (usa nekos.best / API)
 */

import { database } from '../lib/database.js'

const TIEMPO     = 45000 // 45 segundos
const PUNTOS_WIN = 15

// ── Personajes con descripción e imagen ──────────────────────────────────────
const PERSONAJES = [
    {
        nombre: 'Naruto Uzumaki',
        pistas: ['Es el séptimo Hokage de Konoha', 'Tiene un zorro de 9 colas dentro de él', 'Su jutsu favorito es el Rasengan', 'Viste de naranja y lleva marcas en las mejillas'],
        aliases: ['naruto', 'naruto uzumaki'],
        anime: 'Naruto',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/9/9a/NarutoUzumaki.png'
    },
    {
        nombre: 'Monkey D. Luffy',
        pistas: ['Es el capitán de los Piratas del Sombrero de Paja', 'Su cuerpo es de goma gracias a una fruta del diablo', 'Su sueño es ser el Rey de los Piratas', 'Siempre usa un sombrero de paja'],
        aliases: ['luffy', 'monkey d luffy', 'monkey d. luffy'],
        anime: 'One Piece',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/9/90/Monkey_D_Luffy.png'
    },
    {
        nombre: 'Goku',
        pistas: ['Es un Saiyan enviado a la Tierra de bebé', 'Su transformación más famosa le pone el cabello dorado', 'Su ataque especial es el Kamehameha', 'Su hijo se llama Gohan'],
        aliases: ['goku', 'son goku', 'kakarot'],
        anime: 'Dragon Ball',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/4/4d/Goku.jpg'
    },
    {
        nombre: 'Tanjiro Kamado',
        pistas: ['Su hermana fue convertida en demonio', 'Usa respiración del agua y del sol', 'Tiene una cicatriz en la frente', 'Es un cazador de demonios'],
        aliases: ['tanjiro', 'tanjiro kamado'],
        anime: 'Demon Slayer',
        imagen: 'https://static.wikia.nocookie.net/kimetsu-no-yaiba/images/e/e6/Tanjiro_anime_design.png'
    },
    {
        nombre: 'Levi Ackerman',
        pistas: ['Es el capitán más fuerte de la humanidad', 'Pertenece al Cuerpo de Exploración', 'Tiene una técnica de limpieza muy particular', 'Es muy bajo pero extremadamente poderoso'],
        aliases: ['levi', 'levi ackerman', 'capitan levi'],
        anime: 'Attack on Titan',
        imagen: 'https://static.wikia.nocookie.net/shingekinokyojin/images/7/72/Levi_Ackerman_anime.png'
    },
    {
        nombre: 'Izuku Midoriya',
        pistas: ['Nació sin quirk pero heredó uno especial', 'Su hero name es Deku', 'Admira profundamente a All Might', 'Su quirk se llama One For All'],
        aliases: ['deku', 'midoriya', 'izuku', 'izuku midoriya'],
        anime: 'My Hero Academia',
        imagen: 'https://static.wikia.nocookie.net/myheroacademia/images/6/60/Izuku_Midoriya_Full_Appearance.png'
    },
    {
        nombre: 'Killua Zoldyck',
        pistas: ['Viene de una familia de asesinos', 'Su mejor amigo es Gon', 'Su nen es de tipo transmutación con electricidad', 'Tiene el cabello blanco y ojos azules'],
        aliases: ['killua', 'killua zoldyck'],
        anime: 'Hunter x Hunter',
        imagen: 'https://static.wikia.nocookie.net/hunterxhunter/images/0/06/Killua_Zoldyck_2011.png'
    },
    {
        nombre: 'Edward Elric',
        pistas: ['Es el alquimista de acero', 'Perdió su brazo y pierna en un ritual fallido', 'Es muy bajito y le molesta que lo digan', 'Tiene una armadura de hermano llamado Alphonse'],
        aliases: ['edward', 'edward elric', 'ed elric'],
        anime: 'Fullmetal Alchemist',
        imagen: 'https://static.wikia.nocookie.net/fma/images/5/52/EdAnime.png'
    },
    {
        nombre: 'Nino Nakano',
        pistas: ['Es la segunda quintilliza de las hermanas Nakano', 'Tiene el cabello rojo', 'Le encanta la música y los auriculares', 'Es tsundere y muy directa con sus sentimientos'],
        aliases: ['nino', 'nino nakano'],
        anime: 'Quintessential Quintuplets',
        imagen: 'https://static.wikia.nocookie.net/5toubun-no-hanayome/images/5/55/Nino_Nakano_anime_design.png'
    },
    {
        nombre: 'Rem',
        pistas: ['Es una demi-humana con cuernos ocultos', 'Trabaja como sirvienta junto a su hermana gemela', 'Tiene el cabello azul corto', 'Está profundamente enamorada del protagonista de Re:Zero'],
        aliases: ['rem'],
        anime: 'Re:Zero',
        imagen: 'https://static.wikia.nocookie.net/rezero/images/d/d1/Rem_Anime.png'
    },
    {
        nombre: 'Sasuke Uchiha',
        pistas: ['Es el último superviviente del clan Uchiha', 'Su jutsu firma es el Chidori', 'Tiene el Sharingan y luego el Rinnegan', 'Fue rival y compañero de equipo de Naruto'],
        aliases: ['sasuke', 'sasuke uchiha'],
        anime: 'Naruto',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/d/d7/Sasuke_Uchiha_character.png'
    },
    {
        nombre: 'Roronoa Zoro',
        pistas: ['Usa tres espadas al mismo tiempo', 'Su sueño es ser el mejor espadachín del mundo', 'Siempre se pierde aunque no quiera admitirlo', 'Es el primer tripulante de los Mugiwara'],
        aliases: ['zoro', 'roronoa zoro', 'zolo'],
        anime: 'One Piece',
        imagen: 'https://upload.wikimedia.org/wikipedia/en/1/1d/Roronoa_Zoro_character.png'
    },
]

// Sesiones activas: chatId → { personaje, pistaActual, timeout }
const sesiones = new Map()

const getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const sendNino = async (conn, chat, text, quoted = null) => conn.sendMessage(chat, {
    text,
    contextInfo: {
        externalAdReply: {
            title: `🎮 ${global.botName || 'Nino Nakano'} — Adivina`,
            body: '¿Quién soy? 🌸',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, quoted ? { quoted } : {})

let handler = async (m, { conn, command }) => {
    const cmd = command.toLowerCase()

    if (cmd === 'adivina' || cmd === 'adivinarpersonaje') {
        if (sesiones.has(m.chat)) {
            const s = sesiones.get(m.chat)
            return sendNino(conn, m.chat,
                `⏳ *Ya hay un juego activo!*\n\n` +
                `🔍 *Pista ${s.pistaActual + 1}:* ${s.personaje.pistas[s.pistaActual]}\n\n` +
                `_Escribe el nombre del personaje_ 🦋`, m
            )
        }

        const personaje = PERSONAJES[Math.floor(Math.random() * PERSONAJES.length)]

        await sendNino(conn, m.chat,
            `🎮 *¡ADIVINA EL PERSONAJE!* 🌸\n\n` +
            `📺 *Anime:* ${personaje.anime}\n\n` +
            `🔍 *Pista 1:* ${personaje.pistas[0]}\n\n` +
            `⏱️ _Tienes ${TIEMPO / 1000} segundos — Escribe el nombre directamente_\n` +
            `💡 _Usa *#pista* para más pistas (reduce puntos)_ 🦋`, m
        )

        const timeout = setTimeout(async () => {
            if (sesiones.has(m.chat)) {
                const s = sesiones.get(m.chat)
                sesiones.delete(m.chat)
                await sendNino(conn, m.chat,
                    `⏰ *TIEMPO AGOTADO*\n\n` +
                    `Nadie adivinó el personaje...\n\n` +
                    `✅ *Era:* ${s.personaje.nombre} (${s.personaje.anime})\n\n` +
                    `_Usa *#adivina* para intentarlo de nuevo_ 🦋`
                )
            }
        }, TIEMPO)

        sesiones.set(m.chat, { personaje, pistaActual: 0, timeout, puntosBase: PUNTOS_WIN })
        return
    }

    // ── #pista — pedir más pistas ─────────────────────────────────────────────
    if (cmd === 'pista') {
        const sesion = sesiones.get(m.chat)
        if (!sesion) return sendNino(conn, m.chat, `No hay ningún juego activo. Usa *#adivina* para empezar 🎮`, m)

        if (sesion.pistaActual >= sesion.personaje.pistas.length - 1) {
            return sendNino(conn, m.chat,
                `💡 Ya di todas las pistas disponibles.\n\n` +
                `🔍 *Todas las pistas:*\n` +
                sesion.personaje.pistas.map((p, i) => `${i + 1}. ${p}`).join('\n') + `\n\n` +
                `_¡Aún puedes adivinar!_ 🦋`, m
            )
        }

        sesion.pistaActual++
        sesion.puntosBase = Math.max(5, sesion.puntosBase - 3) // Reduce puntos por pista

        return sendNino(conn, m.chat,
            `💡 *PISTA ${sesion.pistaActual + 1}:*\n\n` +
            `${sesion.personaje.pistas[sesion.pistaActual]}\n\n` +
            `⚠️ _Los puntos se reducen por cada pista: ${sesion.puntosBase} pts ahora_ 🦋`, m
        )
    }

    // ── #rendirse ─────────────────────────────────────────────────────────────
    if (cmd === 'rendirse' || cmd === 'nosey') {
        const sesion = sesiones.get(m.chat)
        if (!sesion) return sendNino(conn, m.chat, `No hay ningún juego activo 🎮`, m)

        clearTimeout(sesion.timeout)
        sesiones.delete(m.chat)

        return sendNino(conn, m.chat,
            `🏳️ *JUEGO TERMINADO*\n\n` +
            `El personaje era: *${sesion.personaje.nombre}* (${sesion.personaje.anime})\n\n` +
            `_Usa *#adivina* para intentarlo de nuevo_ 🦋`, m
        )
    }
}

// ── handler.before — detectar respuestas ──────────────────────────────────────
handler.before = async (m, { conn }) => {
    if (!m.isGroup || !m.body || m.body.startsWith('#') || m.body.startsWith('.')) return false

    const sesion = sesiones.get(m.chat)
    if (!sesion) return false

    const respuesta = m.body.trim().toLowerCase()
    const esCorrecta = sesion.personaje.aliases.some(a => respuesta.includes(a.toLowerCase()))

    if (!esCorrecta) return false

    clearTimeout(sesion.timeout)
    sesiones.delete(m.chat)

    const sender = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
    const user   = database.getUser(sender)
    if (!user.name) user.name = m.pushName || sender.split('@')[0]

    user.limit = (user.limit || 0) + sesion.puntosBase
    user.exp   = (user.exp || 0) + 10
    if (!user.adivinaWins) user.adivinaWins = 0
    user.adivinaWins++

    await conn.sendMessage(m.chat, {
        text:
            `✅ *¡CORRECTO!* 🎉\n\n` +
            `@${sender.split('@')[0]} adivinó!\n\n` +
            `🎭 *Personaje:* ${sesion.personaje.nombre}\n` +
            `📺 *Anime:* ${sesion.personaje.anime}\n\n` +
            `💎 *+${sesion.puntosBase} diamantes*\n` +
            `✨ *+10 exp*\n` +
            `🏆 *Victorias:* ${user.adivinaWins}\n\n` +
            `_Usa *#adivina* para otra ronda_ 🦋`,
        contextInfo: { mentionedJid: [sender] }
    })

    return false
}

handler.command = ['adivina', 'adivinarpersonaje', 'pista', 'rendirse', 'nosey']
export default handler