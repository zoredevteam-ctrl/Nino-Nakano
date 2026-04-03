import { exec } from 'child_process'
import chalk from 'chalk'

/**
 * Sistema de Actualización Automática - Nino Bot
 * @param {import('../lib/simple').smsg} m 
 */
let handler = async (m, { conn, isOwner }) => {
    // 1. Doble seguridad de Owner
    if (!isOwner) return m.reply('¡Lo siento mucho! 🥺 Pero mi creador Aarom me dijo que solo él puede usar esto. ¡No te enojes conmigo, por favor! 💕')

    await m.reply('¡Claro que sí! 😼 Dame un segundito, voy a revisar con cuidado si hay alguna actualización nueva. 🦋✨')

    // 2. Ejecutamos el comando Git
    exec('git pull', async (err, stdout, stderr) => {
        if (err) {
            console.error(chalk.red('[ERROR UPDATE]:'), err)
            return m.reply(`❌ *¡AY NO! ALGO SALIÓ MAL...* 😭 \n\n_Perdóname, parece que hay un pequeño error. ¿Me ayudas a revisarlo, por favor?:_\n\`\`\`${err.message}\`\`\``)
        }

        // 3. Caso: Ya está actualizado
        if (stdout.includes('Already up to date')) {
            return m.reply('¡Ya estoy al día! 🌸 No hay archivos nuevos, sigo estando en mi mejor versión para ti. 🥰✨')
        }

        // 4. Caso: Hay cambios nuevos
        if (stdout.includes('Updating') || stdout.includes('unpacking')) {
            let updateMsg = `✅ *¡SISTEMA ACTUALIZADO CON ÉXITO!* 🦋

> ꒰⌢ ʚ˚₊‧ ✎ ꒱ *CAMBIOS:*
\`\`\`${stdout}\`\`\`

Voy a reiniciarme rapidito para aplicar todas las cositas lindas que creó Aarom para mí... ¡No me tardo nada, espérame! 💕🌸`.trim()

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
            console.log(chalk.magentaBright('\n[!] Reiniciando bot por actualización...\n'))
            setTimeout(() => {
                process.exit(0)
            }, 2000)

        } else {
            // 6. Respuestas inesperadas
            return m.reply(`⚠️ *Tengo una respuesta inesperada:* 🥺\n\n${stdout || stderr}`)
        }
    })
}

handler.command = ['update', 'actualizar', 'gitpull', 'fix']
handler.owner = true 

export default handler
