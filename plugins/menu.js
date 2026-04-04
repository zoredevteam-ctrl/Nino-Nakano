import { database } from '../lib/database.js'

/**
 * Menú Principal - Nino Nakano
 * Con sección de Sub-Bots y rcanal fijo
 */

const RCANAL = 'https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G'

let handler = async (m, { conn, usedPrefix }) => {
    try {
        const sender = m.sender
        const prefix = usedPrefix || '#'
        const username = m.pushName || 'Tesoro'
        const nombreBot = global.botName || 'Nino Nakano'

        // Ping / Latencia
        const timestamp = m.messageTimestamp ? m.messageTimestamp * 1000 : Date.now()
        const p = `${Math.abs(Date.now() - timestamp)}ms`

        // Uptime
        const uptimeSeconds = process.uptime()
        const d = Math.floor(uptimeSeconds / (3600 * 24))
        const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600)
        const min = Math.floor((uptimeSeconds % 3600) / 60)
        const s = Math.floor(uptimeSeconds % 60)
        const uptime = `${d}d ${h}h ${min}m ${s}s`

        // Base de Datos
        const users = database.data?.users || {}
        const user = users[sender] || { limit: 0, xp: 0, level: 1 }
        const totalreg = Object.keys(users).length

        const userMoney = user.limit ?? 0
        const userExp = user.xp ?? 0
        const userLevel = user.level ?? 1

        // Sub-bots activos
        const subbots = database.data?.subbots || {}
        const totalSubbots = Object.keys(subbots).filter(k => subbots[k]?.connected).length
        const maxSubbots = 30

        // Rangos
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

        const canalLink = global.rcanal || RCANAL

        let txt = `¡Hola, *${username}*! ✨ 
Es un gusto verte de nuevo. Soy *${nombreBot}* y estoy aquí para ayudarte en lo que necesites. ¡Espero que tengamos un lindo día! 🌸🦋

> ꒰⌢ ʚ˚₊‧ ✎ ꒱ INFO:
- Este es un sistema privado creado con mucho cariño por *𝓐𝓪𝓻𝓸𝓶*.

*╭╼𝅄꒰𑁍⃪⃪࣭۪ٜ݊݊݊໑ ꒱ 𐔌 ESTADÍSTICAS 𐦯*
*|✎ Creador:* 𝓐𝓪𝓻𝓸𝓶
*|✎ Usuarios:* ${totalreg.toLocaleString()}
*|✎ Activo:* ${uptime}
*|✎ Latencia:* ${p}
*|✎ Canal:* ${canalLink}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ🦋◌⃘⃪۪𐇽֟፝۫۬🦋◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*╭╼𝅄꒰✧: ꒱ 𐔌 TU PERFIL 𐦯*
*|✎ Nombre:* ${username}
*|✎ Diamantes:* ${userMoney} 💎
*|✎ Experiencia:* ${userExp} ✨
*|✎ Rango:* ${rango}
*|✎ Nivel:* ${userLevel}
*|✎ Ranking:* ${rankText}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ🎀◌⃘⃪۪𐇽֟፝۫۬🎀◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*╭╼𝅄꒰🦋꒱ 𐔌 SUB-BOTS 𐦯*
*|✎ Conectados:* ${totalSubbots} / ${maxSubbots}
*|✎ Vincular:* ${prefix}code
*|✎ Ver lista:* ${prefix}subbots
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ👑◌⃘⃪۪𐇽֟፝۫۬👑◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*➪ 𝗟𝗜𝗦𝗧𝗔 𝗗𝗘 𝗙𝗨𝗡𝗖𝗜𝗢𝗡𝗘𝗦*
_Aquí tienes todo lo que puedo hacer por ti:_

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 SISTEMA 𐦯*
> *✧･ﾟ: ❏ ${prefix}ping*
> *✧･ﾟ: ❏ ${prefix}update*
> *✧･ﾟ: ❏ ${prefix}owner*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 GRUPOS 𐦯*
> *✧･ﾟ: ❏ ${prefix}kick*
> *✧･ﾟ: ❏ ${prefix}ban*
> *✧･ﾟ: ❏ ${prefix}promover / ${prefix}degradar*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 ECONOMÍA 𐦯*
> *✧･ﾟ: ❏ ${prefix}daily*
> *✧･ﾟ: ❏ ${prefix}cofre*
> *✧･ﾟ: ❏ ${prefix}minar*
> *✧･ﾟ: ❏ ${prefix}work / ${prefix}chamba*
> *✧･ﾟ: ❏ ${prefix}crime*
> *✧･ﾟ: ❏ ${prefix}rob / ${prefix}rob2*
> *✧･ﾟ: ❏ ${prefix}bal / ${prefix}baltop*
> *✧･ﾟ: ❏ ${prefix}shop*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 SUB-BOTS 𐦯*
> *✧･ﾟ: ❏ ${prefix}code*
> *✧･ﾟ: ❏ ${prefix}subbots*
> *✧･ﾟ: ❏ ${prefix}setnombre <nombre>*
> *✧･ﾟ: ❏ ${prefix}setbanner [imagen]*
> *✧･ﾟ: ❏ ${prefix}delsubbot <número>*`.trim()

        await conn.sendMessage(m.chat, {
            text: txt,
            contextInfo: {
                externalAdReply: {
                    title: `🌸 ${nombreBot.toUpperCase()} 🌸`,
                    body: 'Panel de Control de Aarom',
                    thumbnailUrl: global.banner || '',
                    sourceUrl: canalLink,
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
