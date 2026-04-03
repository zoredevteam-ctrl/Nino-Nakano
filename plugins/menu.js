import { database } from '../lib/database.js'

/**
 * Menú Principal - Z0RT SYSTEMS
 */
let handler = async (m, { conn, usedPrefix: prefix }) => {
    try {
        // 1. Corrección de variables y seguridad
        const sender = m.sender
        // Intentamos obtener el nombre de varias fuentes para evitar el error de undefined
        const username = m.pushName || conn.getName(sender) || 'Usuario'

        // 2. Ping Real con validación de timestamp
        const timestamp = m.messageTimestamp ? m.messageTimestamp * 1000 : Date.now()
        const p = `${Math.abs(Date.now() - timestamp)}ms`

        // 3. Cálculo de Uptime
        const uptimeSeconds = process.uptime()
        const d = Math.floor(uptimeSeconds / (3600 * 24))
        const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600)
        const min = Math.floor((uptimeSeconds % 3600) / 60)
        const s = Math.floor(uptimeSeconds % 60)
        const uptime = `${d}d ${h}h ${min}m ${s}s`

        // 4. Lectura Segura de la Base de Datos
        const dbData = database.data || {}
        const users = dbData.users || {}
        const totalreg = Object.keys(users).length
        const user = users[sender] || {}

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

        // Cálculo de Ranking Top de forma segura
        const sortedExp = Object.entries(users).sort((a, b) => (b[1]?.xp || 0) - (a[1]?.xp || 0))
        const rankIndex = sortedExp.findIndex(u => u[0] === sender) + 1
        const rankText = rankIndex > 0 ? `${rankIndex} / ${totalreg}` : `Sin clasificar`

        // 5. El Menú con personalidad Tsundere
        let txt = `¿Ugh? ¿Otra vez molestando? 🙄
Soy *${nombreBot}*, no un juguete. Lee bien antes de hacer que rompa algo, ${username}.

> ꒰⌢ ʚ˚₊‧ ✎ ꒱ INFO:
- ${nombreBot} es un sistema privado protegido bajo la red de *𝓐𝓪𝓻𝓸𝓶*.

*╭╼𝅄꒰𑁍⃪⃪࣭۪ٜ݊݊݊໑ ꒱ 𐔌 SISTEMA 𐦯*
*|✎ Creators:* 𝓐𝓪𝓻𝓸𝓶
*|✎ Usuarios:* ${totalreg.toLocaleString()}
*|✎ Uptime:* ${uptime}
*|✎ Ping:* ${p}
*|✎ Canal:* ${global.rcanal || 'No disponible'}
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

    } catch (e) {
        console.error(e)
        // Respuesta en caso de que algo falle internamente
        m.reply(`💢 *¡ERROR CRÍTICO!* 💢\n\nAlgo salió mal al generar el menú. Revisa la consola.`)
    }
}

handler.command = ['menu', 'help', 'comandos']
export default handler