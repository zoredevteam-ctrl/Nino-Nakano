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
        wins: 0, victories: 0,
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
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const buildContext = (thumbnail) => {
    return {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
            serverMessageId: '',
            newsletterName: global.botName || 'Nino Nakano'
        },
        externalAdReply: {
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
    }
}

// ─── IMPUESTO ─────────────────────────────────────────────────────────────────
// 10% de impuesto en donaciones entre usuarios normales
const TAX_RATE   = 0.10
const TAX_PCT    = Math.round(TAX_RATE * 100)

const applyTax = (amount) => {
    const tax = Math.floor(amount * TAX_RATE)
    const net  = amount - tax
    return { net, tax }
}

export default {
    command: [
        'daily', 'cofre', 'minar', 'crime', 'crimen', 'rob', 'rob2',
        'd', 'deposit', 'depositar', 'bal', 'baltop', 'lvl',
        'work', 'trabajar', 'chamba', 'shop', 'tienda',
        // ── NUEVOS ──
        'donar', 'donate',          // usuario → usuario (con impuesto)
        'give', 'dar',              // owner → cualquiera (sin descuento)
        'setcoins', 'setexp',       // owner: setear valor exacto
        'setvic', 'addvic',         // owner: victorias
        'addexp', 'addcoins'        // owner: sumar directo
    ],
    tags: ['economy'],
    desc: 'Sistema completo de economía Nino Nakano',

    async run(m, { conn, text, command, isOwner, db }) {
        const cmd = command.toLowerCase()
        const who = m.sender
        const u   = ensureUser(db, who)
        const currency = 'Coins'
        const txt = text || ''

        const sendEco = async (msgText, mentions) => {
            const thumbnail = await getThumbnail()
            const params = { text: msgText, contextInfo: buildContext(thumbnail) }
            if (mentions) params.mentions = mentions
            return conn.sendMessage(m.chat, params, { quoted: m })
        }

        // ════════════════════════════════════════════════════════════════
        // DONAR — usuario a usuario, con impuesto del 10%
        // Uso: #donar <cantidad> @usuario
        // ════════════════════════════════════════════════════════════════
        if (cmd === 'donar' || cmd === 'donate') {
            const target = m.quoted?.sender || m.mentionedJid?.[0]
            const amount = parseInt(txt.replace(/@\S+/g, '').trim())

            if (!target)
                return sendEco('🎁 Menciona a alguien o responde su mensaje para donar 👀')
            if (target === who)
                return sendEco('😂 No puedes donarte a ti mismo bro 💀')
            if (!amount || amount <= 0)
                return sendEco('❌ Indica una cantidad válida\n_Ejemplo: *#donar 200 @usuario*_')
            if ((u.money || 0) < amount)
                return sendEco(`❌ No tienes suficiente\n💵 Tienes: *${u.money || 0} ${currency}*`)

            ensureUser(db, target)
            const victim = db.users[target]
            const { net, tax } = applyTax(amount)

            u.money      -= amount
            victim.money  = (victim.money || 0) + net

            return sendEco(
                `🎁 *¡DONACIÓN REALIZADA!*\n\n` +
                `👤 De: @${who.split('@')[0]}\n` +
                `👤 Para: @${target.split('@')[0]}\n\n` +
                `💸 Enviado: *${amount} ${currency}*\n` +
                `🏛️ Impuesto (${TAX_PCT}%): *-${tax} ${currency}*\n` +
                `✅ Recibido: *${net} ${currency}*\n\n` +
                `_El gobierno siempre se lleva su parte_ 😤`,
                [who, target]
            )
        }

        // ════════════════════════════════════════════════════════════════
        // GIVE — solo owner, da sin descuento, puede darse a sí mismo
        // Uso: #give <cantidad> @usuario  |  #give exp 500 @usuario
        // ════════════════════════════════════════════════════════════════
        if (cmd === 'give' || cmd === 'dar') {
            if (!isOwner)
                return sendEco('👑 Solo el owner puede usar este comando 😤')

            const target = m.quoted?.sender || m.mentionedJid?.[0] || who
            const parts  = txt.replace(/@\S+/g, '').trim().split(/\s+/)

            // Detectar si es: #give exp 500 o #give vic 10 o #give 500
            let tipo   = 'coins'
            let amount = 0

            if (['exp', 'xp', 'experiencia'].includes(parts[0]?.toLowerCase())) {
                tipo   = 'exp'
                amount = parseInt(parts[1])
            } else if (['vic', 'victorias', 'wins'].includes(parts[0]?.toLowerCase())) {
                tipo   = 'vic'
                amount = parseInt(parts[1])
            } else {
                amount = parseInt(parts[0])
            }

            if (!amount || amount <= 0)
                return sendEco(
                    '👑 *USO DEL GIVE:*\n\n' +
                    '› *#give 500 @usuario* — dar coins\n' +
                    '› *#give exp 200 @usuario* — dar exp\n' +
                    '› *#give vic 10 @usuario* — dar victorias\n\n' +
                    '_Sin impuesto, sin límite, sin descuento_ 👑'
                )

            ensureUser(db, target)
            const recv = db.users[target]
            const esTuyo = target === who

            if (tipo === 'exp') {
                recv.exp = (recv.exp || 0) + amount
                return sendEco(
                    `✨ *¡EXP OTORGADA!*\n\n` +
                    `👤 Para: @${target.split('@')[0]}\n` +
                    `✨ +*${amount} Exp*\n` +
                    `📊 Total Exp: *${recv.exp}*\n\n` +
                    (esTuyo ? '_Qué generoso contigo mismo~ 😏_' : '_El owner ha hablado 👑_'),
                    [target]
                )
            }

            if (tipo === 'vic') {
                recv.wins      = (recv.wins      || 0) + amount
                recv.victories = (recv.victories || 0) + amount
                return sendEco(
                    `🏆 *¡VICTORIAS OTORGADAS!*\n\n` +
                    `👤 Para: @${target.split('@')[0]}\n` +
                    `🏆 +*${amount} Victorias*\n` +
                    `📊 Total: *${recv.victories}*\n\n` +
                    (esTuyo ? '_Nadie te puede quitar eso~ 😏_' : '_El owner ha hablado 👑_'),
                    [target]
                )
            }

            // Coins por defecto
            recv.money = (recv.money || 0) + amount
            return sendEco(
                `💰 *¡COINS OTORGADAS!*\n\n` +
                `👤 Para: @${target.split('@')[0]}\n` +
                `💰 +*${amount} ${currency}*\n` +
                `💵 Total en mano: *${recv.money}*\n\n` +
                (esTuyo ? '_Te diste un regalito~ 👑_' : '_Directo del owner, sin impuesto_ 🦋_'),
                [target]
            )
        }

        // ════════════════════════════════════════════════════════════════
        // SETCOINS / SETEXP / SETVIC — owner: setear valor exacto
        // ════════════════════════════════════════════════════════════════
        if (['setcoins', 'setexp', 'setvic', 'addvic', 'addexp', 'addcoins'].includes(cmd)) {
            if (!isOwner)
                return sendEco('👑 Solo el owner puede usar este comando 😤')

            const target = m.quoted?.sender || m.mentionedJid?.[0] || who
            const amount = parseInt(txt.replace(/@\S+/g, '').trim())

            if (isNaN(amount))
                return sendEco(`❌ Indica un número válido\n_Ejemplo: *#${cmd} 500 @usuario*_`)

            ensureUser(db, target)
            const recv = db.users[target]

            if (cmd === 'setcoins') {
                recv.money = amount
                return sendEco(`💰 Coins de @${target.split('@')[0]} seteadas a *${amount}* 👑`, [target])
            }
            if (cmd === 'addcoins') {
                recv.money = (recv.money || 0) + amount
                return sendEco(`💰 +${amount} Coins a @${target.split('@')[0]} → Total: *${recv.money}* 👑`, [target])
            }
            if (cmd === 'setexp') {
                recv.exp = amount
                return sendEco(`✨ Exp de @${target.split('@')[0]} seteada a *${amount}* 👑`, [target])
            }
            if (cmd === 'addexp') {
                recv.exp = (recv.exp || 0) + amount
                return sendEco(`✨ +${amount} Exp a @${target.split('@')[0]} → Total: *${recv.exp}* 👑`, [target])
            }
            if (cmd === 'setvic') {
                recv.wins = amount
                recv.victories = amount
                return sendEco(`🏆 Victorias de @${target.split('@')[0]} seteadas a *${amount}* 👑`, [target])
            }
            if (cmd === 'addvic') {
                recv.wins      = (recv.wins      || 0) + amount
                recv.victories = (recv.victories || 0) + amount
                return sendEco(`🏆 +${amount} victorias a @${target.split('@')[0]} → Total: *${recv.victories}* 👑`, [target])
            }
        }

        // ════════════════════════════════════════════════════════════════
        // COMANDOS ORIGINALES (sin cambios)
        // ════════════════════════════════════════════════════════════════

        const t = (normal, ownerText) => isOwner ? (ownerText || normal) : normal

        if (cmd === 'daily' || cmd === 'cofre') {
            const key = cmd === 'daily' ? 'lastDaily' : 'lastCofre'
            const cd = toMs(24, 0, 0)
            const now = Date.now()
            if (now - (u[key] || 0) < cd) {
                const rem = (u[key] || 0) + cd - now
                return sendEco(t(
                    `⏳ Tu ${cmd === 'daily' ? 'recompensa diaria' : 'cofre'} estará lista en *${formatDelta(rem)}* 🕐\n\n_¡La paciencia tiene su recompensa!_ 🌸`,
                    `🥺 Mi rey, aún faltan *${formatDelta(rem)}* para tu ${cmd}... ¡Pero ya casi! 💕`
                ))
            }
            const amount = randInt(150, 650)
            u.money = (u.money || 0) + amount
            u[key] = now
            const msgs = [
                `🎉 *¡RECOMPENSA RECLAMADA!*\n\n💰 Encontraste *${amount} ${currency}* escondidos bajo el tatami.\n¡No me preguntes cómo llegaron ahí! 👀`,
                `🌸 *¡${cmd === 'daily' ? 'DAILY' : 'COFRE'} RECLAMADO!*\n\nEl universo decidió darte *${amount} ${currency}* hoy.\n¡Gástalos bien o yo me enojo! 😤💕`,
                `💎 *¡COINS OBTENIDAS!*\n\nHoy fuiste afortunad@~ Recibiste *${amount} ${currency}*\n¡Vuelve mañana para más! 🦋`
            ]
            return sendEco(t(msgs[randInt(0, 2)], `💖 ¡Mi rey reclamó su ${cmd}! Aquí tienes *${amount} ${currency}* 🥰`))
        }

        if (cmd === 'minar') {
            const cd = toMs(0, 24, 0)
            const now = Date.now()
            if (now - (u.lastMinar || 0) < cd) {
                const rem = (u.lastMinar || 0) + cd - now
                return sendEco(t(
                    `⛏️ ¡Las minas necesitan descanso!\nVuelve en *${formatDelta(rem)}* para seguir minando 😤`,
                    `🥺 Mi cielo, la mina sigue cargando... faltan *${formatDelta(rem)}* 💕`
                ))
            }
            const addExp = randInt(30, 90)
            const addMoney = randInt(60, 180)
            u.exp = (u.exp || 0) + addExp
            u.money = (u.money || 0) + addMoney
            u.lastMinar = now
            const msgs = [
                `⛏️ *¡MINADO EXITOSO!*\n\nEscavaste profundo y encontraste:\n✨ *Exp:* +${addExp}\n💰 *${currency}:* +${addMoney}\n\n_Cuidado con los creepers_ 👀`,
                `💎 *¡VETA DE ORO!*\n\nTu pico brilló con fuerza hoy:\n✨ *Exp:* +${addExp}\n💰 *${currency}:* +${addMoney}\n\n_Eres todo un minero profesional_ ⛏️`,
                `🪨 *¡ROCA ROTA!*\n\nEntre piedras y polvo encontraste:\n✨ *Exp:* +${addExp}\n💰 *${currency}:* +${addMoney}`
            ]
            return sendEco(t(msgs[randInt(0, 2)], `💖 ¡Mi amor minó con todo! +${addExp} Exp y +${addMoney} ${currency} 🥰`))
        }

        if (cmd === 'work' || cmd === 'trabajar' || cmd === 'chamba') {
            const cd = toMs(0, 30, 0)
            const now = Date.now()
            if (now - (u.lastWork || 0) < cd) {
                const rem = (u.lastWork || 0) + cd - now
                return sendEco(t(
                    `😴 ¡Necesitas descansar, trabajador!\nPodrás volver en *${formatDelta(rem)}* ☕`,
                    `🥺 Mi rey, aún faltan *${formatDelta(rem)}* para chambear de nuevo 💕`
                ))
            }
            let addMoney, msg
            if (cmd === 'chamba') {
                addMoney = randInt(8, 35)
                const msgs = [
                    `😂 *¡CHAMBA COMPLETADA!*\n\nTrabajaste todo el día cargando ladrillos...\nEl patrón te pagó *${addMoney} ${currency}* y ni las gracias dio 😤`,
                    `🤣 *¡JORNADA TROLL!*\n\nVendiste chicles en el semáforo y ganaste *${addMoney} ${currency}*\nEl carro de al lado te preguntó si tenías cambio 💀`,
                    `😭 *¡SALARIO MÍNIMO!*\n\nTu jefe es más tacaño que yo en lunes...\nSolo *${addMoney} ${currency}* por 8 horas de trabajo 😤`
                ]
                msg = t(msgs[randInt(0, 2)], `💖 Mi rey hizo chamba troll~ Te dieron *${addMoney} ${currency}* pero igual te quiero 🥰`)
            } else {
                addMoney = randInt(120, 320)
                const msgs = [
                    `💼 *¡TRABAJO COMPLETADO!*\n\nFuiste productivo hoy, te lo reconozco...\nGanaste *${addMoney} ${currency}* con tu esfuerzo 💪`,
                    `👔 *¡JORNADA EXITOSA!*\n\nTu jefe quedó impresionado (por esta vez)\nRecibiste *${addMoney} ${currency}* de salario 💰`,
                    `🏆 *¡EMPLEADO DEL MES!*\n\nTrabajaste tan bien que hasta te aplaudieron...\nGanaste *${addMoney} ${currency}* hoy 🎉`
                ]
                msg = t(msgs[randInt(0, 2)], `💖 Mi amor trabajó re bien~ Aquí tienes *${addMoney} ${currency}* 🥰`)
            }
            const addExp = randInt(15, 50)
            u.money = (u.money || 0) + addMoney
            u.exp = (u.exp || 0) + addExp
            u.lastWork = now
            return sendEco(msg)
        }

        if (cmd === 'crime' || cmd === 'crimen') {
            const cd = toMs(0, 30, 0)
            const now = Date.now()
            if (now - (u.lastCrime || 0) < cd) {
                const rem = (u.lastCrime || 0) + cd - now
                return sendEco(t(
                    `🚔 ¡Baja el perfil! La policía todavía te busca...\nEspera *${formatDelta(rem)}* antes de actuar 😤`,
                    `🥺 Mi cielo, aún faltan *${formatDelta(rem)}* para otro crimen 💕`
                ))
            }
            const gained = randInt(90, 280)
            u.money = (u.money || 0) + gained
            u.lastCrime = now
            const msgs = [
                `🦹 *¡CRIMEN EXITOSO!*\n\nRobaste la billetera de un político corrupto...\nObtuviste *${gained} ${currency}* 💀\n\n_Robin Hood orgulloso de ti_ 🏹`,
                `🕵️ *¡OPERACIÓN EXITOSA!*\n\nHackeaste la cuenta del banco (el pequeño)...\nTransferiste *${gained} ${currency}* a tu bolsillo 💻`,
                `🎭 *¡GOLPE MAESTRO!*\n\nTe hiciste pasar por el dueño y cobraste la caja...\n*${gained} ${currency}* sin que nadie notara nada 😈`
            ]
            return sendEco(t(msgs[randInt(0, 2)], `💖 Mi rey robó *${gained} ${currency}* como todo un profesional 🥰`))
        }

        if (cmd === 'rob' || cmd === 'rob2') {
            const cdKey = cmd === 'rob' ? 'lastRob' : 'lastRob2'
            const cd = toMs(1, 0, 0)
            const now = Date.now()
            if (now - (u[cdKey] || 0) < cd) {
                const rem = (u[cdKey] || 0) + cd - now
                return sendEco(t(
                    `🚨 ¡Tranquilo ladrón! Espera *${formatDelta(rem)}* antes de robar de nuevo 👮`,
                    `🥺 Mi cielo, la víctima aún está llorando... faltan *${formatDelta(rem)}* 💕`
                ))
            }
            const target = m.quoted?.sender || m.mentionedJid?.[0]
            if (!target) return sendEco(t('🎯 ¿A quién le vas a robar? Menciona a alguien o responde su mensaje 👀', 'Mi amor, ¿a quién quieres robar? 🥺'))
            if (target === who) return sendEco('🤦 No puedes robarte a ti mismo... eso se llama olvidarse dónde dejaste las cosas 😂')
            if (m.isGroup) {
                const meta = await conn.groupMetadata(m.chat)
                const members = meta.participants.map(p => p.id)
                if (!members.includes(target)) return sendEco('❌ Esa persona no está en el grupo 👀')
            }
            ensureUser(db, target)
            const victim = db.users[target]
            if (cmd === 'rob') {
                const stolen = victim.exp || 0
                if (!stolen) return sendEco(`😂 @${target.split('@')[0]} no tiene ni un punto de experiencia... ¡Pobrecito! 💀`, [target])
                victim.exp = 0
                u.exp = (u.exp || 0) + stolen
                u.lastRob = now
                return sendEco(`🥷 *¡ROBO EXITOSO!*\n\nLe robaste *${stolen} Exp* a @${target.split('@')[0]}\n¡Ni lo vio venir! 💀`, [target])
            } else {
                const stolen = victim.money || 0
                if (!stolen) return sendEco(`😂 @${target.split('@')[0]} está más pelado que yo en viernes... ¡No tiene nada! 💸`, [target])
                victim.money = 0
                u.money = (u.money || 0) + stolen
                u.lastRob2 = now
                return sendEco(`💸 *¡ATRACO EXITOSO!*\n\nVaciaste los bolsillos de @${target.split('@')[0]}\nObtuviste *${stolen} ${currency}* 🥷`, [target])
            }
        }

        if (cmd === 'd' || cmd === 'deposit' || cmd === 'depositar') {
            const arg = txt.trim().toLowerCase()
            if (!arg) return sendEco(t('🏦 Usa: *#d all* o *#d <cantidad>*', 'Mi amor, ¿cuánto quieres depositar? 🥺'))
            let amount = arg === 'all' ? (u.money || 0) : parseInt(arg)
            if (!amount || amount <= 0) return sendEco('❌ Esa cantidad no es válida 😤')
            if ((u.money || 0) < amount) return sendEco(`❌ No tienes suficiente... tienes *${u.money} ${currency}* 💀`)
            u.money -= amount
            u.bank = (u.bank || 0) + amount
            return sendEco(t(
                `🏦 *¡DEPÓSITO EXITOSO!*\n\nGuardaste *${amount} ${currency}* en el banco~\n💵 En mano: ${u.money}\n🏦 En banco: ${u.bank}`,
                `💖 Mi rey depositó *${amount} ${currency}* al banco. Qué responsable eres~ 🥰`
            )