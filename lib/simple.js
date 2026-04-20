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
 * Extrae el texto de un mensaje sin importar el tipo
 * Cubre todos los tipos conocidos de Baileys 7
 */
const extractBody = (mtype, message, msg) => {
    if (!mtype || !message) return ''

    switch (mtype) {
        case 'conversation':
            return message.conversation || ''
        case 'extendedTextMessage':
            return message.extendedTextMessage?.text || ''
        case 'imageMessage':
            return message.imageMessage?.caption || ''
        case 'videoMessage':
            return message.videoMessage?.caption || ''
        case 'documentMessage':
            return message.documentMessage?.caption || ''
        case 'documentWithCaptionMessage':
            return message.documentWithCaptionMessage?.message?.documentMessage?.caption || ''
        case 'buttonsResponseMessage':
            return message.buttonsResponseMessage?.selectedButtonId || ''
        case 'listResponseMessage':
            return message.listResponseMessage?.singleSelectReply?.selectedRowId || ''
        case 'templateButtonReplyMessage':
            return message.templateButtonReplyMessage?.selectedId || ''
        case 'interactiveResponseMessage': {
            try {
                return JSON.parse(message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson)?.id || ''
            } catch { return '' }
        }
        case 'ephemeralMessage': {
            // Mensaje efímero — extraer el tipo interno
            const inner = message.ephemeralMessage?.message
            if (!inner) return ''
            const innerType = getContentType(inner)
            return extractBody(innerType, inner, inner[innerType])
        }
        case 'viewOnceMessage':
        case 'viewOnceMessageV2': {
            const inner = msg?.message
            if (!inner) return ''
            const innerType = getContentType(inner)
            return extractBody(innerType, inner, inner[innerType])
        }
        default:
            // Intentar extraer texto genérico del msg
            return msg?.text || msg?.caption || msg?.conversation || ''
    }
}

/**
 * Procesa el mensaje crudo y lo inyecta con funciones útiles
 */
export async function smsg(conn, m) {
    if (!m) return m;

    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = decodeJid(m.key.remoteJid);
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = decodeJid(
            (m.fromMe && conn.user.id) ||
            m.participant ||
            m.key.participant ||
            m.chat ||
            ''
        );
    }

    if (m.message) {
        // Extraemos el contenido real (manejando viewOnce, ephemeral, etc.)
        m.message = extractMessageContent(m.message);
        m.mtype = getContentType(m.message);
        m.msg = m.message[m.mtype];

        // ✅ Extracción de texto robusta — cubre todos los tipos de Baileys 7
        m.body = extractBody(m.mtype, m.message, m.msg)
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
            m.quoted.isBaileys = m.quoted.id
                ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16
                : false;
            m.quoted.sender = decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === decodeJid(conn.user.id);
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || '';
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
            m.quoted.download = () => downloadMedia({ [m.quoted.mtype]: m.quoted });
        }
    }

    // --- FUNCIONES INYECTADAS ---

    m.reply = (content, chatId, options = {}) => {
    const jid = chatId || m.chat

    if (Buffer.isBuffer(content)) {
        return conn.sendMessage(jid, { document: content }, { quoted: m, ...options })
    }

    if (typeof content === 'object') {
        return conn.sendMessage(jid, content, { quoted: m, ...options })
    }

    return conn.sendMessage(jid, { text: String(content) }, { quoted: m, ...options })
}

    m.react = (emoji) =>
        conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } });

    m.delete = () =>
        conn.sendMessage(m.chat, { delete: m.key });

    m.download = () => downloadMedia(m.message);

    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) =>
        conn.copyNForward(jid, m, forceForward, options);

    return m;
}

/**
 * Descarga de archivos eficiente
 */
export const downloadMedia = async (message) => {
    try {
        let type = Object.keys(message)[0]
        let msg = message[type]

        if (
            type === 'buttonsMessage' ||
            type === 'viewOnceMessage' ||
            type === 'viewOnceMessageV2'
        ) {
            type = Object.keys(msg.message || {})[0]
            msg = msg.message?.[type]
        }

        if (!msg) throw new Error('Mensaje vacío')

        if (!msg.mediaKey && !msg.url && !msg.directPath) {
            throw new Error('Media sin clave (mediaKey/url)')
        }

        const stream = await downloadContentFromMessage(
            msg,
            type.replace('Message', '')
        )

        let chunks = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        if (!chunks.length) {
            throw new Error('Buffer vacío')
        }

        return Buffer.concat(chunks)

    } catch (e) {
        throw new Error('DownloadMedia: ' + e.message)
    }
}