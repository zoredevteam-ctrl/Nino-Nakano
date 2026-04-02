let handler = async (nino, m, { from, isGroup, isOwner, sender }) => {
    if (!isGroup) return;
    const groupMetadata = await nino.groupMetadata(from);
    const participants = groupMetadata.participants;
    const isAdmin = participants.find(p => p.id === sender)?.admin;

    if (!isAdmin && !isOwner) return;

    let user = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.message.extendedTextMessage?.contextInfo?.participant;
    if (!user) return nino.sendMessage(from, { text: '¿A quién quieres banear? Etiquétalo.' }, { quoted: m });

    await nino.groupParticipantsUpdate(from, [user], 'remove');
    
    await nino.sendMessage(from, { 
        text: `🚫 *USUARIO BANEADO* 🚫\n\nFuiste expulsado por mal comportamiento. No vuelvas.`,
        contextInfo: {
            externalAdReply: {
                title: 'SISTEMA DE SEGURIDAD NINO',
                body: 'Canal Oficial de Actualizaciones',
                thumbnailUrl: global.banner,
                sourceUrl: global.rcanal,
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m });
};

handler.command = ['ban', 'banear'];
module.exports = handler;
