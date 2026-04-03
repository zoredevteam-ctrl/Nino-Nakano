import { exec } from 'child_process'
import chalk from 'chalk'

/**
 * Sistema de Actualización Automática - Nino Bot
 * @param {import('../lib/simple').smsg} m 
 */
let handler = async (m, { conn, isOwner }) => {
    // 1. Doble seguridad de Owner (Aunque el handler ya lo hace)
    if (!isOwner) return m.reply('¿Qué crees que estás haciendo? 🙄 Solo mi creador puede tocar mis archivos internos. ¡Aléjate! 💅💢')

    await m.reply('Ugh, está bien... Revisaré si hay algo nuevo en el repositorio. No me hagas esperar mucho. 🦋')

    // 2. Ejecutamos el comando Git
    exec('git pull', async (err, stdout, stderr) => {
        if (err) {
            console.error(chalk.red('[ERROR UPDATE]:'), err)
            return m.reply(`❌ *¡UGH! ALGO SALIÓ MAL...* \n\n_Seguro Aarom rompió algo en el código. Arréglalo tonto:_\n\`\`\`${err.message}\`\`\``)
        }

        // 3. Caso: Ya está actualizado
        if (stdout.includes('Already up to date')) {
            return m.reply('No hay nada nuevo, tonto. Ya estoy en mi mejor versión. 🙄✨')
        }

        // 4. Caso: Hay cambios nuevos
        if (stdout.includes('Updating') || stdout.includes('unpacking')) {
            let updateMsg = `✅ *¡SISTEMA ACTUALIZADO CON ÉXITO!* 🦋

> ꒰⌢ ʚ˚₊‧ ✎ ꒱ *CAMBIOS:*
\`\`\`${stdout}\`\`\`

Reiniciando el sistema para aplicar las mejoras de *Z0RT SYSTEMS*... No te vayas, volveré enseguida. 💅✨`.trim()

            await conn.sendMessage(m.chat, { 
                text: updateMsg,
                contextInfo: {
                    externalAdReply: {
                        title: '🦋 NINO UPDATE SYSTEM 🦋',
                        body: 'Sincronización de Archivos Exitosa',
                        thumbnailUrl: global.banner,
                        sourceUrl: global.rcanal,
                        mediaType: 1,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })

            // 5. Reinicio Automático
            // Esto solo funciona si usas un script 'sh start.sh' o 'pm2'
            console.log(chalk.magentaBright('\n[!] Reiniciando bot por actualización...\n'))
            setTimeout(() => {
                process.exit(0)
            }, 2000)

        } else {
            // 6. Respuestas inesperadas
            return m.reply(`⚠️ *RESPUESTA INESPERADA:* \n\n${stdout || stderr}`)
        }
    })
}

handler.command = ['update', 'actualizar', 'gitpull', 'fix']
handler.owner = true // Solo los owners registrados en settings.js

export default handler
