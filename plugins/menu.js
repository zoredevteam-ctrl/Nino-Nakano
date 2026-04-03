import { database } from '../lib/database.js' // Importación correcta del DB

/**
 * Menú Principal - Z0RT SYSTEMS
 */
let handler = async (m, { conn, prefix }) => {
    // 1. Corrección de variables: m.pushName viene del simple.js
    const sender = m.sender
    const username = m.pushName || 'Tonto'

    // 2. Ping Real
    const p = `${Math.abs(Date.now() - (m.messageTimestamp * 1000))}ms`

    // 3. Cálculo de Uptime
    const uptimeSeconds = process.uptime()
    const d = Math.floor(uptimeSeconds / (3600 * 24))
    const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600)
    const min = Math.floor((uptimeSeconds % 3600) / 60)
    const s = Math.floor(uptimeSeconds % 60)
    const uptime = `${d}d ${h}h ${min}m ${s}s`

    // 4. Lectura Segura de la Base de Datos
    const dbData = database.data
    const totalreg = Object.keys(dbData.users || {}).length
    const user = dbData.users?.[sender] || {}

    const nombreBot = global.botName || 'Nino Nakano'
    const userMoney = user.limit ?? 0
    const userExp = user.xp ?? 0
    const userLevel = user.level ?? 1

    // Sistema de Rangos
    const getRango = (level) => {
        if (level < 5) return 'Novato 🐣'
        if (level < 15) return 'Aprendiz 🦋'
        if (level < 30) return 'Guerrero ⚔️'
        if (level < 50) return 'Élite 🎖️'
        return 'Nino Lover 💖'
    }
    const rango = getRango(userLevel)

    // Cálculo de Ranking Top
    const sortedExp = Object.entries(dbData.users || {}).sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0))
    const rankIndex = sortedExp.findIndex(u => u[0] === sender) + 1
    const rankText = `${rankIndex} / ${totalreg}`

    // 5. El Menú con personalidad Tsundere y jerarquía oficial
    let txt = `¿Ugh? ¿Otra vez molestando? 🙄
Soy *${nombreBot}*, no un juguete. Lee bien antes de hacer que rompa algo, ${username}.

> ꒰⌢ ʚ˚₊‧ ✎ ꒱ INFO:
- ${nombreBot} es un sistema privado protegido bajo la red de *𝓐𝓪𝓻𝓸𝓶*.

*╭╼𝅄꒰𑁍⃪⃪࣭۪ٜ݊݊݊໑ ꒱ 𐔌 SISTEMA 𐦯*
*|✎ Creators:* 𝓐𝓪𝓻𝓸𝓶
*|✎ Usuarios:* ${totalreg.toLocaleString()}
*|✎ Uptime:* ${uptime}
*|✎ Ping:* ${p}
*|✎ Canal:* ${global.rcanal}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ🦋◌⃘⃪۪𐇽֟፝۫۬🦋◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*╭╼𝅄꒰✧: ꒱ 𐔌 PERFIL DE USUARIO 𐦯*
*|✎ Humano:* ${username}
*|✎ Diamantes:* ${userMoney} 💎
*|✎ Exp:* ${userExp} ✨
*|✎ Rango:* ${rango}
*|✎ Nivel:* ${userLevel}
*|✎ Top:* ${rankText}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ🎀◌⃘⃪۪𐇽֟፝۫۬🎀◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*➪ 𝗟𝗜𝗦𝗧𝗔 𝗗𝗘 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦*
_No te equivoques al escribirlos, no tengo paciencia hoy. 💢_

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 BÁSICOS 𐦯*
> *✧･ﾟ: ❏ ${prefix}ping*
> *✧･ﾟ: ❏ ${prefix}update*
> *✧･ﾟ: ❏ ${prefix}owner*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 GRUPOS 𐦯*
> *✧･ﾟ: ❏ ${prefix}kick*
> *✧･ﾟ: ❏ ${prefix}ban*
> *✧･ﾟ: ❏ ${prefix}promover / ${prefix}degradar*`.trim()

    await conn.sendMessage(m.chat, { 
        text: txt,
        contextInfo: {
            externalAdReply: {
                title: `🦋 ${nombreBot.toUpperCase()} 🦋`,
                body: 'Panel de Control Principal',
                thumbnailUrl: global.banner,
                sourceUrl: global.rcanal,
                mediaType: 1,
                showAdAttribution: true,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m })
}

handler.command = ['menu', 'help', 'comandos']
export default handler
