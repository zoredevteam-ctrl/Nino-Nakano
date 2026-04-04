import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

/**
 * Economy System - Adaptado para Nino Nakano Bot
 * Estilo tsundere + tierno para owner
 */

const toMs = (h = 0, m = 0, s = 0) => ((h * 3600) + (m * 60) + s) * 1000
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pad = v => String(v).padStart(2, '0')

const formatDelta = ms => {
    if (!ms || ms <= 0) return '00:00:00'
    const total = Math.floor(ms / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const parts = []
    if (h) parts.push(`${h}h`)
    if (m) parts.push(`${m}m`)
    parts.push(`${s}s`)
    return parts.join(' : ')
}

const ensureUser = (jid) => {
    if (!global.db?.data?.users) {
        if (!global.db) global.db = { data: {} }
        if (!global.db.data) global.db.data = {}
        global.db.data.users = {}
    }
    if (!global.db.data.users[jid]) {
        global.db.data.users[jid] = {
            exp: 0,
            money: 0,
            bank: 0,
            level: 1,
            lastDaily: 0,
            lastCofre: 0,
            lastMinar: 0,
            lastRob: 0,
            lastRob2: 0
        }
    }
    return global.db.data.users[jid]
}

export default {
    command: ['daily', 'cofre', 'minar', 'crime', 'crimen', 'rob', 'rob2', 'd', 'deposit', 'depositar', 'bal', 'baltop', 'lvl'],
    tags: ['economy'],
    desc: 'Sistema de economía con recompensas diarias, minar, robar y más',

    async run(m, { conn, text = '', usedPrefix, command, isOwner }) {
        const cmd = command.toLowerCase()
        const who = m.sender
        const u = ensureUser(who)

        // Configuración (currency y banner)
        const currency = 'Coins' // Puedes cambiarlo después
        const banner = 'https://qu.ax/zRNgk.jpg' // Banner por defecto

        // Mensajes según si es owner o no
        const t = (normal, ownerText) => isOwner ? (ownerText || normal) : normal

        try {
            switch (cmd) {

                // ==================== DAILY / COFRE ====================
                case 'daily':
                case 'cofre': {
                    const key = cmd === 'daily' ? 'lastDaily' : 'lastCofre'
                    const cd = toMs(24, 0, 0)
                    const now = Date.now()

                    if (now - (u[key] || 0) < cd) {
                        const rem = (u[key] || 0) + cd - now
                        return m.reply(t(
                            `🦋 Vuelve en *${formatDelta(rem)}* para reclamar tu ${cmd} otra vez, tonto.`,
                            `Mi amor, aún falta *${formatDelta(rem)}* para tu recompensa diaria 🥺`
                        ))
                    }

                    const amount = randInt(100, 800)
                    u.money = (u.money || 0) + amount
                    u[key] = now

                    return m.reply(t(
                        `🦋 Reclamaste tu *\( {cmd === 'daily' ? 'recompensa diaria' : 'cofre'}*.\n\n🌸 * \){currency}:* +${amount}`,
                        `💖 Mi rey reclamó su recompensa\~ Aquí tienes ${amount} ${currency} 🥰`
                    ))
                }

                // ==================== MINAR ====================
                case 'minar': {
                    const cd = toMs(0, 24, 0) // 24 minutos
                    const now = Date.now()

                    if (now - (u.lastMinar || 0) < cd) {
                        const rem = (u.lastMinar || 0) + cd - now
                        return m.reply(t(
                            `🦋 Debes esperar *${formatDelta(rem)}* para minar de nuevo.`,
                            `Mi amor, todavía falta *${formatDelta(rem)}* para que puedas minar otra vez 🥺`
                        ))
                    }

                    const addExp = randInt(20, 80)
                    const addMoney = randInt(50, 150)

                    u.exp = (u.exp || 0) + addExp
                    u.money = (u.money || 0) + addMoney
                    u.lastMinar = now

                    return m.reply(t(
                        `🦋 Estuviste minando...\n\n✨ *Exp:* +\( {addExp}\n🌸 * \){currency}:* +${addMoney}`,
                        `💕 Mi rey estuvo trabajando duro\~ Ganaste ${addExp} Exp y ${addMoney} ${currency} 🥰`
                    ))
                }

                // ==================== CRIME / CRIMEN ====================
                case 'crime':
                case 'crimen': {
                    const gained = randInt(80, 250)
                    u.money = (u.money || 0) + gained

                    return m.reply(t(
                        `😈 Cometiste un crimen y obtuviste *${gained} ${currency}*. Nadie te vio... por ahora.`,
                        `Mi amor, robaste ${gained} ${currency} como todo un profesional 💕`
                    ))
                }

                // ==================== ROB y ROB2 ====================
                case 'rob':
                case 'rob2': {
                    const now = Date.now()
                    const cdKey = cmd === 'rob' ? 'lastRob' : 'lastRob2'
                    const cd = toMs(1, 0, 0) // 1 hora

                    if (now - (u[cdKey] || 0) < cd) {
                        const rem = (u[cdKey] || 0) + cd - now
                        return m.reply(t(
                            `🦋 Debes esperar *${formatDelta(rem)}* para robar de nuevo.`,
                            `Mi cielo, aún falta *${formatDelta(rem)}* para que puedas robar otra vez 🥺`
                        ))
                    }

                    let target = m.quoted?.sender || m.mentionedJid?.[0]
                    if (!target) return m.reply(t('🦋 Dime a quién quieres robar (menciona o responde).', 'Mi amor, ¿a quién quieres robar? 🥺'))

                    if (target === who) return m.reply('🦋 No puedes robarte a ti mismo, tonto.')

                    ensureUser(target)
                    const victim = global.db.data.users[target]

                    if (cmd === 'rob') {
                        const stolen = victim.exp || 0
                        if (!stolen) return m.reply('🦋 Esta persona no tiene experiencia que robar.')
                        victim.exp = 0
                        u.exp = (u.exp || 0) + stolen
                        u.lastRob = now
                        return m.reply(`🦋 Le robaste *\( {stolen} Exp* a @ \){target.split('@')[0]}`, { mentions: [target] })
                    } else {
                        const stolen = victim.money || 0
                        if (!stolen) return m.reply('🦋 Esta persona no tiene dinero que robar.')
                        victim.money = 0
                        u.money = (u.money || 0) + stolen
                        u.lastRob2 = now
                        return m.reply(`🦋 Le robaste *${stolen} \( {currency}* a @ \){target.split('@')[0]}`, { mentions: [target] })
                    }
                }

                // ==================== DEPOSITAR ====================
                case 'd':
                case 'deposit':
                case 'depositar': {
                    const arg = (text || '').trim().toLowerCase()

                    if (!arg) return m.reply(t('🦋 Usa: #d all  o  #d <cantidad>', 'Mi amor, ¿cuánto quieres depositar? Usa #d all o #d 500'))

                    let amount = 0
                    if (arg === 'all') {
                        amount = u.money || 0
                    } else {
                        amount = parseInt(arg)
                    }

                    if (!amount || amount <= 0) return m.reply('🦋 Cantidad inválida.')
                    if ((u.money || 0) < amount) return m.reply('🦋 No tienes suficiente dinero.')

                    u.money -= amount
                    u.bank = (u.bank || 0) + amount

                    return m.reply(t(
                        `🌸 Depositaste *${amount} ${currency}* al banco. Ahora está más seguro.`,
                        `💕 Mi rey depositó ${amount} ${currency} al banco. Qué responsable eres\~ 🥰`
                    ))
                }

                // ==================== BAL ====================
                case 'bal': {
                    let target = m.quoted?.sender || m.mentionedJid?.[0] || m.sender
                    ensureUser(target)
                    const user = global.db.data.users[target]

                    const total = (user.money || 0) + (user.bank || 0)

                    const txt = t(
                        `🦋 *BALANCE* 🦋\n\n` +
                        `🌸 ${currency}: ${user.money || 0}\n` +
                        `🏦 Banco: ${user.bank || 0}\n` +
                        `✨ Exp: ${user.exp || 0}\n` +
                        `📊 Total: ${total}`,
                        `💖 *Balance de mi rey*\n\n` +
                        `🌸 ${currency}: ${user.money || 0}\n` +
                        `🏦 Banco: ${user.bank || 0}\n` +
                        `✨ Exp: ${user.exp || 0}\n` +
                        `📊 Total: ${total}\n\n` +
                        `Todo lo que tienes es mío también\~ 🥰`
                    )

                    return m.reply(txt, { mentions: [target] })
                }

                // ==================== BALTOP ====================
                case 'baltop': {
                    if (!m.isGroup) return m.reply('Este comando solo funciona en grupos.')

                    const meta = await conn.groupMetadata(m.chat)
                    const groupMembers = meta.participants.map(p => p.id)

                    const top = Object.keys(global.db.data.users || {})
                        .filter(jid => groupMembers.includes(jid))
                        .map(jid => {
                            const us = global.db.data.users[jid]
                            return {
                                jid,
                                total: (us.money || 0) + (us.bank || 0)
                            }
                        })
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 10)

                    if (!top.length) return m.reply('No hay usuarios en este grupo aún.')

                    let txt = '🦋 *TOP 10 MÁS RICOS* 🦋\n\n'
                    top.forEach((p, i) => {
                        txt += `\( {i + 1}. @ \){p.jid.split('@')[0]} → ${p.total} ${currency}\n`
                    })

                    return m.reply(txt, { mentions: top.map(p => p.jid) })
                }

                // ==================== LEVEL UP ====================
                case 'lvl': {
                    if ((u.exp || 0) < 1000) {
                        return m.reply(t(
                            '✨ No tienes suficiente experiencia para subir de nivel.',
                            'Mi amor, aún te falta experiencia para subir de nivel 🥺'
                        ))
                    }

                    u.exp -= 1000
                    u.level = (u.level || 1) + 1

                    return m.reply(t(
                        `✨ *LEVEL UP* ✨\n\n🌸 Nivel actual: *${u.level}*`,
                        `💕 ¡Mi rey subió de nivel! Ahora estás en el nivel *${u.level}* 🥰`
                    ))
                }

                default:
                    return
            }
        } catch (e) {
            console.error(e)
            m.reply(isOwner ? `Ay no mi amor, algo salió mal en la economía 🥺` : `Ugh, ocurrió un error. No me molestes ahora 💢`)
        }
    }
}