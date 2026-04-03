import { database } from '../lib/database.js'

/**
 * Menú Principal - Versión Amable 🌸
 * Corregido por Aarom
 */
let handler = async (m, { conn, usedPrefix }) => {
    try {
        // 1. Definición segura de variables para evitar 'undefined'
        const sender = m.sender
        const prefix = usedPrefix || '#' // Si usedPrefix falla, usa # por defecto
        const username = m.pushName || 'Tesoro' // Si no hay nombre, te dice Tesoro
        const nombreBot = global.botName || 'Nino Nakano'

        // 2. Ping / Latencia
        const timestamp = m.messageTimestamp ? m.messageTimestamp * 1000 : Date.now()
        const p = `${Math.abs(Date.now() - timestamp)}ms`

        // 3. Uptime (Tiempo activo)
        const uptimeSeconds = process.uptime()
        const d = Math.floor(uptimeSeconds / (3600 * 24))
        const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600)
        const min = Math.floor((uptimeSeconds % 3600) / 60)
        const s = Math.floor(uptimeSeconds % 60)
        const uptime = `${d}d ${h}h ${min}m ${s}s`

        // 4. Base de Datos
        const users = database.data?.users || {}
        const user = users[sender] || { limit: 0, xp: 0, level: 1 }
        const totalreg = Object.keys(users).length

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

        // Ranking
        const sortedExp = Object.entries(users).sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0))
        const rankIndex = sortedExp.findIndex(u => u[0] === sender) + 1
        const rankText = rankIndex > 0 ? `${rankIndex} / ${totalreg}` : `---`

        // 5. Diseño del Menú (Personalidad Tierna)
        let txt = `¡Hola, *${username}*! ✨ 
Es un gusto verte de nuevo. Soy *${nombreBot}* y estoy aquí para ayudarte en lo que necesites. ¡Espero que tengamos un lindo día! 🌸🦋

> ꒰⌢ ʚ˚₊‧ ✎ ꒱ INFO:
- Este es un sistema privado creado con mucho cariño por *𝓐𝓪𝓻𝓸𝓶*.

*╭╼𝅄꒰𑁍⃪⃪࣭۪ٜ݊݊݊໑ ꒱ 𐔌 ESTADÍSTICAS 𐦯*
*|✎ Creador:* 𝓐𝓪𝓻𝓸𝓶
*|✎ Usuarios:* ${totalreg.toLocaleString()}
*|✎ Activo:* ${uptime}
*|✎ Latencia:* ${p}
*|✎ Canal:* ${global.rcanal || 'Canal de Aarom'}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ🦋◌⃘⃪۪𐇽֟፝۫۬🦋◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*╭╼𝅄꒰✧: ꒱ 𐔌 TU PERFIL 𐦯*
*|✎ Nombre:* ${username}
*|✎ Diamantes:* ${userMoney} 💎
*|✎ Experiencia:* ${userExp} ✨
*|✎ Rango:* ${rango}
*|✎ Nivel:* ${userLevel}
*|✎ Ranking:* ${rankText}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ🎀◌⃘⃪۪𐇽֟፝۫۬🎀◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*➪ 𝗟𝗜𝗦𝗧𝗔 𝗗𝗘 𝗙𝗨𝗡𝗖𝗜𝗢𝗡𝗘𝗦*
_Aquí tienes todo lo que puedo hacer por ti:_

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 SISTEMA 𐦯*
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
                    title: `🌸 ${nombreBot.toUpperCase()} 🌸`,
                    body: 'Panel de Control de Aarom',
                    thumbnailUrl: global.banner,
                    sourceUrl: global.rcanal,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })

    } catch (e) {
        console.error(e)
        m.reply(`🌸 *Ups...* \nHubo un pequeño problema al mostrar el menú. ¡Pero no te preocupes, Aarom lo solucionará pronto!`)
    }
}

handler.command = ['menu', 'help', 'comandos']
export default handler
