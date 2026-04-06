import { readdirSync } from 'fs'
import { resolve, join } from 'path'
import { pathToFileURL } from 'url'
import chalk from 'chalk'

const getThumbnail = async () => {
    try {
        const res = await fetch(global.banner || 'https://causas-files.vercel.app/fl/fu5r.jpg')
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

let handler = async (m, { conn, isOwner }) => {
    if (!isOwner) return m.reply('💕 Solo mis dueños pueden revisar mis plugins.')

    await m.react('🔍')

    const pluginsDir = resolve('./plugins')
    let files = []

    try {
        files = readdirSync(pluginsDir).filter(f => f.endsWith('.js'))
    } catch (e) {
        await m.react('❌')
        return m.reply(`❌ No encontré la carpeta plugins:\n${e.message}`)
    }

    const ok = []
    const errores = []
    const sinComando = []

    for (const file of files) {
        try {
            const filePath = join(pluginsDir, file)
            const url = pathToFileURL(filePath).href + `?check=${Date.now()}`
            const mod = await import(url)
            const plugin = mod.default

            if (!plugin) {
                sinComando.push({ file, motivo: 'No exporta default' })
                continue
            }

            const cmds = plugin.command || plugin.handler?.command
            if (!cmds || (Array.isArray(cmds) && cmds.length === 0)) {
                sinComando.push({ file, motivo: 'Sin comandos definidos' })
                continue
            }

            const fn = typeof plugin.run === 'function' ? plugin.run : typeof plugin === 'function' ? plugin : null
            if (!fn) {
                sinComando.push({ file, motivo: 'No tiene función run o export' })
                continue
            }

            ok.push({ file, cmds: Array.isArray(cmds) ? cmds.length : 1 })
        } catch (e) {
            errores.push({ file, error: e.message.split('\n')[0].slice(0, 120) })
        }
    }

    const total = files.length
    const thumbnail = await getThumbnail()

    let txt = `🔍 *DIAGNÓSTICO DE PLUGINS*\n\n`
    txt += `📊 Total escaneados: *${total}*\n`
    txt += `✅ Funcionando: *${ok.length}*\n`
    txt += `❌ Con error: *${errores.length}*\n`
    txt += `⚠️ Sin comando: *${sinComando.length}*\n`
    txt += `\n`

    if (ok.length) {
        txt += `✅ *PLUGINS OK:*\n`
        ok.forEach(p => {
            txt += `  › ${p.file} (${p.cmds} cmd${p.cmds > 1 ? 's' : ''})\n`
        })
        txt += `\n`
    }

    if (errores.length) {
        txt += `❌ *PLUGINS CON ERROR:*\n`
        errores.forEach(p => {
            txt += `  › *${p.file}*\n    ${p.error}\n`
        })
        txt += `\n`
    }

    if (sinComando.length) {
        txt += `⚠️ *SIN COMANDO DEFINIDO:*\n`
        sinComando.forEach(p => {
            txt += `  › ${p.file} — ${p.motivo}\n`
        })
    }

    if (errores.length === 0) {
        txt += `\n_🎉 ¡Todos los plugins cargaron sin errores!_ 🦋`
    } else {
        txt += `\n_Usa *#update* para intentar arreglarlos_ 🔧`
    }

    console.log(chalk.magentaBright(`[CHECKPLUGINS] OK:${ok.length} ERR:${errores.length} WARN:${sinComando.length}`))
    await m.react(errores.length ? '⚠️' : '✅')

    return conn.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                serverMessageId: '',
                newsletterName: global.newsletterName || 'Nino Nakano'
            },
            externalAdReply: {
                title: `🔍 ${errores.length ? errores.length + ' ERRORES ENCONTRADOS' : 'TODO OK'}`,
                body: `${global.botName || 'Nino Nakano'} — Diagnóstico`,
                mediaType: 1,
                mediaUrl: global.rcanal || '',
                sourceUrl: global.rcanal || '',
                thumbnail,
                showAdAttribution: false,
                containsAutoReply: true,
                renderLargerThumbnail: false
            }
        }
    }, { quoted: m })
}

handler.command = ['checkplugins', 'plugins', 'diagnose', 'diagnostico']
handler.owner = true
export default handler
