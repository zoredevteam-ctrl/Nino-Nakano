import { database } from '../lib/database.js'

// ✅ Obtiene el contexto correcto según si es subbot o bot principal
const getCtx = (conn) => {
    if (conn._subbotContext) return conn._subbotContext
    return {
        botName:  global.botName || 'Nino Nakano',
        banner:   global.banner  || '',
        subbotId: null
    }
}

const getBannerBuffer = async (bannerSrc) => {
    if (!bannerSrc) return null
    try {
        if (bannerSrc.startsWith('data:image')) {
            return Buffer.from(bannerSrc.split(',')[1], 'base64')
        }
        const res = await fetch(bannerSrc)
        if (!res.ok) return null
        return Buffer.from(await res.arrayBuffer())
    } catch {
        return null
    }
}

let handler = async (m, { conn, usedPrefix }) => {
    const ctx       = getCtx(conn)
    const esSubbot  = !!ctx.subbotId
    const nombreBot = ctx.botName
    const bannerSrc = ctx.banner

    const sender = (m.sender || '').replace(/:[0-9A-Za-z]+(?=@s\.whatsapp\.net)/, '')
                                   .split('@')[0].split(':')[0] + '@s.whatsapp.net'

    const prefix    = usedPrefix || global.prefix || '#'
    const username  = m.pushName || 'Tesoro'
    const canalLink = global.rcanal || ''

    const hora   = new Date().getHours()
    const saludo =
        hora >= 5  && hora < 12 ? 'Buenos días ☀️'  :
        hora >= 12 && hora < 18 ? 'Buenas tardes 🌸' :
        hora >= 18 && hora < 22 ? 'Buenas noches 🌙' : 'Te veo de nuevo 🦋'

    const saludoBot = esSubbot
        ? `🤖 Hola *${username}*! Soy *${nombreBot}*, tu Sub-Bot de confianza~\n${saludo}, espero disfrutes todos mis comandos 💕`
        : `💎 Hola *${username}*! Soy *${nombreBot}* Premium Bot~\n${saludo}, espero disfrutes mis nuevos comandos 🌸`

    const timestamp = m.messageTimestamp ? m.messageTimestamp * 1000 : Date.now()
    const p = `${Math.abs(Date.now() - timestamp)}ms`

    const up     = process.uptime()
    const uptime = `${Math.floor(up/86400)}d ${Math.floor((up%86400)/3600)}h ${Math.floor((up%3600)/60)}m ${Math.floor(up%60)}s`

    let user, users, totalreg
    try {
        user     = database.getUser(sender)
        users    = database.data?.users || {}
        totalreg = Object.keys(users).length
    } catch {
        user     = { limit: 0, exp: 0, level: 1 }
        users    = {}
        totalreg = 0
    }

    const userMoney = user.limit ?? 0
    const userExp   = user.xp ?? user.exp ?? 0
    const userLevel = user.level ?? 1
    const rpg       = user.rpg || null

    const subbots      = database.data?.subbots || {}
    const totalSubbots = Object.keys(subbots).filter(k => subbots[k]?.connected).length

    const rango =
        userLevel < 5  ? 'Novato 🐣'   :
        userLevel < 15 ? 'Aprendiz 🦋' :
        userLevel < 30 ? 'Guerrero ⚔️' :
        userLevel < 50 ? 'Élite 🎖️'   : 'Nino Lover 💖'

    let rankText = '---'
    try {
        const sorted  = Object.entries(users).sort((a, b) => (b[1]?.xp || b[1]?.exp || 0) - (a[1]?.xp || a[1]?.exp || 0))
        const rankIdx = sorted.findIndex(u => u[0] === sender) + 1
        if (rankIdx > 0) rankText = `${rankIdx} / ${totalreg}`
    } catch {}

    const txt =
`${saludoBot}

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
${rpg?.clase ? `*|✎ Clase RPG:* ${rpg.clase} Nv.${rpg.nivel} ⚔️` : '*|✎ RPG:* Sin clase — usa #elegirclase'}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ🎀◌⃘⃪۪𐇽֟፝۫۬🎀◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*╭╼𝅄꒰👑꒱ 𐔌 SUB-BOTS 𐦯*
*|✎ Conectados:* ${totalSubbots} / 30
*|✎ Vincular:* ${prefix}code
*|✎ Ver lista:* ${prefix}subbots
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ👑◌⃘⃪۪𐇽֟፝۫۬👑◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*➪ 𝗟𝗜𝗦𝗧𝗔 𝗗𝗘 𝗙𝗨𝗡𝗖𝗜𝗢𝗡𝗘𝗦*
_Aquí tienes todo lo que puedo hacer por ti:_

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 SISTEMA 𐦯*
> *✧･ﾟ: ❏ ${prefix}ping*
> *✧･ﾟ: ❏ ${prefix}update / ${prefix}restart*
> *✧･ﾟ: ❏ ${prefix}checkplugins / ${prefix}infobot*
> *✧･ﾟ: ❏ ${prefix}owner*
> *✧･ﾟ: ❏ ${prefix}boton / ${prefix}botoff*
> *✧･ﾟ: ❏ ${prefix}modoadmin / ${prefix}modoowner*
> *✧･ﾟ: ❏ ${prefix}setprefix / ${prefix}delprefix*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 MODERACIÓN 🛡️*
> *✧･ﾟ: ❏ ${prefix}warn / ${prefix}resetwarn / ${prefix}warns*
> *✧･ﾟ: ❏ ${prefix}mute [tiempo] / ${prefix}unmute*
> *✧･ﾟ: ❏ ${prefix}closegroup / ${prefix}opengroup*
> *✧･ﾟ: ❏ ${prefix}antilink / ${prefix}antispam*
> *✧･ﾟ: ❏ ${prefix}setprimary / ${prefix}removeprimary*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 GRUPOS 𐦯*
> *✧･ﾟ: ❏ ${prefix}kick / ${prefix}ban*
> *✧･ﾟ: ❏ ${prefix}tag*
> *✧･ﾟ: ❏ ${prefix}promover / ${prefix}degradar*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 🎮 JUEGOS*
> *✧･ﾟ: ❏ ${prefix}trivia / ${prefix}triviatop*
> *✧･ﾟ: ❏ ${prefix}adivina / ${prefix}pista / ${prefix}rendirse*
> *✧･ﾟ: ❏ ${prefix}ruleta / ${prefix}rruleta*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 ECONOMÍA 𐦯*
> *✧･ﾟ: ❏ ${prefix}daily / ${prefix}cofre*
> *✧･ﾟ: ❏ ${prefix}minar / ${prefix}work / ${prefix}chamba*
> *✧･ﾟ: ❏ ${prefix}crime / ${prefix}rob / ${prefix}rob2*
> *✧･ﾟ: ❏ ${prefix}bal / ${prefix}baltop*
> *✧･ﾟ: ❏ ${prefix}shop / ${prefix}depositar / ${prefix}lvl*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 RPG 𐦯*
> *✧･ﾟ: ❏ ${prefix}clases / ${prefix}elegirclase*
> *✧･ﾟ: ❏ ${prefix}perfil / ${prefix}dungeon*
> *✧･ﾟ: ❏ ${prefix}atacar / ${prefix}habilidad*
> *✧･ﾟ: ❏ ${prefix}curar / ${prefix}inventario / ${prefix}usar*
> *✧･ﾟ: ❏ ${prefix}pelear / ${prefix}tiendarpg*
> *✧･ﾟ: ❏ ${prefix}clan / ${prefix}misiones / ${prefix}reclamar*
> *✧･ﾟ: ❏ ${prefix}rpgtop*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 ANIME & SOCIAL 🎀*
> *✧･ﾟ: ❏ ${prefix}rw / ${prefix}miswaifu*
> *✧･ﾟ: ❏ ${prefix}kiss / ${prefix}hug / ${prefix}kill*
> *✧･ﾟ: ❏ ${prefix}push / ${prefix}dormir / ${prefix}triste*
> *✧･ﾟ: ❏ ${prefix}no / ${prefix}hola / ${prefix}borracho*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 HERRAMIENTAS 𐦯*
> *✧･ﾟ: ❏ ${prefix}clima <ciudad>*
> *✧･ﾟ: ❏ ${prefix}traducir <idioma> <texto>*
> *✧･ﾟ: ❏ ${prefix}calc <operación>*
> *✧･ﾟ: ❏ ${prefix}qr <texto>*
> *✧･ﾟ: ❏ ${prefix}acortar <url>*
> *✧･ﾟ: ❏ ${prefix}ip <dirección>*
> *✧･ﾟ: ❏ ${prefix}color <hex>*
> *✧･ﾟ: ❏ ${prefix}moneda <cant> <de> <a>*
> *✧･ﾟ: ❏ ${prefix}dado / ${prefix}cara*
> *✧･ﾟ: ❏ ${prefix}wiki <tema>*
> *✧･ﾟ: ❏ ${prefix}letra <canción>*
> *✧･ﾟ: ❏ ${prefix}password / ${prefix}timestamp*
> *✧･ﾟ: ❏ ${prefix}base64 / ${prefix}binario / ${prefix}hex*
> *✧･ﾟ: ❏ ${prefix}checkurl / ${prefix}ascii*
> *✧･ﾟ: ❏ ${prefix}pokedex <nombre>*
> *✧･ﾟ: ❏ ${prefix}chiste / ${prefix}frase*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 DESCARGAS 🎵*
> *✧･ﾟ: ❏ ${prefix}play <canción>*
> *✧･ﾟ: ❏ ${prefix}playvid <canción>*
> *✧･ﾟ: ❏ ${prefix}pin <búsqueda o url>*
> *✧･ﾟ: ❏ ${prefix}enviartt <url tiktok>*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 STICKERS 𐦯*
> *✧･ﾟ: ❏ ${prefix}s / ${prefix}sticker*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 SUB-BOTS 𐦯*
> *✧･ﾟ: ❏ ${prefix}code <número>*
> *✧･ﾟ: ❏ ${prefix}subbots / ${prefix}delsubbot*
> *✧･ﾟ: ❏ ${prefix}setnombre / ${prefix}setbanner*`

    // ✅ SOLUCIÓN DEFINITIVA para todos los WhatsApp:
    // Enviar banner como imagen separada + texto plano
    // Así llega a WhatsApp normal, Business, versiones antiguas y nuevas
    const thumbnail = await getBannerBuffer(bannerSrc)

    try {
        // Paso 1: Enviar banner como imagen con caption corto
        if (thumbnail) {
            await conn.sendMessage(m.chat, {
                image: thumbnail,
                caption:
                    `${esSubbot ? `🤖 *${nombreBot.toUpperCase()} SUB-BOT*` : `💎 *${nombreBot.toUpperCase()} PREMIUM*`}\n` +
                    `> ${saludo} *${username}* 🌸`
            }, { quoted: m })
        }

        // Paso 2: Enviar el menú completo como texto simple
        // Sin externalAdReply — compatible con TODOS los WhatsApp
        await conn.sendMessage(m.chat, { text: txt })

    } catch (e) {
        console.error('[MENU ERROR]', e?.message)
        // Fallback: solo texto plano
        try {
            await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        } catch {}
    }
}

handler.command = ['menu', 'help', 'comandos']
export default handler