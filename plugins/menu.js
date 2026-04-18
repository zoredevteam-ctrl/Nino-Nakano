import { database } from '../lib/database.js'

const getCtx = (conn) => {
    if (conn._subbotContext) return conn._subbotContext
    return {
        botName:  global.botName || 'Nino Nakano',
        banner:   global.banner  || '',
        subbotId: null
    }
}

const getBannerBase64 = async (bannerSrc) => {
    if (!bannerSrc) return null
    try {
        if (bannerSrc.startsWith('data:image')) return bannerSrc.split(',')[1]
        const res = await fetch(bannerSrc)
        if (!res.ok) return null
        return Buffer.from(await res.arrayBuffer()).toString('base64')
    } catch { return null }
}

const getBannerBuffer = async (bannerSrc) => {
    if (!bannerSrc) return null
    try {
        if (bannerSrc.startsWith('data:image')) return Buffer.from(bannerSrc.split(',')[1], 'base64')
        const res = await fetch(bannerSrc)
        if (!res.ok) return null
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
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
        hora >= 5  && hora < 12 ? 'buenos días ☀️'  :
        hora >= 12 && hora < 18 ? 'buenas tardes 🌸' :
        hora >= 18 && hora < 22 ? 'buenas noches 🌙' : 'hola de nuevo 🦋'

    const saludoBot = esSubbot
        ? `🤖 ¡Hola *${username}*, ${saludo}~!\nSoy *${nombreBot}*, tu Sub-Bot de confianza 💕`
        : `💎 ¡Hola *${username}*, ${saludo}~!\nSoy *${nombreBot}* y este es mi menú~ 🌸`

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

    // Matrimonio
    const casado = user.casadoCon
        ? `💍 Casado/a con @${user.casadoCon.split('@')[0]}`
        : null

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
${casado ? `*|✎ Estado:* ${casado}\n` : ''}${rpg?.clase ? `*|✎ Clase RPG:* ${rpg.clase} Nv.${rpg.nivel} ⚔️` : '*|✎ RPG:* Sin clase — usa #elegirclase'}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ🎀◌⃘⃪۪𐇽֟፝۫۬🎀◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*╭╼𝅄꒰👑꒱ 𐔌 SUB-BOTS 𐦯*
*|✎ Conectados:* ${totalSubbots} / 30
*|✎ Vincular:* ${prefix}code
*|✎ Ver lista:* ${prefix}subbots
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ👑◌⃘⃪۪𐇽֟፝۫۬👑◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*➪ 𝗟𝗜𝗦𝗧𝗔 𝗗𝗘 𝗙𝗨𝗡𝗖𝗜𝗢𝗡𝗘𝗦*
_Aquí tienes todo lo que puedo hacer por ti:_

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 SISTEMA 𐦯*
> *✧･ﾟ: ❏ ${prefix}ping / ${prefix}infobot*
> *✧･ﾟ: ❏ ${prefix}update / ${prefix}restart*
> *✧･ﾟ: ❏ ${prefix}checkplugins / ${prefix}owner*
> *✧･ﾟ: ❏ ${prefix}boton / ${prefix}botoff*
> *✧･ﾟ: ❏ ${prefix}modoadmin / ${prefix}modoowner*
> *✧･ﾟ: ❏ ${prefix}setprefix / ${prefix}delprefix*
> *✧･ﾟ: ❏ ${prefix}report / ${prefix}bug*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 MODERACIÓN 🛡️*
> *✧･ﾟ: ❏ ${prefix}warn / ${prefix}resetwarn / ${prefix}warns*
> *✧･ﾟ: ❏ ${prefix}mute [tiempo] / ${prefix}unmute*
> *✧･ﾟ: ❏ ${prefix}tempban @usuario [tiempo]*
> *✧･ﾟ: ❏ ${prefix}closegroup / ${prefix}opengroup*
> *✧･ﾟ: ❏ ${prefix}antilink / ${prefix}antispam*
> *✧･ﾟ: ❏ ${prefix}setprimary / ${prefix}removeprimary*
> *✧･ﾟ: ❏ ${prefix}welcome on/off*
> *✧･ﾟ: ❏ ${prefix}nsfw on/off*
> *✧･ﾟ: ❏ ${prefix}setedad <edad> / ${prefix}edadoff*
> *✧･ﾟ: ❏ ${prefix}cartaon / ${prefix}cartaoff*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 GRUPOS 𐦯*
> *✧･ﾟ: ❏ ${prefix}kick / ${prefix}ban*
> *✧･ﾟ: ❏ ${prefix}tag*
> *✧･ﾟ: ❏ ${prefix}promover / ${prefix}degradar*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 🎮 JUEGOS 𐦯*
> *✧･ﾟ: ❏ ${prefix}trivia / ${prefix}triviatop*
> *✧･ﾟ: ❏ ${prefix}adivina / ${prefix}pista / ${prefix}rendirse*
> *✧･ﾟ: ❏ ${prefix}ruleta / ${prefix}rruleta*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 ECONOMÍA 💰 𐦯*
> *✧･ﾟ: ❏ ${prefix}daily / ${prefix}cofre*
> *✧･ﾟ: ❏ ${prefix}minar / ${prefix}work / ${prefix}chamba*
> *✧･ﾟ: ❏ ${prefix}crime / ${prefix}robar / ${prefix}rob2*
> *✧･ﾟ: ❏ ${prefix}bal / ${prefix}baltop*
> *✧･ﾟ: ❏ ${prefix}shop / ${prefix}depositar / ${prefix}lvl*
> *✧･ﾟ: ❏ ${prefix}donar @usuario <cant>*
> *✧･ﾟ: ❏ ${prefix}prestamo <cant> / ${prefix}pagar*
> *✧･ﾟ: ❏ ${prefix}invertir <cant>*
> *✧･ﾟ: ❏ ${prefix}dar @usuario <cant>* _(owner)_

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 RPG ⚔️ 𐦯*
> *✧･ﾟ: ❏ ${prefix}clases / ${prefix}elegirclase*
> *✧･ﾟ: ❏ ${prefix}perfil / ${prefix}dungeon*
> *✧･ﾟ: ❏ ${prefix}atacar / ${prefix}habilidad*
> *✧･ﾟ: ❏ ${prefix}curar / ${prefix}inventario / ${prefix}usar*
> *✧･ﾟ: ❏ ${prefix}pelear / ${prefix}tiendarpg*
> *✧･ﾟ: ❏ ${prefix}clan / ${prefix}misiones / ${prefix}reclamar*
> *✧･ﾟ: ❏ ${prefix}rpgtop*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 SOCIAL 🤍 𐦯*
> *✧･ﾟ: ❏ ${prefix}casar @usuario / ${prefix}aceptar*
> *✧･ﾟ: ❏ ${prefix}divorcio*
> *✧･ﾟ: ❏ ${prefix}adoptar @usuario*
> *✧･ﾟ: ❏ ${prefix}duelo @usuario / ${prefix}aceptarduelo*
> *✧･ﾟ: ❏ ${prefix}perfil / ${prefix}carta <mensaje>*
> *✧･ﾟ: ❏ ${prefix}verificar <edad>*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 ANIME & REACCIONES 🎀 𐦯*
> *✧･ﾟ: ❏ ${prefix}rw / ${prefix}miswaifu*
> *✧･ﾟ: ❏ ${prefix}kiss / ${prefix}hug / ${prefix}kill*
> *✧･ﾟ: ❏ ${prefix}push / ${prefix}dormir / ${prefix}triste*
> *✧･ﾟ: ❏ ${prefix}no / ${prefix}hola / ${prefix}borracho*
> *✧･ﾟ: ❏ ${prefix}neko / ${prefix}waifu / ${prefix}pat*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 IA & CREATIVIDAD 🧑🏻‍💻 𐦯*
> *✧･ﾟ: ❏ ${prefix}ia <pregunta>*
> *✧･ﾟ: ❏ ${prefix}imagen <descripción>*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 MÍSTICA 🔮 𐦯*
> *✧･ﾟ: ❏ ${prefix}horoscopo <signo>*
> *✧･ﾟ: ❏ ${prefix}tarot*
> *✧･ﾟ: ❏ ${prefix}prediccion*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 ESTADÍSTICAS 📊 𐦯*
> *✧･ﾟ: ❏ ${prefix}topgrupo / ${prefix}rankgrupo*
> *✧･ﾟ: ❏ ${prefix}miperfil / ${prefix}miactividad*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 HERRAMIENTAS 🔧 𐦯*
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
> *✧･ﾟ: ❏ ${prefix}password / ${prefix}timestamp*
> *✧･ﾟ: ❏ ${prefix}base64 / ${prefix}binario / ${prefix}hex*
> *✧･ﾟ: ❏ ${prefix}checkurl / ${prefix}ascii*
> *✧･ﾟ: ❏ ${prefix}pokedex <nombre>*
> *✧･ﾟ: ❏ ${prefix}chiste / ${prefix}frase*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 DESCARGAS 🎵 𐦯*
> *✧･ﾟ: ❏ ${prefix}play <canción>*
> *✧･ﾟ: ❏ ${prefix}playvid <canción>*
> *✧･ﾟ: ❏ ${prefix}letra <canción>*
> *✧･ﾟ: ❏ ${prefix}pin <búsqueda o url>*
> *✧･ﾟ: ❏ ${prefix}enviartt <url tiktok>*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 STICKERS 🖼️ 𐦯*
> *✧･ﾟ: ❏ ${prefix}s / ${prefix}sticker*

*꒰⌢◌⃘࣭ ♡  ꒱ 𐔌 SUB-BOTS 👑 𐦯*
> *✧･ﾟ: ❏ ${prefix}code <número>*
> *✧･ﾟ: ❏ ${prefix}subbots / ${prefix}delsubbot*
> *✧･ﾟ: ❏ ${prefix}setnombre / ${prefix}setbanner*`

    const bannerBase64 = await getBannerBase64(bannerSrc)
    const bannerBuffer = bannerBase64
        ? Buffer.from(bannerBase64, 'base64')
        : await getBannerBuffer(bannerSrc)

    try {
        await conn.sendMessage(m.chat, {
            document: bannerBuffer || Buffer.from(''),
            mimetype: 'application/pdf',
            fileName: `『 ${nombreBot} Menu 』.pdf`,
            fileLength: 2199023255552,
            pageCount: 1,
            caption: txt,
            mentions: [sender],
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                externalAdReply: {
                    title: esSubbot ? `🤖 ${nombreBot}` : `💎 ${nombreBot}`,
                    body: esSubbot ? 'Sub-Bot 🤖' : 'Bot Premium 🌸',
                    mediaType: 1,
                    thumbnail: bannerBase64 || '',
                    renderLargerThumbnail: true,
                    sourceUrl: canalLink
                },
                forwardedNewsletterMessageInfo: {
                    newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                    newsletterName: global.newsletterName || nombreBot,
                    serverMessageId: -1
                }
            }
        }, { quoted: m })
    } catch (e) {
        console.error('[MENU ERROR]', e?.message)
        try {
            await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        } catch {}
    }
}

handler.command = ['menu', 'help', 'comandos']
export default handler