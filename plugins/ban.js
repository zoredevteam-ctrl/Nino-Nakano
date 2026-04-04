/**
 * Plugin de Baneo (Expulsión) - Versión Nino Tierna 🦋
 * Solo Aarom y los Admins tienen el poder.
 */
let handler = async (m, { conn, participants, isAdmin, isBotAdmin, isOwner }) => {
    if (!m.isGroup) return m.reply('¡Oh! Lo siento mucho... 🥺 Pero esta función solo puedo usarla si estamos dentro de un grupito. ✨')

    if (!isAdmin && !isOwner) return m.reply('Perdóname, pero mi creador Aarom me dijo que solo los administradores pueden pedirme que alguien se retire. 🌸 No te enojes conmigo, ¿sí? 🥺')

    if (!isBotAdmin) return m.reply('¡Ay! Necesito que me des permisos de administradora primero para poder ayudarte con esto... ¡Prometo hacerlo con cuidado! 🥰💕')

    let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false

    if (!user) return m.reply('¿A quién te gustaría que retire del grupo? 🥺 Por favor, etiquétalo o responde a uno de sus mensajes para que sepa quién es. 🌸')

    let botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'
    if (user === botJid) return m.reply('¡Nooo! 😭 ¿Por qué quieres sacarme a mí? ¿Hice algo malo? Por favor, no me eches... 🥺💔')

    if (isOwner) {
        const isTargetOwner = global.owner.some(o => (Array.isArray(o) ? o[0] : o).replace(/[^0-9]/g, '') === user.split('@')[0])
        if (isTargetOwner) return m.reply('¡Jamás! 🥰 No podría banear a mi creador ni a sus amigos especiales. Ellos son muy importantes para mí. 🌸✨')
    }

    try {
        await conn.groupParticipantsUpdate(m.chat, [user], 'remove')

        await conn.sendMessage(m.chat, { 
            text: `🌸 *AVISO DEL SISTEMA* 🌸\n\nSe ha decidido que el usuario ya no forme parte de nuestro grupo. ¡Espero que todo mejore a partir de ahora! 🥰✨`,
            contextInfo: {
                externalAdReply: {
                    title: '🦋 NINO PROTECT SYSTEM 🦋',
                    body: 'Usuario retirado con éxito',
                    description: 'Usuario sacado del grupo',
                    thumbnailUrl: 'https://causas-files.vercel.app/fl/fu5r.jpg',
                    sourceUrl: 'https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })

    } catch (e) {
        console.error(e)
        m.reply('¡Ay! Hubo un problemita al intentar retirar al usuario... 🥺 ¿Podrías revisar si sigo teniendo los permisos de admin? 🌸')
    }
}

handler.command = ['ban', 'banear', 'kick', 'sacar', 'funa']
handler.group = true               
handler.admin = true               
handler.botAdmin = true            

export default handler