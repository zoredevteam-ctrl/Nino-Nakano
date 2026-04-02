/**
 * Plugin para expulsar usuarios de un grupo
 */
let handler = async (conn, m, { participants, isBotAdmin, isOwner, userAdmin }) => {
    // El handler ya verifica esto si activamos las propiedades abajo, 
    // pero mantenemos los mensajes con la personalidad de Nino:
    if (!m.isGroup) return m.reply('🦋 ¡Tonto! Este comando solo sirve en grupos. No sé qué intentas hacer aquí. 🙄')
    
    if (!userAdmin && !isOwner) return m.reply('🦋 ¿Quién te crees? Solo los admins pueden darme órdenes de este tipo. 💅')
    
    if (!isBotAdmin) return m.reply('🦋 ¡Dame admin primero! No puedo echar a nadie si no tengo poder en el grupo, idiota. ✨')

    // Obtener el usuario a expulsar (por mención o por respuesta a mensaje)
    let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false
    
    if (!user) return m.reply('🦋 Etiqueta a alguien o responde a su mensaje para que pueda echarlo de una vez. 💢')

    // Evitar que el bot se intente echar a sí mismo o al dueño
    if (user === conn.user.jid) return m.reply('🦋 ¿Intentas echarme a mí? Qué gracioso... pero no va a pasar. 🙄')

    // Ejecutar la expulsión
    await conn.groupParticipantsUpdate(m.chat, [user], 'remove')

    // Mensaje de confirmación con estilo
    await conn.sendMessage(m.chat, { 
        text: `🦋 Usuario eliminado. Espero que no vuelva a molestar, ugh.`,
        contextInfo: {
            externalAdReply: {
                title: 'NINO - MODERACIÓN 🦋',
                body: 'Usuario expulsado con éxito',
                thumbnailUrl: global.banner,
                sourceUrl: global.rcanal,
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m })
}

// --- CONFIGURACIÓN ---
handler.command = ['kick', 'echar', 'sacar', 'ban'] // Comandos
handler.group = true       // Solo funciona en grupos
handler.admin = true       // Solo admins pueden usarlo
handler.botAdmin = true    // El bot necesita ser admin

export default handler
