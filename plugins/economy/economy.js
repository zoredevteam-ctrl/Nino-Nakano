const toMs = (h = 0, m = 0, s = 0) => ((h * 3600) + (m * 60) + s) * 1000
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

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

const ensureUser = (db, jid) => {
    if (!db.users) db.users = {}
    if (!db.users[jid]) db.users[jid] = {}

    // Merge: solo agrega los campos que falten, sin pisar los del handler
    const defaults = {
        exp: 0,
        money: 0,
        bank: 0,
        level: 1,
        lastDaily: 0,
        lastCofre: 0,
        lastMinar: 0,
        lastWork: 0,
        lastRob: 0,
        lastRob2: 0,
        lastCrime: 0
    }
    for (const [k, v] of Object.entries(defaults)) {
        if (db.users[jid][k] === undefined) db.users[jid][k] = v
    }
    return db.users[jid]
}

const getThumbnailBuffer = async (url) => {
    try {
        const res = await fetch(url)
        return await res.buffer()
    } catch {
        return null
    }
}

export default {
    command: ['daily', 'cofre', 'minar', 'crime', 'crimen', 'rob', 'rob2', 'd', 'deposit', 'depositar', 'bal', 'baltop', 'lvl', 'work', 'trabajar', 'chamba', 'shop', 'tienda'],
    tags: ['economy'],
    desc: 'Sistema completo de economía Nino Nakano',

    async run(m, { conn, text = '', command, isOwner, db }) {
        const cmd = command.toLowerCase()
        const who = m.sender
        const u = ensureUser(db, who)
        const currency = 'Coins'
        const t = (normal, ownerText) => isOwner ? (ownerText || normal) : normal

        // ===================== NEWSLETTER CONTEXT =====================
        const sendAsChannel = async (params, extra = {}) => {
            const bannerUrl = global.banner || 'https://qu.ax/zRNgk.jpg'
            const thumbnail = await getThumbnailBuffer(bannerUrl).catch(() => null)

            let newsletterJid = '0@s.whatsapp.net'
            if (global.rcanal && global.rcanal.includes('/channel/')) {
                const code = global.rcanal.split('/channel/')[1]
                newsletterJid = `${code}@newsletter`
            }

            const newsletterName = global.botName || 'Nino Nakano'

            params.contextInfo = params.contextInfo || {}
            params.contextInfo.isForwarded = true
            params.contextInfo.forwardedNewsletterMessageInfo = {
                newsletterJid,
                serverMessageId: '',
                newsletterName
            }
            params.contextInfo.externalAdReply = {
                title: newsletterName,
                body: 'Nino Nakano Economy 💕',
                mediaType: 1,
                mediaUrl: global.rcanal || '',
                sourceUrl: global.rcanal || '',
                thumbnail,
                showAdAttribution: false,
                containsAutoReply: true,
                renderLargerThumbnail: true
            }

            return conn.sendMessage(m.chat, params, extra)
        }

        try {
            switch (cmd) {

                // DAILY / COFRE
                case 'daily':
                case 'cofre': {
                    const key = cmd === 'daily' ? 'lastDaily' : 'lastCofre'
                    const cd = toMs(24, 0, 0)
                    const now = Date.now()

                    if (now - (u[key] || 0) < cd) {
                        const rem = (u[key] || 0) + cd - now
                        return sendAsChannel({ text: t(`💕 Vuelve en *${formatDelta(rem)}* para reclamar tu recompensa.`, `Mi amor, aún faltan *${formatDelta(rem)}* para tu daily 🥺`) }, { quoted: m })
                    }

                    const amount = randInt(150, 650)
                    u.money = (u.money || 0) + amount
                    u[key] = now

                    return sendAsChannel({ text: t(`💕 Reclamaste tu *${cmd === 'daily' ? 'recompensa diaria' : 'cofre'}*.\n\n🌸 *${currency}:* +${amount}`, `💖 Mi rey, aquí tienes tu recompensa diaria\~ ${amount} ${currency} 🥰`) }, { quoted: m })
                }

                // MINAR
                case 'minar': {
                    const cd = toMs(0, 24, 0)
                    const now = Date.now()

                    if (now - (u.lastMinar || 0) < cd) {
                        const rem = (u.lastMinar || 0) + cd - now
                        return sendAsChannel({ text: t(`💕 Espera *${formatDelta(rem)}* para minar otra vez.`, `Mi cielo, faltan *${formatDelta(rem)}* para minar 🥺`) }, { quoted: m })
                    }

                    const addExp = randInt(30, 90)
                    const addMoney = randInt(60, 180)
                    u.exp = (u.exp || 0) + addExp
                    u.money = (u.money || 0) + addMoney
                    u.lastMinar = now

                    return sendAsChannel({ text: t(`💕 Estuviste minando...\n\n✨ *Exp:* +${addExp}\n🌸 *${currency}:* +${addMoney}`, `💖 Mi amor estuvo trabajando duro\~ Ganaste ${addExp} Exp y ${addMoney} ${currency} 🥰`) }, { quoted: m })
                }

                // WORK / TRABAJAR / CHAMBA (TROLL)
                case 'work':
                case 'trabajar':
                case 'chamba': {
                    const cd = toMs(0, 30, 0)
                    const now = Date.now()

                    if (now - (u.lastWork || 0) < cd) {
                        const rem = (u.lastWork || 0) + cd - now
                        return sendAsChannel({ text: t(`💕 Espera *${formatDelta(rem)}* para trabajar de nuevo.`, `Mi rey, aún faltan *${formatDelta(rem)}* para chambear 🥺`) }, { quoted: m })
                    }

                    let addMoney, msg
                    if (cmd === 'chamba') {
                        addMoney = randInt(8, 35)
                        msg = t(
                            `😂 Chambaste en la esquina y el jefe era tacaño... solo ganaste *${addMoney} ${currency}*`,
                            `💖 Mi rey hizo chamba troll\~ Te dieron solo ${addMoney} ${currency} pero igual te quiero 🥰`
                        )
                    } else {
                        addMoney = randInt(120, 320)
                        msg = t(
                            `💕 Trabajaste un rato y ganaste *${addMoney} ${currency}*`,
                            `💖 Mi amor trabajó muy bien\~ Aquí tienes ${addMoney} ${currency} solo para ti 🥰`
                        )
                    }

                    const addExp = randInt(15, 50)
                    u.money = (u.money || 0) + addMoney
                    u.exp = (u.exp || 0) + addExp
                    u.lastWork = now

                    return sendAsChannel({ text: msg }, { quoted: m })
                }

                // CRIME / CRIMEN ✅ FIX: ahora tiene cooldown de 30 minutos
                case 'crime':
                case 'crimen': {
                    const cd = toMs(0, 30, 0)
                    const now = Date.now()

                    if (now - (u.lastCrime || 0) < cd) {
                        const rem = (u.lastCrime || 0) + cd - now
                        return sendAsChannel({ text: t(`💕 Espera *${formatDelta(rem)}* para cometer otro crimen.`, `Mi cielo, aún faltan *${formatDelta(rem)}* para otro crimen 🥺`) }, { quoted: m })
                    }

                    const gained = randInt(90, 280)
                    u.money = (u.money || 0) + gained
                    u.lastCrime = now

                    return sendAsChannel({ text: t(`💕 Cometiste un pequeño crimen y obtuviste *${gained} ${currency}*.`, `💖 Mi rey, robaste ${gained} ${currency} como todo un profesional 🥰`) }, { quoted: m })
                }

                // ROB / ROB2 ✅ FIX: valida que el target esté en el grupo
                case 'rob':
                case 'rob2': {
                    const now = Date.now()
                    const cdKey = cmd === 'rob' ? 'lastRob' : 'lastRob2'
                    const cd = toMs(1, 0, 0)

                    if (now - (u[cdKey] || 0) < cd) {
                        const rem = (u[cdKey] || 0) + cd - now
                        return sendAsChannel({ text: t(`💕 Espera *${formatDelta(rem)}* para robar de nuevo.`, `Mi cielo, faltan *${formatDelta(rem)}* para robar 🥺`) }, { quoted: m })
                    }

                    let target = m.quoted?.sender || m.mentionedJid?.[0]
                    if (!target) return sendAsChannel({ text: t('💕 Menciona o responde a quien quieres robar.', 'Mi amor, ¿a quién quieres robar? 🥺') }, { quoted: m })
                    if (target === who) return sendAsChannel({ text: '💕 No puedes robarte a ti mismo.' }, { quoted: m })

                    // ✅ FIX: validar que el target esté en el grupo
                    if (m.isGroup) {
                        const meta = await conn.groupMetadata(m.chat)
                        const members = meta.participants.map(p => p.id)
                        if (!members.includes(target)) return sendAsChannel({ text: '💕 Esa persona no está en el grupo.' }, { quoted: m })
                    }

                    ensureUser(db, target)
                    const victim = db.users[target]

                    if (cmd === 'rob') {
                        const stolen = victim.exp || 0
                        if (!stolen) return sendAsChannel({ text: '💕 Esta persona no tiene experiencia.' }, { quoted: m })
                        victim.exp = 0
                        u.exp = (u.exp || 0) + stolen
                        u.lastRob = now
                        return sendAsChannel({ text: `💕 Le robaste *${stolen} Exp* a @${target.split('@')[0]}`, mentions: [target] }, { quoted: m })
                    } else {
                        const stolen = victim.money || 0
                        if (!stolen) return sendAsChannel({ text: '💕 Esta persona no tiene dinero.' }, { quoted: m })
                        victim.money = 0
                        u.money = (u.money || 0) + stolen
                        u.lastRob2 = now
                        return sendAsChannel({ text: `💕 Le robaste *${stolen} ${currency}* a @${target.split('@')[0]}`, mentions: [target] }, { quoted: m })
                    }
                }

                // DEPOSITAR
                case 'd':
                case 'deposit':
                case 'depositar': {
                    const arg = (text || '').trim().toLowerCase()
                    if (!arg) return sendAsChannel({ text: t('💕 Usa: #d all  o  #d <cantidad>', 'Mi amor, ¿cuánto quieres depositar?') }, { quoted: m })

                    let amount = arg === 'all' ? (u.money || 0) : parseInt(arg)
                    if (!amount || amount <= 0) return sendAsChannel({ text: '💕 Cantidad inválida.' }, { quoted: m })
                    if ((u.money || 0) < amount) return sendAsChannel({ text: '💕 No tienes suficiente dinero.' }, { quoted: m })

                    u.money -= amount
                    u.bank = (u.bank || 0) + amount

                    return sendAsChannel({ text: t(`💕 Depositaste *${amount} ${currency}* al banco.`, `💖 Mi rey depositó ${amount} ${currency} al banco. Qué responsable eres\~ 🥰`) }, { quoted: m })
                }

                // BAL
                case 'bal': {
                    let target = m.quoted?.sender || m.mentionedJid?.[0] || m.sender
                    ensureUser(db, target)
                    const user = db.users[target]
                    const total = (user.money || 0) + (user.bank || 0)

                    const txt = t(
                        `💕 *BALANCE* 💕\n\n🌸 ${currency}: ${user.money || 0}\n🏦 Banco: ${user.bank || 0}\n✨ Exp: ${user.exp || 0}\n📊 Total: ${total}`,
                        `💖 *Balance de mi rey*\n\n🌸 ${currency}: ${user.money || 0}\n🏦 Banco: ${user.bank || 0}\n✨ Exp: ${user.exp || 0}\n📊 Total: ${total}\n\nTodo lo que tienes es mío también\~ 🥰`
                    )

                    return sendAsChannel({ text: txt, mentions: [target] }, { quoted: m })
                }

                // BALTOP
                case 'baltop': {
                    if (!m.isGroup) return sendAsChannel({ text: '💕 Este comando solo funciona en grupos.' }, { quoted: m })

                    const meta = await conn.groupMetadata(m.chat)
                    const members = meta.participants.map(p => p.id)

                    const top = Object.keys(db.users || {})
                        .filter(jid => members.includes(jid))
                        .map(jid => {
                            const us = db.users[jid]
                            return { jid, total: (us.money || 0) + (us.bank || 0) }
                        })
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 10)

                    if (!top.length) return sendAsChannel({ text: '💕 No hay usuarios en este grupo.' }, { quoted: m })

                    let txt = '💕 *TOP 10 MÁS RICOS* 💕\n\n'
                    top.forEach((p, i) => txt += `${i + 1}. @${p.jid.split('@')[0]} → ${p.total} ${currency}\n`)

                    return sendAsChannel({ text: txt, mentions: top.map(p => p.jid) }, { quoted: m })
                }

                // LVL
                case 'lvl': {
                    if ((u.exp || 0) < 1000) {
                        return sendAsChannel({ text: t('💕 No tienes suficiente experiencia para subir de nivel.', 'Mi amor, aún te falta experiencia para subir de nivel 🥺') }, { quoted: m })
                    }
                    u.exp -= 1000
                    u.level = (u.level || 1) + 1

                    return sendAsChannel({ text: t(`💕 *LEVEL UP* 💕\n\n🌸 Nivel actual: *${u.level}*`, `💖 ¡Mi rey subió de nivel! Ahora estás en el nivel *${u.level}* 🥰`) }, { quoted: m })
                }

                // SHOP / TIENDA ✅ FIX: buy 2 ya no duplica el dinero
                case 'shop':
                case 'tienda': {
                    if (!text) {
                        const menu = `🛒 *TIENDA DE NINO* 🛒\n\n1. Exp Booster (+1500 Exp) → 600 ${currency}\n2. Money Pack (+800 ${currency}) → 400 ${currency}\n\nUsa: *#shop buy 1* o *#shop buy 2*`
                        return sendAsChannel({ text: t(menu, `💖 Tienda especial para mi rey\~ ¿Qué quieres comprar hoy? 🥰\n\n${menu}`) }, { quoted: m })
                    }

                    const arg = text.toLowerCase()
                    if (arg.includes('buy 1') || arg.includes('1')) {
                        if ((u.money || 0) < 600) return sendAsChannel({ text: '💕 No tienes suficientes coins.' }, { quoted: m })
                        u.money -= 600
                        u.exp = (u.exp || 0) + 1500
                        return sendAsChannel({ text: t(`💕 Compraste *Exp Booster* → +1500 Exp`, `💖 Mi amor compró Exp Booster\~ +1500 Exp solo para ti 🥰`) }, { quoted: m })
                    }
                    if (arg.includes('buy 2') || arg.includes('2')) {
                        if ((u.money || 0) < 400) return sendAsChannel({ text: '💕 No tienes suficientes coins.' }, { quoted: m })
                        // ✅ FIX: antes hacía u.money -= 400 y luego u.money = (u.money || 0) + 800
                        // lo que resultaba en una ganancia neta de +800 en vez de +400
                        u.money = (u.money || 0) + 400  // ganancia neta real: +800 - 400 = +400
                        return sendAsChannel({ text: t(`💕 Compraste *Money Pack* → +800 ${currency}`, `💖 Mi rey compró Money Pack\~ +800 ${currency} 🥰`) }, { quoted: m })
                    }
                    return sendAsChannel({ text: '💕 Usa *#shop* para ver los artículos.' }, { quoted: m })
                }

                default:
                    return
            }
        } catch (e) {
            console.error(e)
            return sendAsChannel({ text: t('💕 Ocurrió un pequeño error.', 'Ay no mi amor, algo salió mal en la economía 🥺') }, { quoted: m })
        }
    }
}
