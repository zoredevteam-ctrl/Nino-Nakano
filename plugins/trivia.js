/**
 * TRIVIA ANIME - NINO NAKANO
 * Comando: #trivia
 * Preguntas de anime con sistema de puntos
 */

import { database } from '../lib/database.js'

const TIEMPO_RESPUESTA = 30000 // 30 segundos
const PUNTOS_CORRECTA  = 10
const PUNTOS_RACHA     = 5    // bonus por racha de 3+

// ── Preguntas ─────────────────────────────────────────────────────────────────
const PREGUNTAS = [
    // Naruto
    { p: '¿Cuál es el jutsu más famoso de Naruto Uzumaki?', r: ['rasengan'], a: 'Rasengan 🌀', cat: 'Naruto' },
    { p: '¿Cómo se llama el sensei del equipo 7?', r: ['kakashi', 'kakashi hatake'], a: 'Kakashi Hatake 🎭', cat: 'Naruto' },
    { p: '¿Cuál es el nombre del bijuu de 9 colas?', r: ['kurama'], a: 'Kurama 🦊', cat: 'Naruto' },
    { p: '¿De qué clan es Sasuke?', r: ['uchiha'], a: 'Clan Uchiha 👁️', cat: 'Naruto' },
    { p: '¿Quién es el padre de Naruto?', r: ['minato', 'minato namikaze', 'yondaime'], a: 'Minato Namikaze ⚡', cat: 'Naruto' },
    // One Piece
    { p: '¿Cuál es el sueño de Monkey D. Luffy?', r: ['rey de los piratas', 'pirate king'], a: 'Rey de los Piratas 🏴‍☠️', cat: 'One Piece' },
    { p: '¿Qué fruta del diablo comió Luffy?', r: ['gomu gomu', 'hito hito', 'nika'], a: 'Gomu Gomu no Mi 🔴', cat: 'One Piece' },
    { p: '¿Cómo se llama el cocinero de los Mugiwara?', r: ['sanji', 'vinsmoke sanji'], a: 'Sanji 🍳', cat: 'One Piece' },
    { p: '¿Cuál es el nombre del barco de los Mugiwara?', r: ['thousand sunny', 'sunny'], a: 'Thousand Sunny ☀️', cat: 'One Piece' },
    { p: '¿Quién es el tirador de los Mugiwara?', r: ['usopp', 'sogeking'], a: 'Usopp 🎯', cat: 'One Piece' },
    // Dragon Ball
    { p: '¿Cuál es la transformación más icónica de Goku?', r: ['super saiyan', 'super saiyajin', 'ssj'], a: 'Super Saiyan ⚡', cat: 'Dragon Ball' },
    { p: '¿Cómo se llama el hijo mayor de Goku?', r: ['gohan'], a: 'Gohan 🐉', cat: 'Dragon Ball' },
    { p: '¿Cuántas esferas del dragón existen?', r: ['7', 'siete'], a: '7 esferas 🐉', cat: 'Dragon Ball' },
    { p: '¿Cómo se llama el dragón que concede deseos?', r: ['shenron', 'shenlong'], a: 'Shenron 🐲', cat: 'Dragon Ball' },
    // Demon Slayer
    { p: '¿Cómo se llama el hermano de Tanjiro?', r: ['nezuko', 'nezuko kamado'], a: 'Nezuko Kamado 🌸', cat: 'Demon Slayer' },
    { p: '¿Qué respiración usa Tanjiro al inicio?', r: ['agua', 'respiracion del agua', 'water breathing'], a: 'Respiración del Agua 💧', cat: 'Demon Slayer' },
    { p: '¿Quién es el Pilar del Sonido?', r: ['tengen', 'tengen uzui'], a: 'Tengen Uzui 💎', cat: 'Demon Slayer' },
    // Attack on Titan
    { p: '¿Cómo se llama el protagonista de Shingeki no Kyojin?', r: ['eren', 'eren yeager', 'eren jaeger'], a: 'Eren Yeager ⚔️', cat: 'AoT' },
    { p: '¿Qué son los ODM gear?', r: ['equipo de maniobra tridimensional', 'equipo', 'maniobra tridimensional'], a: 'Equipo de maniobra tridimensional 🪝', cat: 'AoT' },
    // My Hero Academia
    { p: '¿Cómo se llama el quirk de Deku?', r: ['one for all'], a: 'One For All 💥', cat: 'MHA' },
    { p: '¿Cuál es el hero number 1 al inicio de la serie?', r: ['endeavor', 'enji todoroki'], a: 'Endeavor 🔥', cat: 'MHA' },
    { p: '¿Cómo se llama el villano principal de MHA?', r: ['all for one'], a: 'All For One 👿', cat: 'MHA' },
    // Sword Art Online
    { p: '¿Cómo se llama el protagonista de SAO?', r: ['kirito', 'kirigaya kazuto'], a: 'Kirito ⚔️', cat: 'SAO' },
    // Quintessential Quintuplets
    { p: '¿Cuántas hermanas Nakano hay?', r: ['5', 'cinco'], a: '5 hermanas 🌸', cat: 'Quintuplets' },
    { p: '¿Cuál es el nombre completo de Nino Nakano?', r: ['nino nakano'], a: 'Nino Nakano 🦋', cat: 'Quintuplets' },
    { p: '¿Quién es la hermana mayor de las Nakano?', r: ['ichika', 'ichika nakano'], a: 'Ichika Nakano 🎭', cat: 'Quintuplets' },
    // Re:Zero
    { p: '¿Cuál es el poder de Subaru en Re:Zero?', r: ['return by death', 'volver a la muerte', 'regresar de la muerte'], a: 'Return by Death ☠️', cat: 'Re:Zero' },
    // Fullmetal Alchemist
    { p: '¿Cómo se llama el hermano mayor en FMA?', r: ['edward', 'edward elric'], a: 'Edward Elric ⚗️', cat: 'FMA' },
    { p: '¿Qué regla fundamental rige la alquimia en FMA?', r: ['equivalent exchange', 'intercambio equivalente'], a: 'Intercambio Equivalente ⚖️', cat: 'FMA' },
    // Hunter x Hunter
    { p: '¿Cómo se llama la energía vital en HxH?', r: ['nen'], a: 'Nen ✨', cat: 'HxH' },
    { p: '¿Quién es el mejor amigo de Gon?', r: ['killua', 'killua zoldyck'], a: 'Killua Zoldyck ⚡', cat: 'HxH' },
]

// Sesiones activas: chatId → { pregunta, timeout, respondido }
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
            title: `🎮 ${global.botName || 'Nino Nakano'} — Trivia`,
            body: 'Trivia Anime 🌸',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, quoted ? { quoted } : {})

let handler = async (m, { conn, command, text }) => {
    const cmd = command.toLowerCase()

    // ── #trivia — iniciar pregunta ────────────────────────────────────────────
    if (cmd === 'trivia') {
        if (sesiones.has(m.chat)) {
            const actual = sesiones.get(m.chat)
            return sendNino(conn, m.chat,
                `⏳ *Ya hay una trivia activa!*\n\n` +
                `❓ *${actual.pregunta.p}*\n\n` +
                `_Responde antes de que se acabe el tiempo_ 🦋`, m
            )
        }

        const pregunta = PREGUNTAS[Math.floor(Math.random() * PREGUNTAS.length)]

        await sendNino(conn, m.chat,
            `🎮 *TRIVIA ANIME* — ${pregunta.cat}\n\n` +
            `❓ *${pregunta.p}*\n\n` +
            `⏱️ _Tienes ${TIEMPO_RESPUESTA / 1000} segundos para responder_\n` +
            `> Escribe tu respuesta directamente en el chat 🦋`, m
        )

        const timeout = setTimeout(async () => {
            if (sesiones.has(m.chat)) {
                sesiones.delete(m.chat)
                await sendNino(conn, m.chat,
                    `⏰ *TIEMPO AGOTADO*\n\n` +
                    `Nadie respondió correctamente...\n\n` +
                    `✅ *La respuesta era:* ${pregunta.a}\n\n` +
                    `_Usa *#trivia* para otra pregunta_ 🦋`
                )
            }
        }, TIEMPO_RESPUESTA)

        sesiones.set(m.chat, { pregunta, timeout, respondido: false })
        return
    }

    // ── #triviatop — ver ranking ──────────────────────────────────────────────
    if (cmd === 'triviatop') {
        const users = database.data?.users || {}
        const top = Object.entries(users)
            .filter(([, u]) => u.triviaPoints > 0)
            .sort((a, b) => (b[1].triviaPoints || 0) - (a[1].triviaPoints || 0))
            .slice(0, 10)

        if (!top.length) return sendNino(conn, m.chat, `📊 Nadie ha jugado trivia aún. Usa *#trivia* para empezar 🎮`, m)

        const medals = ['🥇', '🥈', '🥉']
        const lista  = top.map(([jid, u], i) =>
            `${medals[i] || `*${i + 1}.*`} ${u.name || jid.split('@')[0]} — *${u.triviaPoints || 0} pts*`
        ).join('\n')

        return sendNino(conn, m.chat,
            `🏆 *TOP TRIVIA ANIME*\n\n${lista}\n\n` +
            `_Usa *#trivia* para ganar puntos_ 🎮`, m
        )
    }
}

// ── handler.before — detectar respuestas ──────────────────────────────────────
handler.before = async (m, { conn }) => {
    if (!m.isGroup || !m.body || m.body.startsWith('#')) return false

    const sesion = sesiones.get(m.chat)
    if (!sesion || sesion.respondido) return false

    const respuesta  = m.body.trim().toLowerCase()
    const esCorrecta = sesion.pregunta.r.some(r => respuesta.includes(r.toLowerCase()))

    if (!esCorrecta) return false

    // ✅ Respuesta correcta
    sesion.respondido = true
    clearTimeout(sesion.timeout)
    sesiones.delete(m.chat)

    const sender = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
    const user   = database.getUser(sender)
    if (!user.triviaPoints) user.triviaPoints = 0
    if (!user.triviaRacha)  user.triviaRacha  = 0

    user.triviaRacha++
    const bonus  = user.triviaRacha >= 3 ? PUNTOS_RACHA : 0
    const puntos = PUNTOS_CORRECTA + bonus
    user.triviaPoints += puntos
    user.exp = (user.exp || 0) + 5
    if (!user.name) user.name = m.pushName || sender.split('@')[0]

    await conn.sendMessage(m.chat, {
        text:
            `✅ *¡CORRECTO!* 🎉\n\n` +
            `@${sender.split('@')[0]} acertó!\n\n` +
            `✅ *Respuesta:* ${sesion.pregunta.a}\n` +
            `💎 *Puntos:* +${puntos}${bonus ? ` (racha x${user.triviaRacha} +${bonus} bonus!)` : ''}\n` +
            `🏆 *Total:* ${user.triviaPoints} pts\n\n` +
            `_Usa *#trivia* para otra pregunta_ 🦋`,
        contextInfo: { mentionedJid: [sender] }
    })

    return false // No bloquear el mensaje
}

handler.command = ['trivia', 'triviatop']
export default handler