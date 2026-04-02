import { exec } from 'child_process'

/**
 * Plugin de actualización automática vía Git
 */
let handler = async (conn, m, { text, isOwner }) => {
    // Nota: El handler ya bloquea si pones 'handler.owner = true' abajo, 
    // pero dejamos este mensaje por si acaso con la personalidad de Nino.
    if (!isOwner) return m.reply('🦋 *¡Oye!* ¿Qué crees que haces intentando tocar mis archivos? Solo Aarom puede actualizarme. 💅💢')

    await m.reply('Revisando si hay algo nuevo en el repositorio... No me hagas esperar. 🦋')

    exec('git pull', async (err, stdout, stderr) => {
        if (err) {
            return m.reply(`❌ *¡Ugh, un error!* \n\n\`\`\`${err.message}\`\`\``)
        }

        if (stdout.includes('Already up to date')) {
            return m.reply('No hay nada nuevo, tonto. El bot ya está actualizado a la última versión. 🙄✨')
        }

        if (stdout.includes('Updating') || stdout.includes('unpacking')) {
            let updateMsg = `✅ *¡ACTUALIZACIÓN EXITOSA!*\n\n*Cambios detectados:* \n\`\`\`${stdout}\`\`\`\n\nReiniciando el sistema para aplicar los cambios... No te vayas. 🦋`

            await conn.sendMessage(m.chat, { 
                text: updateMsg,
                contextInfo: {
                    externalAdReply: {
                        title: 'NINO - SISTEMA ACTUALIZADO',
                        body: 'Power by 𝓐𝓪𝓻om | Z0RT SYSTEMS',
                        thumbnailUrl: global.banner, // Asegúrate de tener global.banner en settings.js
                        sourceUrl: global.rcanal,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })

            // Esperamos un segundo antes de apagar para que el mensaje se envíe bien
            setTimeout(() => {
                process.exit(0)
            }, 1500)
        } else {
            return m.reply(`⚠️ *Respuesta extraña de Git:* \n\n${stdout || stderr}`)
        }
    })
}

// --- CONFIGURACIÓN DEL COMANDO ---
handler.command = ['update', 'actualizar', 'gitpull'] // Comandos que activan el plugin
handler.owner = true // 🛡️ EL HANDLER BLOQUEA AUTOMÁTICAMENTE A LOS QUE NO SEAN OWNER

export default handler
