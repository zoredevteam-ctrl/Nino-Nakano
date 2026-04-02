/**
 * Plugin de Baneo (Expulsión Directa) con estilo Nino Nakano
 */
let handler = async (conn, m, { participants, isBotAdmin, isOwner, userAdmin }) => {
    // Estas validaciones son automáticas con las propiedades de abajo, 
    // pero las dejamos con la actitud de Nino por si acaso.
    if (!m.isGroup) return m.reply('🦋 ¡Tonto! No puedes banear a nadie aquí, esto no es un grupo. 🙄')
    
    if (!userAdmin && !isOwner) return m.reply('🦋 ¿Quién te crees que eres? Solo los admins pueden decidir quién se queda y quién se va. 💅')
    
    if (!isBotAdmin) return m.reply('🦋 ¡Hazme Admin primero! No tengo poder para echar a nadie si no me das los permisos, idiota. 💢')

    // Detectar al usuario por mención, respuesta o el JID que venga en el mensaje
    let user = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false
    
    if (!user) return m.reply('🦋 ¿A quién quieres banear? Etiquétalo o responde a su mensaje de una vez. No tengo todo el día. 🙄')

    // Seguridad: No banearse a sí misma ni al dueño
    if (user === conn.user.jid) return m.reply('🦋 ¿Intentas banearme a mí? Qué gracioso... Inténtalo de nuevo y verás. 💅')
    const owners = global.owner.map(o => o[0])
    if (owners.includes(user.split('@')[0])) return m.reply('🦋 Ni lo pienses. No voy a banear a mi creador Aarom por un capricho tuyo. 💢')

    // Ejecutar el baneo (Remover del grupo)
    await conn.groupParticipantsUpdate(m.chat, [user], 'remove')

    // Mensaje de baneo con estilo Nino
    await conn.sendMessage(m.chat, { 
        text: `🚫 *USUARIO BANEADO* 🚫\n\nFuiste expulsado por mal comportamiento. Ni se te ocurra volver por aquí, ugh. 🦋✨`,
        contextInfo: {
            externalAdReply: {
                title: 'SISTEMA DE SEGURIDAD NINO 🦋',
                body: 'Expulsión ejecutada correctamente',
                thumbnailUrl: global.banner,
                sourceUrl: global.rcanal,
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m })
}

// --- CONFIGURACIÓN DEL COMANDO ---
handler.command = ['ban', 'banear'] // Comandos
handler.group = true               // Solo grupos
handler.admin = true               // Solo admins
handler.botAdmin = true            // El bot debe ser admin

export default handler
