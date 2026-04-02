const { exec } = require('child_process');
require('../settings');

let handler = async (nino, m, { from, isOwner }) => {
    if (!isOwner) return nino.sendMessage(from, { text: global.mess.owner }, { quoted: m });

    await nino.sendMessage(from, { text: 'Revisando si hay actualizaciones en el repositorio... 🦋' }, { quoted: m });

    exec('git pull', async (err, stdout, stderr) => {
        if (err) {
            return nino.sendMessage(from, { 
                text: `❌ *Error al actualizar:* \n\n${err.message}` 
            }, { quoted: m });
        }

        if (stdout.includes('Already up to date.')) {
            return nino.sendMessage(from, { 
                text: 'No hay nada nuevo, tonto. El bot ya está actualizado a la última versión. 🙄✨' 
            }, { quoted: m });
        }

        if (stdout.includes('Updating')) {
            let updateMsg = `✅ *¡ACTUALIZACIÓN EXITOSA!*\n\n*Cambios:* \n${stdout}\n\nReiniciando el sistema para aplicar los cambios... 🦋`;

            await nino.sendMessage(from, { 
                text: updateMsg,
                contextInfo: {
                    externalAdReply: {
                        title: 'SISTEMA ACTUALIZADO',
                        body: 'Power by 𝓐𝓪𝓻𝓸𝓶',
                        thumbnailUrl: global.banner,
                        sourceUrl: global.rcanal,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

            process.exit(0); 
        }

        // ✅ FIX: Respuesta si git retorna algo inesperado
        if (stderr || stdout) {
            return nino.sendMessage(from, {
                text: `⚠️ *Respuesta de Git:*\n\n${stdout || stderr}`
            }, { quoted: m });
        }
    });
};