import { jidDecode, downloadContentFromMessage, getContentType } from '@whiskeysockets/baileys';

/**
 * Decodifica JIDs de forma universal
 */
export const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {};
        return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
    }
    return jid;
};

/**
 * Descarga media optimizada (usa arreglos en lugar de concatenación constante)
 */
export const downloadMedia = async (message) => {
    let type = Object.keys(message)[0];
    let msg = message[type];
    if (type === 'buttonsMessage' || type === 'viewOnceMessage' || type === 'viewOnceMessageV2') {
        type = Object.keys(msg.message)[0];
        msg = msg.message[type];
    }
    const stream = await downloadContentFromMessage(msg, type.replace('Message', ''));
    let chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

/**
 * Procesa el mensaje para que sea fácil de usar en los plugins
 */
export async function smsg(conn, m) {
    if (!m) return m;
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') || m.id.startsWith('3EB0'); // Detecta bots comunes
        m.chat = conn.decodeJid(m.key.remoteJid);
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '');
    }

    if (m.message) {
        m.mtype = getContentType(m.message); // Método oficial de Baileys para detectar tipo
        m.msg = m.message[m.mtype];
        
        // Manejo de mensajes efímeros y vistos una vez
        if (m.mtype === 'ephemeralMessage' || m.mtype === 'viewOnceMessage' || m.mtype === 'viewOnceMessageV2') {
            m.msg = m.msg.message[getContentType(m.msg.message)];
            m.mtype = getContentType(m.message.ephemeralMessage?.message || m.message.viewOnceMessage?.message || m.message.viewOnceMessageV2?.message);
        }

        // Extracción de texto inteligente
        m.body = m.message.conversation || m.msg?.caption || m.msg?.text || m.msg?.selectedDisplayText || m.msg?.singleSelectReply?.selectedRowId || m.msg?.selectedButtonId || m.mtype || '';
        m.text = m.body; // Alias para comodidad

        // --- MANEJO DE MENSAJES CITADOS (QUOTED) ---
        let quoted = m.msg?.contextInfo ? m.msg.contextInfo.quotedMessage : null;
        if (quoted) {
            let qtype = getContentType(quoted);
            m.quoted = quoted[qtype];
            if (['extendedTextMessage', 'conversation'].includes(qtype)) {
                m.quoted.text = m.quoted.text || m.quoted.conversation || m.quoted;
            }
            m.quoted.mtype = qtype;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = conn.decodeJid(m.msg.contextInfo.remoteJid || m.chat);
            m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user.id);
            m.quoted.text = m.quoted.text || m.quoted.caption || '';
            
            // Función para descargar media del citado
            m.quoted.download = () => conn.downloadMedia(m.quoted);
        }
    }

    // --- FUNCIONES DE ATAJO ---
    m.reply = (text, chatId, options) => conn.sendMessage(chatId ? chatId : m.chat, { text: text }, { quoted: m, ...options });
    
    // Función para descargar media del mensaje actual
    m.download = () => downloadMedia(m.message);

    return m;
}
