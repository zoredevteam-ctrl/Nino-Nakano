let handler = async (nino, m, { from, isGroup, isOwner, sender }) => {
    if (!isGroup) return nino.sendMessage(from, { text: '¡Tonto! Este comando solo sirve en grupos.' }, { quoted: m });
    
    // Validar si el que lo usa es admin o el dueño
    const groupMetadata = await nino.groupMetadata(from);
    const participants = groupMetadata.participants;
    const isBotAdmin = participants.find(p => p.id === nino.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;
    const isAdmin = participants.find(p => p.id === sender)?.admin;

    if (!isAdmin && !isOwner) return nino.sendMessage(from, { text: '¿Quién te crees? Solo los admins pueden usar esto.' }, { quoted: m });
    if (!isBotAdmin) return nino.sendMessage(from, { text: 'Dame admin primero o no podré hacer nada, idiota.' }, { quoted: m });

    let user = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.message.extendedTextMessage?.contextInfo?.participant;
    if (!user) return nino.sendMessage(from, { text: 'Etiqueta a alguien o responde a su mensaje para echarlo.' }, { quoted: m });

    await nino.groupParticipantsUpdate(from, [user], 'remove');
    
    await nino.sendMessage(from, { 
        text: `🦋 Usuario eliminado. No molestes más.`,
        contextInfo: {
            externalAdReply: {
                title: global.botName,
                body: 'Sigue mi canal oficial',
                thumbnailUrl: global.banner,
                sourceUrl: global.rcanal,
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m });
};

handler.command = ['kick', 'echar'];
module.exports = handler;
