import { jidDecode, downloadContentFromMessage, getContentType, extractMessageContent } from '@whiskeysockets/baileys';
import chalk from 'chalk';

/**
 * Decodifica JIDs para evitar el error del :1 o :2 (LID/Multi-device)
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
 * Procesa el mensaje crudo y lo inyecta con funciones útiles
 * @param {import('@whiskeysockets/baileys').BaileysEventEmitter} conn 
 * @param {import('@whiskeysockets/baileys').proto.IWebMessageInfo} m 
 */
export async function smsg(conn, m) {
    if (!m) return m;
    let M = m.constructor;
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = decodeJid(m.key.remoteJid);
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '');
    }

    if (m.message) {
        // Extraemos el contenido real (manejando viewOnce, ephemeral, etc.)
        m.message = extractMessageContent(m.message);
        m.mtype = getContentType(m.message);
        m.msg = m.message[m.mtype];

        // Extracción de texto inteligente (Cuerpo del mensaje)
        m.body = (m.mtype === 'conversation') ? m.message.conversation : 
                 (m.mtype === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                 (m.mtype === 'imageMessage') ? m.message.imageMessage.caption : 
                 (m.mtype === 'videoMessage') ? m.message.videoMessage.caption : 
                 (m.mtype === 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                 (m.mtype === 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : 
                 (m.mtype === 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : 
                 (m.mtype === 'interactiveResponseMessage') ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : '';
        
        m.text = m.body || '';

        // Menciones
        let quoted = m.msg?.contextInfo ? m.msg.contextInfo.quotedMessage : null;
        m.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : [];

        if (quoted) {
            let qtype = getContentType(quoted);
            m.quoted = quoted[qtype];
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted };
            m.quoted.mtype = qtype;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = decodeJid(m.msg.contextInfo.remoteJid || m.chat);
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
            m.quoted.sender = decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === decodeJid(conn.user.id);
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || '';
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
            
            // Función para descargar media del citado
            m.quoted.download = () => downloadMedia(m.quoted);
        }
    }

    // --- FUNCIONES INYECTADAS (FACILITADORES) ---

    // Responder rápido
    m.reply = (text, chatId, options) => conn.sendMessage(chatId ? chatId : m.chat, { text: text }, { quoted: m, ...options });

    // Reaccionar rápido
    m.react = (emoji) => conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } });

    // Eliminar mensaje
    m.delete = () => conn.sendMessage(m.chat, { delete: m.key });

    // Descargar media del mensaje actual
    m.download = () => downloadMedia(m.message);

    // Copiar y reenviar
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options);

    return m;
}

/**
 * Descarga de archivos eficiente
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
