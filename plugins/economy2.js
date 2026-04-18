/**
 * ECONOMÍA AVANZADA - NINO NAKANO
 * #prestamo <cantidad> — pedir prestado al banco
 * #pagar — pagar préstamo
 * #invertir <cantidad> — invertir diamantes
 * #donar @usuario <cantidad> — donar diamantes
 * #dar @usuario <cantidad> — owner da diamantes a cualquiera
 * #robar @usuario — robar mejorado con probabilidades
 */

import { database } from '../lib/database.js'

const INTERES_PRESTAMO  = 0.20  // 20% de interés
const MAX_PRESTAMO      = 200   // máximo a pedir prestado
const COOLDOWN_PRESTAMO = 24 * 60 * 60 * 1000 // 1 día
const COOLDOWN_ROBAR    = 30 * 60 * 1000       // 30 min
const COOLDOWN_INVERTIR = 12 * 60 * 60 * 1000  // 12 horas

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
            title: `💰 ${global.botName || 'Nino Nakano'}`,
            body: 'Economía Avanzada 💎',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, { quoted: m })

const normalizeJid = (jid) => (jid || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'

let handler = async (m, { conn, command, text, args, isOwner, db }) => {
    const cmd    = command.toLowerCase()
    const sender = normalizeJid(m.sender)
    const user   = database.getUser(sender)
    const ahora  = Date.now()

    // ── #donar — donar diamantes a otro usuario ───────────────────────────────
    if (cmd === 'donar' || cmd === 'transferir') {
        const target = m.mentionedJid?.[0] ? normalizeJid(m.mentionedJid[0])
                     : m.quoted?.sender    ? normalizeJid(m.quoted.sender)
                     : null

        if (!target) return sendNino(conn, m,
            `💝 *DONAR DIAMANTES*\n\n` +
            `Uso: *#donar @usuario <cantidad>*\n` +
            `Ejemplo: *#donar @amigo 50* 🦋`
        )

        if (target === sender) return sendNino(conn, m, `😅 No puedes donarte a ti mismo/a. 🦋`)

        const cantidad = parseInt(args.find(a => /^\d+$/.test(a)) || '0')
        if (!cantidad || cantidad < 1) return sendNino(conn, m, `💎 Indica una cantidad válida.\nEjemplo: *#donar @usuario 50* 🦋`)
        if (cantidad > (user.limit || 0)) return sendNino(conn, m,
            `💔 No tienes suficientes diamantes.\n\n` +
            `Quieres donar: *${cantidad} 💎*\n` +
            `Tienes: *${user.limit || 0} 💎* 🦋`
        )

        const targetUser = database.getUser(target)
        user.limit       = (user.limit || 0) - cantidad
        targetUser.limit = (targetUser.limit || 0) + cantidad

        return conn.sendMessage(m.chat, {
            text:
                `💝 *DONACIÓN EXITOSA*\n\n` +
                `@${sender.split('@')[0]} le donó *${cantidad} 💎* a @${target.split('@')[0]}~\n\n` +
                `❤️ _Qué generoso/a_ 🌸🦋`,
            contextInfo: { mentionedJid: [sender, target] }
        }, { quoted: m })
    }

    // ── #dar — owner da diamantes (a sí mismo o a otros) ─────────────────────
    if (cmd === 'dar' || cmd === 'addcoins' || cmd === 'setcoins') {
        if (!isOwner) return sendNino(conn, m, `👑 Solo el owner puede usar este comando. 😤`)

        const target = m.mentionedJid?.[0] ? normalizeJid(m.mentionedJid[0])
                     : m.quoted?.sender    ? normalizeJid(m.quoted.sender)
                     : sender // Si no menciona nadie, se da a sí mismo

        const cantidad = parseInt(args.find(a => /^\d+$/.test(a)) || '0')
        if (!cantidad || cantidad < 1) return sendNino(conn, m,
            `💎 *DAR DIAMANTES*\n\n` +
            `Uso: *#dar @usuario <cantidad>*\n` +
            `También: *#dar <cantidad>* (te los da a ti mismo)\n\n` +
            `Ejemplo: *#dar @usuario 500* 🦋`
        )

        const targetUser = database.getUser(target)
        targetUser.limit = (targetUser.limit || 0) + cantidad

        const esMismo = target === sender
        return conn.sendMessage(m.chat, {
            text:
                `💎 *DIAMANTES AÑADIDOS*\n\n` +
                `${esMismo
                    ? `Te diste *${cantidad} 💎* a ti mismo/a~ 👑`
                    : `@${sender.split('@')[0]} le dio *${cantidad} 💎* a @${target.split('@')[0]}~ 👑`}\n\n` +
                `💼 *Saldo actual:* ${targetUser.limit} 💎`,
            contextInfo: esMismo ? {} : { mentionedJid: [target] }
        }, { quoted: m })
    }

    // ── #prestamo — pedir prestado ────────────────────────────────────────────
    if (cmd === 'prestamo' || cmd === 'préstamo' || cmd === 'loan') {
        if (user.prestamo && user.prestamo.monto > 0) {
            return sendNino(conn, m,
                `🏦 *PRÉSTAMO ACTIVO*\n\n` +
                `Ya tienes un préstamo pendiente:\n\n` +
                `💸 *Debes:* ${user.prestamo.monto} 💎\n` +
                `📅 *Solicitado:* ${new Date(user.prestamo.fecha).toLocaleDateString('es-CO')}\n\n` +
                `Usa *#pagar* para saldar tu deuda. 🦋`
            )
        }

        const cantidad = parseInt(text?.trim() || '0')
        if (!cantidad || cantidad < 10 || cantidad > MAX_PRESTAMO) {
            return sendNino(conn, m,
                `🏦 *PRÉSTAMO BANCARIO*\n\n` +
                `El banco de ${global.botName || 'Nino'} te presta diamantes con ${INTERES_PRESTAMO * 100}% de interés.\n\n` +
                `💎 *Mínimo:* 10 | *Máximo:* ${MAX_PRESTAMO}\n\n` +
                `Uso: *#prestamo <cantidad>*\n` +
                `Ejemplo: *#prestamo 100* 🦋`
            )
        }

        const lastPrestamo = user.lastPrestamo || 0
        if (ahora - lastPrestamo < COOLDOWN_PRESTAMO) {
            const horas = Math.ceil((COOLDOWN_PRESTAMO - (ahora - lastPrestamo)) / 3600000)
            return sendNino(conn, m, `⏳ Debes esperar *${horas}h* antes de pedir otro préstamo. 🦋`)
        }

        const total = Math.ceil(cantidad * (1 + INTERES_PRESTAMO))
        user.limit       = (user.limit || 0) + cantidad
        user.prestamo    = { monto: total, original: cantidad, fecha: ahora }
        user.lastPrestamo = ahora

        return sendNino(conn, m,
            `🏦 *PRÉSTAMO APROBADO* ✅\n\n` +
            `💎 *Recibiste:* ${cantidad} diamantes\n` +
            `💸 *A pagar:* ${total} diamantes (${INTERES_PRESTAMO * 100}% interés)\n\n` +
            `💼 *Tu saldo:* ${user.limit} 💎\n\n` +
            `_Usa *#pagar* para saldar tu deuda_ 🦋`
        )
    }

    // ── #pagar — pagar préstamo ───────────────────────────────────────────────
    if (cmd === 'pagar' || cmd === 'pay') {
        if (!user.prestamo || user.prestamo.monto <= 0) {
            return sendNino(conn, m, `✅ No tienes ningún préstamo pendiente. ¡Estás libre de deudas! 🌸`)
        }

        const deuda = user.prestamo.monto
        if ((user.limit || 0) < deuda) {
            return sendNino(conn, m,
                `💔 No tienes suficientes diamantes para pagar.\n\n` +
                `💸 *Debes:* ${deuda} 💎\n` +
                `💼 *Tienes:* ${user.limit || 0} 💎\n\n` +
                `_Gana más con #daily, #work y #minar_ 🦋`
            )
        }

        user.limit   = (user.limit || 0) - deuda
        user.prestamo = null

        return sendNino(conn, m,
            `✅ *PRÉSTAMO PAGADO*\n\n` +
            `Pagaste *${deuda} 💎* al banco. ¡Estás libre de deudas! 🌸\n\n` +
            `💼 *Saldo actual:* ${user.limit} 💎 🦋`
        )
    }

    // ── #invertir — invertir diamantes ───────────────────────────────────────
    if (cmd === 'invertir' || cmd === 'invest') {
        const lastInvertir = user.lastInvertir || 0
        if (ahora - lastInvertir < COOLDOWN_INVERTIR) {
            const horas = Math.ceil((COOLDOWN_INVERTIR - (ahora - lastInvertir)) / 3600000)
            return sendNino(conn, m, `⏳ Puedes invertir de nuevo en *${horas}h*. 🦋`)
        }

        const cantidad = parseInt(text?.trim() || '0')
        if (!cantidad || cantidad < 10) {
            return sendNino(conn, m,
                `📈 *INVERSIÓN*\n\n` +
                `Invierte tus diamantes y espera resultados~\n\n` +
                `🎲 *Probabilidades:*\n` +
                `▸ 40% — Ganas 50% extra 📈\n` +
                `▸ 30% — Recuperas lo invertido ➡️\n` +
                `▸ 20% — Pierdes 30% 📉\n` +
                `▸ 10% — Pierdes todo 💀\n\n` +
                `Uso: *#invertir <cantidad>*\n` +
                `_Cooldown: 12 horas_ 🦋`
            )
        }

        if (cantidad > (user.limit || 0)) {
            return sendNino(conn, m,
                `💔 No tienes suficientes diamantes.\n\n` +
                `Quieres invertir: *${cantidad} 💎*\n` +
                `Tienes: *${user.limit || 0} 💎* 🦋`
            )
        }

        user.lastInvertir = ahora

        const rand = Math.random()
        let resultado, ganancia, emoji, texto

        if (rand < 0.40) {
            ganancia = Math.floor(cantidad * 0.5)
            user.limit = (user.limit || 0) + ganancia
            emoji = '📈'; texto = `¡GANANCIA!`; resultado = `+${ganancia} 💎`
        } else if (rand < 0.70) {
            ganancia = 0
            emoji = '➡️'; texto = `SIN CAMBIOS`; resultado = `±0 💎`
        } else if (rand < 0.90) {
            ganancia = -Math.floor(cantidad * 0.3)
            user.limit = Math.max(0, (user.limit || 0) + ganancia)
            emoji = '📉'; texto = `PÉRDIDA PARCIAL`; resultado = `${ganancia} 💎`
        } else {
            ganancia = -cantidad
            user.limit = Math.max(0, (user.limit || 0) - cantidad)
            emoji = '💀'; texto = `PÉRDIDA TOTAL`; resultado = `-${cantidad} 💎`
        }

        return sendNino(conn, m,
            `${emoji} *INVERSIÓN — ${texto}*\n\n` +
            `💎 *Invertido:* ${cantidad}\n` +
            `📊 *Resultado:* ${resultado}\n\n` +
            `💼 *Saldo actual:* ${user.limit} 💎\n\n` +
            `_Puedes invertir de nuevo en 12h_ 🦋`
        )
    }

    // ── #robar — robar mejorado ───────────────────────────────────────────────
    if (cmd === 'robar' || cmd === 'rob' || cmd === 'steal') {
        const target = m.mentionedJid?.[0] ? normalizeJid(m.mentionedJid[0])
                     : m.quoted?.sender    ? normalizeJid(m.quoted.sender)
                     : null

        if (!target) return sendNino(conn, m,
            `🦹 *ROBAR*\n\n` +
            `Menciona a quien quieres robar~\n\n` +
            `Uso: *#robar @usuario*\n` +
            `_Cooldown: 30 minutos_ 🦋`
        )

        if (target === sender) return sendNino(conn, m, `😅 No puedes robarte a ti mismo/a.`)

        const lastRobo = user.lastRobo || 0
        if (ahora - lastRobo < COOLDOWN_ROBAR) {
            const min = Math.ceil((COOLDOWN_ROBAR - (ahora - lastRobo)) / 60000)
            return sendNino(conn, m, `⏳ Debes esperar *${min} minutos* antes de robar de nuevo. 🦋`)
        }

        const targetUser = database.getUser(target)
        user.lastRobo    = ahora

        if ((targetUser.limit || 0) < 5) {
            return sendNino(conn, m,
                `💔 @${target.split('@')[0]} no tiene suficientes diamantes para robar.\n\n` +
                `_Elige a alguien más rico~ 💅_ 🦋`
            )
        }

        const rand = Math.random()

        if (rand < 0.45) {
            // Éxito — roba entre 10% y 30% de los diamantes del objetivo
            const porcentaje = 0.10 + Math.random() * 0.20
            const robado     = Math.max(1, Math.floor((targetUser.limit || 0) * porcentaje))
            targetUser.limit = Math.max(0, (targetUser.limit || 0) - robado)
            user.limit       = (user.limit || 0) + robado

            return conn.sendMessage(m.chat, {
                text:
                    `🦹 *¡ROBO EXITOSO!*\n\n` +
                    `@${sender.split('@')[0]} robó *${robado} 💎* de @${target.split('@')[0]}~\n\n` +
                    `💼 *Tu saldo:* ${user.limit} 💎 🦋`,
                contextInfo: { mentionedJid: [sender, target] }
            }, { quoted: m })

        } else if (rand < 0.75) {
            // Fallo — te atrapa y pierdes diamantes
            const multa   = Math.min(15, Math.floor((user.limit || 0) * 0.10))
            user.limit    = Math.max(0, (user.limit || 0) - multa)

            return conn.sendMessage(m.chat, {
                text:
                    `🚔 *¡TE ATRAPARON!*\n\n` +
                    `@${sender.split('@')[0]} intentó robar a @${target.split('@')[0]} pero falló~\n\n` +
                    `💸 *Multa:* -${multa} 💎\n` +
                    `💼 *Tu saldo:* ${user.limit} 💎 🦋`,
                contextInfo: { mentionedJid: [sender, target] }
            }, { quoted: m })

        } else {
            // Contraataque — el objetivo te roba a ti
            const contraRobo = Math.min(10, Math.floor((user.limit || 0) * 0.08))
            user.limit       = Math.max(0, (user.limit || 0) - contraRobo)
            targetUser.limit = (targetUser.limit || 0) + contraRobo

            return conn.sendMessage(m.chat, {
                text:
                    `⚔️ *¡CONTRAATAQUE!*\n\n` +
                    `@${target.split('@')[0]} se defendió y te robó *${contraRobo} 💎*~\n\n` +
                    `💼 *Tu saldo:* ${user.limit} 💎 🦋`,
                contextInfo: { mentionedJid: [sender, target] }
            }, { quoted: m })
        }
    }
}

handler.command = [
    'donar', 'transferir',
    'dar', 'addcoins', 'setcoins',
    'prestamo', 'préstamo', 'loan',
    'pagar', 'pay',
    'invertir', 'invest',
    'robar', 'rob', 'steal'
]
export default handler