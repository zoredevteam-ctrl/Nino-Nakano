import { jidDecode, downloadContentFromMessage } from '@whiskeysockets/baileys';

/**
 * Decodifica un JID para que sea legible (ej: de 573...:1@s.whatsapp.net a 573...@s.whatsapp.net)
 */
export const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
    } else return jid;
};

/**
 * Descarga media de un mensaje de forma simplificada
 */
export const downloadMedia = async (message) => {
    let type = Object.keys(message)[0];
    let msg = message[type];
    if (type === 'buttonsMessage' || type === 'viewOnceMessage' || type === 'viewOnceMessageV2') {
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

/**
 * Función smsg simplificada para procesar el mensaje y que el handler lo entienda
 */
export async function smsg(conn, m) {
    if (!m) return m;
    let M = m.constructor;
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = conn.decodeJid(m.key.remoteJid);
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '');
    }
    if (m.message) {
        m.mtype = Object.keys(m.message)[0];
        m.msg = m.message[m.mtype];
        if (m.mtype === 'ephemeralMessage') {
            m.message = m.msg.message;
            m.mtype = Object.keys(m.message)[0];
            m.msg = m.message[m.mtype];
        }
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || m.mtype;
    }
    return m;
}
