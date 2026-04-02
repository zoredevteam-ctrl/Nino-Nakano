const { jidDecode, downloadContentFromMessage } = require('@whiskeysockets/baileys');

/**
 * Decodifica un JID para que sea legible (ej: de 573...:1@s.whatsapp.net a 573...@s.whatsapp.net)
 */
const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
    } else return jid;
};

/**
 * Descarga media de un mensaje de forma simplificada
 */
const downloadMedia = async (message) => {
    let type = Object.keys(message)[0];
    let msg = message[type];
    if (type === 'buttonsMessage' || type === 'viewOnceMessage') {
        type = Object.keys(msg.message)[0];
        msg = msg.message[type];
    }
    const stream = await downloadContentFromMessage(msg, type.replace('Message', ''));
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
};

module.exports = { decodeJid, downloadMedia };
