// Node 24 tiene fetch global nativo, no se necesita importar nada

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
    const defaults = {
        exp: 0, money: 0, bank: 0, level: 1,
        lastDaily: 0, lastCofre: 0, lastMinar: 0,
        lastWork: 0, lastRob: 0, lastRob2: 0, lastCrime: 0
    }
    for (const [k, v] of Object.entries(defaults)) {
        if (db.users[jid][k] === undefined) db.users[jid][k] = v
    }
    return db.users[jid]
}

const getThumbnail = async () => {
    try {
        const url = global.banner || 'https://causas-files.vercel.app/fl/fu5r.jpg'
        const res = await fetch(url)
        const buf = await res.arrayBuffer()
        return Buffer.from(buf)
    } catch { return null }
}

export default {
    command: ['daily', 'cofre', 'minar', 'crime', 'crimen', 'rob', 'rob2',
              'd', 'deposit', 'depositar', 'bal', 'baltop', 'lvl',
              'work', 'trabajar', 'chamba', 'shop', 'tienda'],
    tags: ['economy'],
    desc: 'Sistema completo de economía Nino Nakano',

    async run(m, { conn, text = '', command, isOwner, db }) {
        const cmd = command.toLowerCase()
        const who = m.sender
        const u = ensureUser(db, who)
        const currency = 'Coins'
        const t = (normal, ownerText) => isOwner ? (ownerText || normal) : normal

        // ===== NEWSLETTER + THUMBNAIL FIJO =====
        const sendEco = async (params, extra = {}) => {
            const thumbnail = await getThumbnail()

            let newsletterJid = '0@s.whatsapp.net'
            if (global.rcanal?.includes('/channel/')) {
                newsletterJid = `${global.rcanal.split('/channel/')[1]}@newsletter`
            }

            params.contextInfo = params.contextInfo || {}
            params.contextInfo.isForwarded = true
            params.contextInfo.forwardedNewsletterMessageInfo = {
                newsletterJid,
                serverMessageId: '',
                newsletterName: global.botName || 'Nino Nakano'
            }
            params.contextInfo.externalAdReply = {
                title: `🌸 ${global.botName || 'Nino Nakano'} Economy`,
                body: '💰 Sistema de Economía',
                mediaType: 1,
                mediaUrl: global.rcanal || '',
                sourceUrl: global.rcanal || '',
                thumbnail,
                showAdAttribution: false,
                containsAutoReply: true,
                renderLargerThumbnail: false
            }

            return conn.sendMessage(m.chat, params, extra)
        }

        try {
            switch (cmd) {

                // ===== DAILY / COFRE =====
                case 'daily':
                case 'cofre': {
                    const key = cmd === 'daily' ? 'lastDaily' : 'lastCofre'
                    const cd = toMs(24, 0, 0)
                    const now = Date.now()

                    if (now - (u[key] || 0) < cd) {
                        const rem = (u[key] || 0) + cd - now
                        return sendEco({ text: t(
                            `⏳ Ey, no tan rápido...\nTu ${cmd === 'daily' ? 'recompensa diaria' : 'cofre'} estará lista en *${formatDelta(rem)}* 🕐\n\n_¡La paciencia tiene su recompensa!_ 🌸`,
                            `🥺 Mi rey, aún faltan *${formatDelta(rem)}* para tu ${cmd}...\n¡Pero ya casi! Te espero 💕`
                        )}, { quoted: m })
                    }

                    const amount = randInt(150, 650)
                    u.money = (u.money || 0) + amount
                    u[key] = now

                    const msgs = [
                        `🎉 *¡RECOMPENSA RECLAMADA!*\n\n💰 Encontraste *${amount} ${currency}* escondidos bajo el tatami.\n¡No me preguntes cómo llegaron ahí! 👀`,
                        `🌸 *¡${cmd === 'daily' ? 'DAILY' : 'COFRE'} RECLAMADO!*\n\n✨ El universo decidió darte *${amount} ${currency}* hoy.\n¡Gástalos bien o yo me enojo! 😤💕`,
                        `💎 *¡COINS OBTENIDAS!*\n\nHoy fuiste afortunad@~ Recibiste *${amount} ${currency}*\n¡Vuelve mañana para más! 🦋`
                    ]
                    return sendEco({ text: t(
                        msgs[randInt(0, msgs.length - 1)],
                        `💖 ¡Mi rey reclamó su ${cmd}! Aquí tienes *${amount} ${currency}* 🥰\n_Solo para ti~ nadie más_ 💕`
                    )}, { quoted: m })
                }

                // ===== MINAR =====
                case 'minar': {
                    const cd = toMs(0, 24, 0)
                    const now = Date.now()

                    if (now - (u.lastMinar || 0) < cd) {
                        const rem = (u.lastMinar || 0) + cd - now
                        return sendEco({ text: t(
                            `⛏️ ¡Oye, las minas necesitan descanso!\nVuelve en *${formatDelta(rem)}* para seguir minando 😤`,
                            `🥺 Mi cielo, la mina sigue cargando... faltan *${formatDelta(rem)}* 💕`
                        )}, { quoted: m })
                    }

                    const addExp = randInt(30, 90)
                    const addMoney = randInt(60, 180)
                    u.exp = (u.exp || 0) + addExp
                    u.money = (u.money || 0) + addMoney
                    u.lastMinar = now

                    const minaMsgs = [
                        `⛏️ *¡MINADO EXITOSO!*\n\nEscavaste profundo y encontraste:\n✨ *Exp:* +${addExp}\n💰 *${currency}:* +${addMoney}\n\n_Cuidado con los creepers_ 👀`,
                        `💎 *¡VETA DE ORO!*\n\nTu pico brilló con fuerza hoy:\n✨ *Exp:* +${addExp}\n💰 *${currency}:* +${addMoney}\n\n_Eres todo un minero profesional_ ⛏️`,
                        `🪨 *¡ROCA ROTA!*\n\nEntre piedras y polvo encontraste:\n✨ *Exp:* +${addExp}\n💰 *${currency}:* +${addMoney}`
                    ]
                    return sendEco({ text: t(
                        minaMsgs[randInt(0, minaMsgs.length - 1)],
                        `💖 ¡Mi amor minó con todo! +${addExp} Exp y +${addMoney} ${currency} 🥰`
                    )}, { quoted: m })
                }

                // ===== WORK / TRABAJAR / CHAMBA =====
                case 'work':
                case 'trabajar':
                case 'chamba': {
                    const cd = toMs(0, 30, 0)
                    const now = Date.now()

                    if (now - (u.lastWork || 0) < cd) {
                        const rem = (u.lastWork || 0) + cd - now
                        return sendEco({ text: t(
                            `😴 ¡Necesitas descansar, trabajador!\nPodrás volver en *${formatDelta(rem)}* ☕`,
                            `🥺 Mi rey, aún faltan *${formatDelta(rem)}* para chambear de nuevo 💕`
                        )}, { quoted: m })
                    }

                    let addMoney, msg
                    if (cmd === 'chamba') {
                        addMoney = randInt(8, 35)
                        const chambaMsgs = [
                            `😂 *¡CHAMBA COMPLETADA!*\n\nTrabajaste todo el día cargando ladrillos...\nEl patrón te pagó *${addMoney} ${currency}* y ni las gracias dio 😤\n\n_La vida del chambeador es dura_ 🧱`,
                            `🤣 *¡JORNADA TROLL!*\n\nVendiste chicles en el semáforo y ganaste *${addMoney} ${currency}*\nEl carro de al lado te preguntó si tenías cambio 💀`,
                            `😭 *¡SALARIO MÍNIMO!*\n\nTu jefe es más tacaño que yo en lunes...\nSolo *${addMoney} ${currency}* por 8 horas de trabajo 😤`
                        ]
                        msg = t(chambaMsgs[randInt(0, chambaMsgs.length - 1)],
                            `💖 Mi rey hizo chamba troll~ Te dieron *${addMoney} ${currency}* pero igual te quiero 🥰`)
                    } else {
                        addMoney = randInt(120, 320)
                        const workMsgs = [
                            `💼 *¡TRABAJO COMPLETADO!*\n\nFuiste productivo hoy, te lo reconozco...\nGanaste *${addMoney} ${currency}* con tu esfuerzo 💪\n\n_¡Así se hace!_ 🌟`,
                            `👔 *¡JORNADA EXITOSA!*\n\nTu jefe quedó impresionado (por esta vez)\nRecibiste *${addMoney} ${currency}* de salario 💰`,
                            `🏆 *¡EMPLEADO DEL MES!*\n\nTrabajaste tan bien que hasta te aplaudieron...\nGanaste *${addMoney} ${currency}* hoy 🎉`
                        ]
                        msg = t(workMsgs[randInt(0, workMsgs.length - 1)],
                            `💖 Mi amor trabajó re bien~ Aquí tienes *${addMoney} ${currency}* 🥰`)
                    }

                    const addExp = randInt(15, 50)
                    u.money = (u.money || 0) + addMoney
                    u.exp = (u.exp || 0) + addExp
                    u.lastWork = now

                    return sendEco({ text: msg }, { quoted: m })
                }

                // ===== CRIME =====
                case 'crime':
                case 'crimen': {
                    const cd = toMs(0, 30, 0)
                    const now = Date.now()

                    if (now - (u.lastCrime || 0) < cd) {
                        const rem = (u.lastCrime || 0) + cd - now
                        return sendEco({ text: t(
                            `🚔 ¡Baja el perfil! La policía todavía te busca...\nEspera *${formatDelta(rem)}* antes de volver a actuar 😤`,
                            `🥺 Mi cielo, aún faltan *${formatDelta(rem)}* para otro crimen 💕`
                        )}, { quoted: m })
                    }

                    const gained = randInt(90, 280)
                    u.money = (u.money || 0) + gained
                    u.lastCrime = now

                    const crimeMsgs = [
                        `🦹 *¡CRIMEN EXITOSO!*\n\nRobaste la billetera de un político corrupto...\nObtuviste *${gained} ${currency}* 💀\n\n_Robin Hood orgulloso de ti_ 🏹`,
                        `🕵️ *¡OPERACIÓN EXITOSA!*\n\nHackeaste la cuenta del banco (el pequeño)...\nTransferiste *${gained} ${currency}* a tu bolsillo 💻`,
                        `🎭 *¡GOLPE MAESTRO!*\n\nTe hiciste pasar por el dueño del negocio y cobraste la caja...\n*${gained} ${currency}* sin que nadie notara nada 😈`
                    ]
                    return sendEco({ text: t(
                        crimeMsgs[randInt(0, crimeMsgs.length - 1)],
                        `💖 Mi rey robó *${gained} ${currency}* como todo un profesional 🥰`
                    )}, { quoted: m })
                }

                // ===== ROB / ROB2 =====
                case 'rob':
                case 'rob2': {
                    const now = Date.now()
                    const cdKey = cmd === 'rob' ? 'lastRob' : 'lastRob2'
                    const cd = toMs(1, 0, 0)

                    if (now - (u[cdKey] || 0) < cd) {
                        const rem = (u[cdKey] || 0) + cd - now
                        return sendEco({ text: t(
                            `🚨 ¡Tranquilo ladrón! Tienes que esperar *${formatDelta(rem)}* antes de robar de nuevo 👮`,
                            `🥺 Mi cielo, la víctima aún está llorando... faltan *${formatDelta(rem)}* 💕`
                        )}, { quoted: m })
                    }

                    let target = m.quoted?.sender || m.mentionedJid?.[0]
                    if (!target) return sendEco({ text: t(
                        '🎯 ¿A quién le vas a robar? Menciona a alguien o responde su mensaje 👀',
                        'Mi amor, ¿a quién quieres robar? 🥺'
                    )}, { quoted: m })
                    if (target === who) return sendEco({ text: '🤦 No puedes robarte a ti mismo... eso se llama olvidarse dónde dejaste las cosas 😂' }, { quoted: m })

                    if (m.isGroup) {
                        const meta = await conn.groupMetadata(m.chat)
                        const members = meta.participants.map(p => p.id)
                        if (!members.includes(target)) return sendEco({ text: '❌ Esa persona no está en el grupo, no puedes robarle desde aquí 👀' }, { quoted: m })
                    }

                    ensureUser(db, target)
                    const victim = db.users[target]

                    if (cmd === 'rob') {
                        const stolen = victim.exp || 0
                        if (!stolen) return sendEco({ text: `😂 @${target.split('@')[0]} no tiene ni un punto de experiencia... ¡Pobrecito! 💀`, mentions: [target] }, { quoted: m })
                        victim.exp = 0
                        u.exp = (u.exp || 0) + stolen
                        u.lastRob = now
                        return sendEco({ text: `🥷 *¡ROBO EXITOSO!*\n\nLe robaste *${stolen} Exp* a @${target.split('@')[0]}\n¡Ni lo vio venir! 💀`, mentions: [target] }, { quoted: m })
                    } else {
                        const stolen = victim.money || 0
                        if (!stolen) return sendEco({ text: `😂 @${target.split('@')[0]} está más pelado que yo en viernes... ¡No tiene nada! 💸`, mentions: [target] }, { quoted: m })
                        victim.money = 0
                        u.money = (u.money || 0) + stolen
                        u.lastRob2 = now
                        return sendEco({ text: `💸 *¡ATRACO EXITOSO!*\n\nVaciaste los bolsillos de @${target.split('@')[0]}\nObtuviste *${stolen} ${currency}* 🥷`, mentions: [target] }, { quoted: m })
                    }
                }

                // ===== DEPOSITAR =====
                case 'd':
                case 'deposit':
                case 'depositar': {
                    const arg = (text || '').trim().toLowerCase()
                    if (!arg) return sendEco({ text: t(
                        '🏦 ¿Cuánto quieres depositar?\n\nUsa: *#d all* o *#d <cantidad>*',
                        'Mi amor, ¿cuánto quieres depositar? 🥺'
                    )}, { quoted: m })

                    let amount = arg === 'all' ? (u.money || 0) : parseInt(arg)
                    if (!amount || amount <= 0) return sendEco({ text: '❌ Esa cantidad no es válida, ¿me estás tomando el pelo? 😤' }, { quoted: m })
                    if ((u.money || 0) < amount) return sendEco({ text: `❌ No tienes suficiente... tienes *${u.money} ${currency}* y quieres depositar *${amount}* 💀` }, { quoted: m })

                    u.money -= amount
                    u.bank = (u.bank || 0) + amount

                    return sendEco({ text: t(
                        `🏦 *¡DEPÓSITO EXITOSO!*\n\nGuardaste *${amount} ${currency}* en el banco~\n💰 En mano: ${u.money}\n🏦 En banco: ${u.bank}`,
                        `💖 Mi rey depositó *${amount} ${currency}* al banco. Qué responsable eres~ 🥰`
                    )}, { quoted: m })
                }

                // ===== BAL =====
                case 'bal': {
                    let target = m.quoted?.sender || m.mentionedJid?.[0] || m.sender
                    ensureUser(db, target)
                    const user = db.users[target]
                    const total = (user.money || 0) + (user.bank || 0)
                    const esTuyo = target === who

                    return sendEco({ text: t(
                        `💰 *${esTuyo ? 'TU BALANCE' : `BALANCE DE @${target.split('@')[0]}`}*\n\n` +
                        `💵 En mano: *${user.money || 0} ${currency}*\n` +
                        `🏦 En banco: *${user.bank || 0} ${currency}*\n` +
                        `✨ Experiencia: *${user.exp || 0} XP*\n` +
                        `📊 Total: *${total} ${currency}*`,
                        `💖 *Balance de mi rey*\n\n💵 En mano: *${user.money || 0}*\n🏦 Banco: *${user.bank || 0}*\n✨ Exp: *${user.exp || 0}*\n📊 Total: *${total}*\n\n_Todo lo que tienes es mío también~ 🥰_`
                    ), mentions: [target] }, { quoted: m })
                }

                // ===== BALTOP =====
                case 'baltop': {
                    if (!m.isGroup) return sendEco({ text: '🏆 Este comando solo funciona en grupos, ¡reúne a tu pandilla!' }, { quoted: m })

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

                    if (!top.length) return sendEco({ text: '😅 Nadie tiene coins en este grupo... ¡Todos son pobres!' }, { quoted: m })

                    const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
                    let txt = '🏆 *TOP 10 MÁS RICOS DEL GRUPO* 💰\n\n'
                    top.forEach((p, i) => {
                        txt += `${medallas[i]} @${p.jid.split('@')[0]} → *${p.total} ${currency}*\n`
                    })
                    txt += `\n_¿Tú dónde quedaste?_ 👀`

                    return sendEco({ text: txt, mentions: top.map(p => p.jid) }, { quoted: m })
                }

                // ===== LVL =====
                case 'lvl': {
                    if ((u.exp || 0) < 1000) {
                        return sendEco({ text: t(
                            `📊 Necesitas *1000 XP* para subir de nivel.\nTienes *${u.exp || 0} XP*... te faltan *${1000 - (u.exp || 0)} XP* 📈\n\n_¡Sigue minando y trabajando!_ ⛏️`,
                            `🥺 Mi amor, aún te falta experiencia para subir de nivel. Tienes ${u.exp || 0}/1000 XP 💕`
                        )}, { quoted: m })
                    }
                    u.exp -= 1000
                    u.level = (u.level || 1) + 1

                    return sendEco({ text: t(
                        `🎉 *¡LEVEL UP!* 🎉\n\n⭐ Subiste al nivel *${u.level}*\n✨ XP restante: ${u.exp}\n\n_¡Eres cada vez más poderoso!_ 💪`,
                        `💖 *¡Mi rey subió de nivel!* 🎉\nAhora estás en el nivel *${u.level}* 🥰`
                    )}, { quoted: m })
                }

                // ===== SHOP / TIENDA =====
                case 'shop':
                case 'tienda': {
                    if (!text) {
                        return sendEco({ text: t(
                            `🛒 *TIENDA DE NINO* 🛒\n\n` +
                            `1️⃣ ✨ *Exp Booster* (+1500 Exp) → 600 ${currency}\n` +
                            `2️⃣ 💰 *Money Pack* (+800 ${currency}) → 400 ${currency}\n\n` +
                            `_Usa *#shop buy 1* o *#shop buy 2*_\n` +
                            `💵 Tu saldo: *${u.money || 0} ${currency}*`,
                            `💖 Tienda especial para mi rey~ ¿Qué quieres comprar hoy? 🥰\n\n1️⃣ Exp Booster → 600\n2️⃣ Money Pack → 400\n\n💵 Tienes: *${u.money || 0}*`
                        )}, { quoted: m })
                    }

                    const arg = text.toLowerCase()
                    if (arg.includes('buy 1') || arg === '1') {
                        if ((u.money || 0) < 600) return sendEco({ text: `❌ Te faltan coins para eso...\nNecesitas *600* y tienes *${u.money || 0}* 💸` }, { quoted: m })
                        u.money -= 600
                        u.exp = (u.exp || 0) + 1500
                        return sendEco({ text: t(
                            `✨ *¡EXP BOOSTER ACTIVADO!*\n\n+1500