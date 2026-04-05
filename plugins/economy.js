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
        const arrayBuf = await res.arrayBuffer()
        return Buffer.from(arrayBuf)
    } catch {
        return null
    }
}

const buildContext = (thumbnail) => {
    const newsletterJid = global.newsletterJid || '120363408182996815@newsletter'
    return {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid,
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

export default {
    command: ['daily', 'cofre', 'minar', 'crime', 'crimen', 'rob', 'rob2',
              'd', 'deposit', 'depositar', 'bal', 'baltop', 'lvl',
              'work', 'trabajar', 'chamba', 'shop', 'tienda'],
    tags: ['economy'],
    desc: 'Sistema completo de economía Nino Nakano',

    async run(m, { conn, text, command, isOwner, db }) {
        const cmd = command.toLowerCase()
        const who = m.sender
        const u = ensureUser(db, who)
        const currency = 'Coins'
        const t = (normal, ownerText) => isOwner ? (ownerText || normal) : normal
        const txt = text || ''

        const sendEco = async (msgText, mentions) => {
            const thumbnail = await getThumbnail()
            const params = {
                text: msgText,
                contextInfo: buildContext(thumbnail)
            }
            if (mentions) params.mentions = mentions
            return conn.sendMessage(m.chat, params, { quoted: m })
        }

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
            ))
        }

        if (cmd === 'bal') {
            const target = m.quoted?.sender || m.mentionedJid?.[0] || m.sender
            ensureUser(db, target)
            const user = db.users[target]
            const total = (user.money || 0) + (user.bank || 0)
            const esTuyo = target === who
            return sendEco(t(
                `💰 *${esTuyo ? 'TU BALANCE' : `BALANCE DE @${target.split('@')[0]}`}*\n\n` +
                `💵 En mano: *${user.money || 0} ${currency}*\n` +
                `🏦 En banco: *${user.bank || 0} ${currency}*\n` +
                `✨ Experiencia: *${user.exp || 0} XP*\n` +
                `📊 Total: *${total} ${currency}*`,
                `💖 *Balance de mi rey*\n\n💵 Mano: *${user.money || 0}*\n🏦 Banco: *${user.bank || 0}*\n✨ Exp: *${user.exp || 0}*\n📊 Total: *${total}*\n\n_Todo lo que tienes es mío~ 🥰_`
            ), [target])
        }

        if (cmd === 'baltop') {
            if (!m.isGroup) return sendEco('🏆 Este comando solo funciona en grupos!')
            const meta = await conn.groupMetadata(m.chat)
            const members = meta.participants.map(p => p.id)
            const top = Object.keys(db.users || {})
                .filter(jid => members.includes(jid))
                .map(jid => ({ jid, total: (db.users[jid].money || 0) + (db.users[jid].bank || 0) }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10)
            if (!top.length) return sendEco('😅 Nadie tiene coins en este grupo... ¡Todos son pobres!')
            const medallas = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
            let txtTop = '🏆 *TOP 10 MÁS RICOS* 💰\n\n'
            top.forEach((p, i) => { txtTop += `${medallas[i]} @${p.jid.split('@')[0]} → *${p.total} ${currency}*\n` })
            txtTop += `\n_¿Tú dónde quedaste?_ 👀`
            return sendEco(txtTop, top.map(p => p.jid))
        }

        if (cmd === 'lvl') {
            if ((u.exp || 0) < 1000) {
                return sendEco(t(
                    `📊 Necesitas *1000 XP* para subir de nivel.\nTienes *${u.exp || 0} XP*... te faltan *${1000 - (u.exp || 0)} XP* 📈`,
                    `🥺 Mi amor, tienes ${u.exp || 0}/1000 XP. ¡Ya casi! 💕`
                ))
            }
            u.exp -= 1000
            u.level = (u.level || 1) + 1
            return sendEco(t(
                `🎉 *¡LEVEL UP!*\n\n⭐ Subiste al nivel *${u.level}*\n✨ XP restante: ${u.exp}\n\n_¡Eres cada vez más poderoso!_ 💪`,
                `💖 *¡Mi rey subió al nivel ${u.level}!* 🎉 🥰`
            ))
        }

        if (cmd === 'shop' || cmd === 'tienda') {
            if (!txt) {
                return sendEco(t(
                    `🛒 *TIENDA DE NINO* 🛒\n\n1️⃣ ✨ *Exp Booster* (+1500 Exp) → 600 ${currency}\n2️⃣ 💰 *Money Pack* (+800 ${currency}) → 400 ${currency}\n\n_Usa *#shop buy 1* o *#shop buy 2*_\n💵 Tu saldo: *${u.money || 0} ${currency}*`,
                    `💖 Tienda especial para mi rey~ 🥰\n\n1️⃣ Exp Booster → 600\n2️⃣ Money Pack → 400\n\n💵 Tienes: *${u.money || 0}*`
                ))
            }
            const arg = txt.toLowerCase()
            if (arg.includes('buy 1') || arg === '1') {
                if ((u.money || 0) < 600) return sendEco(`❌ Necesitas *600* y tienes *${u.money || 0}* 💸`)
                u.money -= 600
                u.exp = (u.exp || 0) + 1500
                return sendEco(t(
                    `✨ *¡EXP BOOSTER ACTIVADO!*\n\n+1500 XP directo a tu cuenta 🚀\n💵 Coins restantes: *${u.money}*`,
                    `💖 Mi amor compró Exp Booster~ +1500 Exp 🥰`
                ))
            }
            if (arg.includes('buy 2') || arg === '2') {
                if ((u.money || 0) < 400) return sendEco(`❌ Necesitas *400* y tienes *${u.money || 0}* 💸`)
                u.money = (u.money || 0) + 400
                return sendEco(t(
                    `💰 *¡MONEY PACK ACTIVADO!*\n\n+800 ${currency} en tu bolsillo 💵\n💵 Total: *${u.money}*`,
                    `💖 Mi rey compró Money Pack~ +800 ${currency} 🥰`
                ))
            }
            return sendEco('❓ Usa *#shop* para ver los artículos disponibles 🛒')
        }
    }
}
