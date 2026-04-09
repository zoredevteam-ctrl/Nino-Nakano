/**
 * INFOBOT - NINO NAKANO
 * Comando: #infobot
 * Muestra información completa del bot
 */

import os from 'os'

let handler = async (m, { conn }) => {
    try {
        const nombreBot  = global.botName    || 'Nino Nakano'
        const version    = global.botVersion || '1.0.0'
        const ownerName  = global.ownerName  || 'Aarom'
        const canalLink  = global.rcanal     || ''
        const bannerUrl  = global.banner     || ''
        const prefix     = global.prefix     || '#'
        const esSubbot   = !!global._currentSubbotId

        // ── Uptime ────────────────────────────────────────────────────────────
        const uptimeSec = process.uptime()
        const d   = Math.floor(uptimeSec / 86400)
        const h   = Math.floor((uptimeSec % 86400) / 3600)
        const min = Math.floor((uptimeSec % 3600) / 60)
        const s   = Math.floor(uptimeSec % 60)
        const uptime = `${d}d ${h}h ${min}m ${s}s`

        // ── Memoria ───────────────────────────────────────────────────────────
        const memUsed  = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)
        const memTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1)
        const memFree  = (os.freemem()  / 1024 / 1024 / 1024).toFixed(1)

        // ── CPU ───────────────────────────────────────────────────────────────
        const cpus    = os.cpus()
        const cpuName = cpus[0]?.model?.trim() || 'Desconocido'
        const cpuNucl = cpus.length

        // ── Sistema ───────────────────────────────────────────────────────────
        const platform = os.platform()
        const arch     = os.arch()
        const nodeVer  = process.version

        // ── Plataforma legible ────────────────────────────────────────────────
        const plataformas = { linux: '🐧 Linux', win32: '🪟 Windows', darwin: '🍎 macOS', android: '🤖 Android' }
        const plataforma  = plataformas[platform] || platform

        // ── Tipo de bot ───────────────────────────────────────────────────────
        const tipoBot = esSubbot ? '🤖 Sub-Bot' : '💎 Bot Principal'

        const txt =
`*╭╼𝅄꒰ 🤖 ꒱ 𐔌 INFO DEL BOT 𐦯*
*|✎ Nombre:* ${nombreBot}
*|✎ Versión:* v${version}
*|✎ Tipo:* ${tipoBot}
*|✎ Creador:* ${ownerName}
*|✎ Prefijo:* ${prefix}
*|✎ Canal:* ${canalLink}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ🦋◌⃘⃪۪𐇽֟፝۫۬🦋◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*╭╼𝅄꒰ ⚙️ ꒱ 𐔌 SISTEMA 𐦯*
*|✎ Plataforma:* ${plataforma}
*|✎ Arquitectura:* ${arch}
*|✎ Node.js:* ${nodeVer}
*|✎ CPU:* ${cpuName}
*|✎ Núcleos:* ${cpuNucl}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ⚙️◌⃘⃪۪𐇽֟፝۫۬⚙️◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*╭╼𝅄꒰ 📊 ꒱ 𐔌 RENDIMIENTO 𐦯*
*|✎ Uptime:* ${uptime}
*|✎ RAM usada:* ${memUsed} MB
*|✎ RAM total:* ${memTotal} GB
*|✎ RAM libre:* ${memFree} GB
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ📊◌⃘⃪۪𐇽֟፝۫۬📊◌⃘࣭☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

> _Construido con 💕 por ${ownerName} — Z0RT SYSTEMS_`

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
                    title: `🤖 ${nombreBot.toUpperCase()} v${version}`,
                    body: `${tipoBot} — ${plataforma}`,
                    thumbnailUrl: bannerUrl,
                    sourceUrl: canalLink,
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })

    } catch (e) {
        console.error('[INFOBOT ERROR]', e)
        await m.reply(`❌ Error al obtener la info del bot: ${e.message}`)
    }
}

handler.command = ['infobot', 'botinfo', 'info']
export default handler