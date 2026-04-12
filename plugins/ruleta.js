/**
 * RULETA - NINO NAKANO
 * #ruleta — ruleta de premios (diamantes/exp)
 * #rruleta — ruleta rusa entre usuarios
 * Cooldown: 1 hora para ruleta, sin cooldown para rruleta
 */

import { database } from '../lib/database.js'

const COOLDOWN_RULETA = 60 * 60 * 1000 // 1 hora

const PREMIOS = [
    { emoji: '💎', texto: 'Jackpot de diamantes',    limit: +50,  exp: +100, prob: 3  },
    { emoji: '✨', texto: 'Experiencia doble',        limit: +20,  exp: +200, prob: 7  },
    { emoji: '🌸', texto: 'Diamantes extra',          limit: +15,  exp: +30,  prob: 15 },
    { emoji: '🎀', texto: 'Pequeña recompensa',       limit: +10,  exp: +20,  prob: 20 },
    { emoji: '🦋', texto: 'Suerte moderada',          limit: +5,   exp: +10,  prob: 25 },
    { emoji: '😶', texto: 'Nada... mala suerte',      limit: 0,    exp: 0,    prob: 20 },
    { emoji: '💢', texto: 'Pierdes diamantes',        limit: -5,   exp: 0,    prob: 7  },
    { emoji: '😱', texto: 'Pierdes más diamantes',    limit: -10,  exp: 0,    prob: 3  },
]

const BALAS_RUSA = ['💨', '💨', '💨', '💨', '💨', '🔫'] // 1 de 6

const spinRuleta = () => {
    const total = PREMIOS.reduce((s, p) => s + p.prob, 0)
    let rand = Math.random() * total
    for (const premio of PREMIOS) {
        rand -= premio.prob
        if (rand <= 0) return premio
    }
    return PREMIOS[PREMIOS.length - 1]
}

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
            title: `🎰 ${global.botName || 'Nino Nakano'} — Ruleta`,
            body: 'Juegos 🎮',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, { quoted: m })

let handler = async (m, { conn, command }) => {
    const cmd    = command.toLowerCase()
    const sender = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
    const user   = database.getUser(sender)
    const ahora  = Date.now()

    // ══════════════════════════════════════════════════════════════════════════
    // #ruleta — ruleta de premios
    // ══════════════════════════════════════════════════════════════════════════
    if (cmd === 'ruleta') {
        const lastRuleta   = user.lastRuleta || 0
        const tiempoEspera = COOLDOWN_RULETA - (ahora - lastRuleta)

        if (tiempoEspera > 0) {
            const min = Math.ceil(tiempoEspera / 60000)
            return sendNino(conn, m,
                `⏳ *RULETA EN COOLDOWN*\n\n` +
                `La ruleta se recarga cada hora~\n` +
                `Espera *${min} minuto${min !== 1 ? 's' : ''}* más. 🦋`
            )
        }

        user.lastRuleta = ahora

        // Animación de giro
        await m.react('🎰')
        await sendNino(conn, m, `🎰 *GIRANDO LA RULETA...*\n\n_¿Qué te deparará el destino?_ 🦋`)

        await new Promise(r => setTimeout(r, 2000))

        const premio = spinRuleta()
        user.limit   = Math.max(0, (user.limit || 0) + premio.limit)
        user.exp     = (user.exp || 0) + premio.exp

        const resultado =
            `${premio.emoji} *${premio.texto.toUpperCase()}*\n\n` +
            `${premio.limit > 0  ? `💎 *+${premio.limit} diamantes*\n` : premio.limit < 0 ? `💢 *${premio.limit} diamantes*\n` : ''}` +
            `${premio.exp > 0    ? `✨ *+${premio.exp} exp*\n` : ''}` +
            `\n💼 *Saldo actual:* ${user.limit} 💎 | ${user.exp} ✨\n\n` +
            `_Vuelve en 1 hora para girar de nuevo_ 🎰`

        await m.react(premio.emoji)
        return sendNino(conn, m, `🎰 *RESULTADO DE LA RULETA*\n\n${resultado}`)
    }

    // ══════════════════════════════════════════════════════════════════════════
    // #rruleta — ruleta rusa
    // ══════════════════════════════════════════════════════════════════════════
    if (cmd === 'rruleta') {
        if (!m.isGroup) return sendNino(conn, m, `🏢 La ruleta rusa solo funciona en grupos. 🎮`)

        await m.react('🔫')
        await sendNino(conn, m,
            `🔫 *RULETA RUSA*\n\n` +
            `@${sender.split('@')[0]} apunta el arma a su cabeza...\n` +
            `_El tambor gira..._ 🎯`,
        )

        await new Promise(r => setTimeout(r, 2500))

        const bala   = BALAS_RUSA[Math.floor(Math.random() * BALAS_RUSA.length)]
        const murió  = bala === '🔫'

        if (murió) {
            // Kick si el bot es admin
            let kickeado = false
            try {
                await conn.groupParticipantsUpdate(m.chat, [sender], 'remove')
                kickeado = true
            } catch {}

            await conn.sendMessage(m.chat, {
                text:
                    `💀 *¡BANG!*\n\n` +
                    `@${sender.split('@')[0]} no tuvo suerte...\n\n` +
                    `🔫 *La bala era real* 💀\n` +
                    `${kickeado ? `_Fue expulsado del grupo_ 💢` : `_Intenté expulsarlo pero no tengo admin_ 😒`}`,
                contextInfo: { mentionedJid: [sender] }
            })
        } else {
            user.limit = (user.limit || 0) + 10
            user.exp   = (user.exp || 0) + 20

            await conn.sendMessage(m.chat, {
                text:
                    `💨 *¡CLICK!*\n\n` +
                    `@${sender.split('@')[0]} sobrevivió... por esta vez~ 😤\n\n` +
                    `${bala} *Cámara vacía*\n` +
                    `💎 *+10 diamantes* por ser valiente\n` +
                    `✨ *+20 exp* 🦋`,
                contextInfo: { mentionedJid: [sender] }
            })
        }
    }
}

handler.command = ['ruleta', 'rruleta']
export default handler