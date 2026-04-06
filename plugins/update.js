import { exec } from 'child_process'
import chalk from 'chalk'

const getThumbnail = async () => {
    try {
        const res = await fetch(global.banner || 'https://causas-files.vercel.app/fl/fu5r.jpg')
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const sendUpdate = async (conn, m, text) => {
    const thumbnail = await getThumbnail()
    return conn.sendMessage(m.chat, {
        text,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                serverMessageId: '',
                newsletterName: global.newsletterName || 'Nino Nakano'
            },
            externalAdReply: {
                title: '🦋 NINO UPDATE SYSTEM',
                body: 'Sistema de Actualización',
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

let handler = async (m, { conn, isOwner }) => {
    if (!isOwner) return m.reply('¡Lo siento mucho! 🎀 Solo mi creador puede usar esto. ¡No te enojes! ✨')

    await sendUpdate(conn, m, '🔍 Revisando actualizaciones... Dame un segundo 🦋')

    exec('git pull', async (err, stdout, stderr) => {
        if (err) {
            console.error(chalk.red('[ERROR UPDATE]:'), err)
            return sendUpdate(conn, m,
                `❌ *¡ERROR AL ACTUALIZAR!* 🎀\n\n` +
                `\`\`\`${err.message.slice(0, 300)}\`\`\``
            )
        }

        // Ya está actualizado
        if (stdout.includes('Already up to date')) {
            return sendUpdate(conn, m,
                `✅ *¡Ya estoy al día!* 🌸\n\n` +
                `No hay cambios nuevos, sigo siendo tu mejor versión 👑\n\n` +
                `_Si quieres reiniciar igual usa *#restart*_ 🦋`
            )
        }

        // Hay cambios nuevos — recargar plugins sin reiniciar
        if (stdout.includes('Updating') || stdout.includes('Fast-forward') || stdout.includes('unpacking')) {
            await sendUpdate(conn, m,
                `✅ *¡ACTUALIZACIÓN EXITOSA!* 🦋\n\n` +
                `📋 *Cambios aplicados:*\n\`\`\`${stdout.slice(0, 400)}\`\`\`\n\n` +
                `🔄 Recargando plugins automáticamente...\n` +
                `_No es necesario reiniciar_ 🌸`
            )

            // Recargar plugins dinámicamente sin reiniciar el proceso
            try {
                const { readdirSync } = await import('fs')
                const { resolve, join } = await import('path')
                const { pathToFileURL } = await import('url')

                const pluginsDir = resolve('./plugins')
                const files = readdirSync(pluginsDir).filter(f => f.endsWith('.js'))
                let recargados = 0

                for (const file of files) {
                    try {
                        const filePath = join(pluginsDir, file)
                        const url = pathToFileURL(filePath).href + `?t=${Date.now()}`
                        const mod = await import(url)
                        if (mod.default) {
                            global.plugins?.set(file, mod.default)
                            recargados++
                        }
                    } catch (e) {
                        console.error(chalk.red(`[UPDATE] Error recargando ${file}:`), e.message)
                    }
                }

                console.log(chalk.magentaBright(`[UPDATE] ${recargados} plugins recargados`))

                return sendUpdate(conn, m,
                    `🎉 *¡Todo listo!*\n\n` +
                    `✅ ${recargados} plugins recargados\n` +
                    `_Los cambios ya están activos sin reiniciar_ 🦋`
                )
            } catch (e) {
                console.error(chalk.red('[UPDATE] Error recargando plugins:'), e.message)
                // Si falla la recarga, reiniciar como fallback
                await sendUpdate(conn, m,
                    `⚠️ No pude recargar los plugins automáticamente.\n` +
                    `Reiniciando en 3 segundos... 🔄`
                )
                setTimeout(() => process.exit(0), 3000)
            }
        } else {
            return sendUpdate(conn, m,
                `⚠️ *Respuesta inesperada de git:*\n\n` +
                `\`\`\`${(stdout || stderr || 'Sin respuesta').slice(0, 300)}\`\`\``
            )
        }
    })
}

handler.command = ['update', 'actualizar', 'gitpull']
handler.owner = true
export default handler
