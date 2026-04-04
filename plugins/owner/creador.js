/**
 * Comando de Contacto - Nino Bot (Edición Tierna)
 * @param {import('../lib/simple').smsg} m 
 */
let handler = async (m, { conn }) => {
    const contactNumber = '573107400303'
    const name = 'Aarom'

    // Formato VCard para el contacto
    const vcard = `BEGIN:VCARD
VERSION:3.0
N:;${name};;;
FN:${name}
ORG:Z0RT SYSTEMS
TITLE:Creador Único
TEL;type=CELL;type=VOICE;waid=${contactNumber}:${contactNumber}
END:VCARD`

    // Respuesta con el contacto y un mensaje tierno
    await conn.sendMessage(m.chat, {
        contacts: {
            displayName: name,
            contacts: [{ vcard }]
        },
        contextInfo: {
            externalAdReply: {
                title: '🦋 MI CREADOR 🦋',
                body: 'Aarom es quien me dio vida',
                thumbnailUrl: global.banner,
                sourceUrl: global.rcanal,
                mediaType: 1,
                showAdAttribution: true,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m })

    await m.reply('¡Hola! Aquí tienes el contacto de Aarom. Él es quien creó todo mi sistema y quien me cuida siempre. ✨🦋 Si necesitas algo importante, puedes escribirle.')
}

handler.help = ['owner', 'creator']
handler.tags = ['main']
handler.command = ['owner', 'creator', 'creador', 'dueño', 'contacto']

export default handler
