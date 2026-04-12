import { database } from '../lib/database.js'

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
    // ✅ FIX DEFINITIVO: normalizar sender igual que el handler
    // Algunos usuarios llegan con :XX (multi-device) que no matchea en la DB
    const rawSender = m.sender || ''
    const sender    = rawSender.replace(/:[0-9A-Za-z]+(?=@s\.whatsapp\.net)/, '')
                               .split('@')[0].split(':')[0] + '@s.whatsapp.net'

    // ✅ FIX: El handler.before de otros plugins puede bloquear el #menu
    // Por eso procesamos el menú ANTES de cualquier lógica que pueda fallar
    // y lo hacemos todo en un try/catch con fallback simple garantizado
    const prefix    = usedPrefix || global.prefix || '#'
    const username  = m.pushName || 'Tesoro'
    const nombreBot = global.botName || 'Nino Nakano'
    const canalLink = global.rcanal || ''
    const esSubbot  = !!global._currentSubbotId

    // Saludo según hora
    const hora = new Date().getHours()
    const saludo =
        hora >= 5  && hora < 12 ? 'Buenos días ☀️'  :
        hora >= 12 && hora < 18 ? 'Buenas tardes 🌸' :
        hora >= 18 && hora < 22 ? 'Buenas noches 🌙' : 'Te veo de nuevo 🦋'

    const saludoBot = esSubbot
        ? `🤖 Hola *${username}*! Soy *${nombreBot}*, tu Sub-Bot de confianza~\n${saludo}, espero disfrutes todos mis comandos 💕`
        : `💎 Hola *${username}*! Soy *${nombreBot}* Premium Bot~\n${saludo}, espero disfrutes mis nuevos comandos 🌸`

    // Ping / Latencia
    const timestamp = m.messageTimestamp ? m.messageTimestamp * 1000 : Date.now()
    const p = `${Math.abs(Date.now() - timestamp)}ms`

    // Uptime
    const up = process.uptime()
    const uptime = `${Math.floor(up/86400)}d ${Math.floor((up%86400)/3600)}h ${Math.floor((up%3600)/60)}m ${Math.floor(up%60)}s`

    // ✅ getUser siempre crea el usuario si no existe
    let user, users, totalreg
    try {
        user      = database.getUser(sender)
        users     = database.data?.users || {}
        totalreg  = Object.keys(users).length
    } catch {
        user      = { limit: 0, exp: 0, level: 1 }
        users     = {}
        totalreg  = 0
    }

    const userMoney = user.limit   ?? 0
    const userExp   = user.xp ?? user.exp ?? 0
    const userLevel = user.level   ?? 1
    const rpg       = user.rpg     || null

    // Sub-bots activos
    const subbots      = database.data?.subbots || {}
    const totalSubbots = Object.keys(subbots).filter(k => subbots[k]?.connected).length

    // Rango
    const rango =
        userLevel < 5  ? 'Novato 🐣'     :
        userLevel < 15 ? 'Aprendiz 🦋'   :
        userLevel < 30 ? 'Guerrero ⚔️'   :
        userLevel < 50 ? 'Élite 🎖️'     : 'Nino Lover 💖'

    // Ranking
    let rankText = '---'
    try {
        const sorted   = Object.entries(users).sort((a, b) => (b[1]?.xp || b[1]?.exp || 0) - (a[1]?.xp || a[1]?.exp || 0))
        const rankIdx  = sorted.findIndex(u => u[0] === sender) + 1
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

    // ✅ Banner justo antes de enviar
    const bannerSrc = global.banner || ''
    const thumbnail = await getBannerBuffer(bannerSrc)

    // ✅ FIX DEFINITIVO: intentar envío completo, si falla → envío simple sin contextInfo
    try {
        await conn.sendMessage(m.chat, {
            text: txt,
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                    serverMessageId: '',
                    newsletterName: global.newsletterName || nombreBot
                },
                externalAdReply: {
                    title: esSubbot ? `🤖 ${nombreBot.toUpperCase()} SUB-BOT` : `💎 ${nombreBot.toUpperCase()} PREMIUM`,
                    body: esSubbot ? `Sub-Bot de ${nombreBot}` : 'Panel de Control de Aarom',
                    thumbnail,
                    sourceUrl: canalLink,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })
    } catch (e1) {
        console.error('[MENU] Error con contextInfo, intentando sin thumbnail...', e1?.message)
        // Segundo intento: sin thumbnail (puede ser que el buffer falle)
        try {
            await conn.sendMessage(m.chat, {
                text: txt,
                contextInfo: {
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                        serverMessageId: '',
                        newsletterName: global.newsletterName || nombreBot
                    },
                    externalAdReply: {
                        title: esSubbot ? `🤖 ${nombreBot.toUpperCase()} SUB-BOT` : `💎 ${nombreBot.toUpperCase()} PREMIUM`,
                        body: esSubbot ? `Sub-Bot de ${nombreBot}` : 'Panel de Control de Aarom',
                        sourceUrl: canalLink,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })
        } catch (e2) {
            console.error('[MENU] Error sin thumbnail, enviando texto plano...', e2?.message)
            // Tercer intento: texto plano garantizado
            try {
                await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
            } catch (e3) {
                console.error('[MENU] Error crítico:', e3?.message)
            }
        }
    }
}

handler.command = ['menu', 'help', 'comandos']
export default handler