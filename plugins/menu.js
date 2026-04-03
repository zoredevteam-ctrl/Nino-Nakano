import os from 'os'
import db from '../lib/database.js'

let handler = async (conn, m, { pushname, sender }) => {
    // --- PING REAL ---
    // Calculamos la diferencia entre ahora y cuando el mensaje fue enviado
    const timestamp = Date.now()
    const p = `${Math.abs(Date.now() - (m.messageTimestamp * 1000))}ms`

    // --- CÁLCULO DE UPTIME ---
    const uptimeSeconds = process.uptime()
    const d = Math.floor(uptimeSeconds / (3600 * 24))
    const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600)
    const min = Math.floor((uptimeSeconds % 3600) / 60)
    const s = Math.floor(uptimeSeconds % 60)
    const uptime = `${d}d ${h}h ${min}m ${s}s`

    // --- LÓGICA DE BASE DE DATOS (SEGURA) ---
    if (!db.data) await db.read() // Forzar lectura si no ha cargado
    if (!db.data.users) db.data.users = {}
    
    if (!db.data.users[sender]) {
        db.data.users[sender] = { limit: 10, xp: 0, level: 1 }
    }

    const totalreg = Object.keys(db.data.users).length
    const user = db.data.users[sender]
    const nombreBot = global.botName || 'Nino Bot'
    const username = pushname || 'Usuario'
    const userMoney = user?.limit ?? 0
    const userExp = user?.xp ?? 0
    const userLevel = user?.level ?? 1

    // Sistema de Rangos
    const getRango = (level) => {
        if (level < 5) return 'Novato 🐣'
        if (level < 15) return 'Aprendiz 🦋'
        if (level < 30) return 'Guerrero ⚔️'
        if (level < 50) return 'Élite 🎖️'
        return 'Nino Lover 💖'
    }
    const rango = getRango(userLevel)

    // Cálculo de Ranking (Top Exp)
    const sortedExp = Object.entries(db.data.users).sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0))
    const rankIndex = sortedExp.findIndex(u => u[0] === sender) + 1
    const rankText = `${rankIndex} / ${totalreg}`

    let txt = `¡𝐇𝐨𝐥𝐚! Soy *${nombreBot}* 🦋

> ꒰⌢ ʚ˚₊‧ ✎ ꒱ INFO:
- ${nombreBot} es un bot privado bajo la gestión de *Z0RT SYSTEMS*. Usa el menú para explorar mis funciones.

*╭╼𝅄꒰𑁍⃪⃪࣭۪ٜ݊݊݊໑ ꒱ 𐔌 BOT - INFO 𐦯*
*|✎ Creador:* 𝓐𝓪𝓻𝓸𝓶
*|✎ Users:* ${totalreg.toLocaleString()}
*|✎ Uptime:* ${uptime}
*|✎ Ping:* ${p}
*|✎ Baileys:* Multi-Device
*|✎ Canal:* ${global.rcanal}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ🦋◌⃘⃪۪𐇽֟፝۫۬🦋◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*╭╼𝅄꒰✧: ꒱ 𐔌 INFO - USER 𐦯*
*|✎ Nombre:* ${username}
*|✎ Diamantes:* ${userMoney}
*|✎ Exp:* ${userExp}
*|✎ Rango:* ${rango}
*|✎ Nivel:* ${userLevel}
*|✎ Top:* ${rankText}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ🎀◌⃘⃪۪𐇽֟፝۫۬🎀◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*➪ 𝗟𝗜𝗦𝗧𝗔 𝗗𝗘 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 SISTEMA 𐦯*
> *✧･ﾟ: ❏ #p / #ping*
> *✧･ﾟ: ❏ #update*
> *✧･ﾟ: ❏ #owner*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 GRUPOS 𐦯*
> *✧･ﾟ: ❏ #kick*
> *✧･ﾟ: ❏ #ban*
> *✧･ﾟ: ❏ #promover / #degradar*`

    await conn.sendMessage(m.chat, { 
        text: txt,
        contextInfo: {
            externalAdReply: {
                title: `🦋 ${nombreBot.toUpperCase()} 🦋`,
                body: 'Panel de Control Principal',
                thumbnailUrl: global.banner,
                sourceUrl: global.rcanal,
                mediaType: 1,
                showAdAttribution: true, // Esto le da un toque más oficial
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m })
}

handler.command = ['menu', 'help', 'comandos']
export default handler
