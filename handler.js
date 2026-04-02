require('./settings');

module.exports = async (nino, chatUpdate) => {
    try {
        const msg = chatUpdate.messages[0];
        if (!msg.message) return;
        // Ignoramos los estados para ahorrar memoria
        if (msg.key && msg.key.remoteJid === 'status@broadcast') return; 

        // Extracción segura del texto del mensaje
        const type = Object.keys(msg.message)[0];
        const content = type === 'conversation' ? msg.message.conversation
                      : type === 'extendedTextMessage' ? msg.message.extendedTextMessage.text
                      : type === 'imageMessage' ? msg.message.imageMessage.caption
                      : type === 'videoMessage' ? msg.message.videoMessage.caption : '';

        const isCmd = content.startsWith(global.prefix);
        const command = isCmd ? content.slice(global.prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = content.trim().split(/ +/).slice(1);
        
        const sender = msg.key.participant || msg.key.remoteJid;
        const senderNumber = sender.split('@')[0];
        const isOwner = global.ownerNumber === senderNumber;

        if (isCmd) {
            console.log(`[⚡ COMANDO] ${command} | Usuario: ${senderNumber}`);
            
            switch (command) {
                case 'menu':
                case 'help':
                    const menuText = `🦋 *SISTEMA NINO NAKANO* 🦋\n\nHola, soy ${global.botName}.\nNo creas que hago esto porque me agradas, ¿entendido? 🙄\n\n*Prefijo:* [ ${global.prefix} ]\n\n*Comandos:* \n${global.prefix}ping\n${global.prefix}owner\n\n_Powered by ${global.ownerName}_`;
                    
                    await nino.sendMessage(msg.key.remoteJid, { text: menuText }, { quoted: msg });
                    break;

                case 'ping':
                    await nino.sendMessage(msg.key.remoteJid, { text: '¡Pong! ✨ Los servidores están respondiendo al instante.' }, { quoted: msg });
                    break;

                case 'owner':
                    if (!isOwner) return nino.sendMessage(msg.key.remoteJid, { text: global.mess.owner }, { quoted: msg });
                    await nino.sendMessage(msg.key.remoteJid, { text: 'Hola Creador. Mi sistema está operando a la perfección. 💜' }, { quoted: msg });
                    break;

                default:
                    // Se ignoran silenciosamente los comandos que no existen para no hacer spam en los grupos
                    break;
            }
        }
    } catch (err) {
        console.error('Error procesando el comando:', err);
        // Responder con error manejado si algo falla en la ejecución
        await nino.sendMessage(chatUpdate.messages[0].key.remoteJid, { text: global.mess.error });
    }
};
