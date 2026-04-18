/**
 * TOIMG - NINO NAKANO
 * Convierte stickers → imagen
 * Comandos: #toimg, #toimage, #img
 * Z0RT SYSTEMS 🦋
 */

import { downloadMediaMessage } from '@whiskeysockets/baileys'

let handler = async (m, { conn }) => {
    const q    = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mimetype || ''

    if (!mime || !/webp/.test(mime)) {
        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, `🖼️ ${global.botName}`, 'Sticker → Imagen')
        return conn.sendMessage(m.chat, {
            text:
                `🖼️ *TOIMG — CONVERTIDOR*\n\n` +
                `*ᐛ🎀* Responde a un *sticker* para convertirlo a imagen~\n\n` +
                `_Ejemplo: responde al sticker y escribe *${global.prefix}toimg*_ 🦋`,
            contextInfo: ctx
        }, { quoted: m })
    }

    await m.react('⏳')

    try {
        const media = await downloadMediaMessage(q, 'buffer', {}, {
            reuploadRequest: conn.updateMediaMessage
        })

        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, `🖼️ ${global.botName}`, 'Sticker → Imagen 🦋')

        await conn.sendMessage(m.chat, {
            image:       media,
            caption:     `🖼️ *¡Aquí está tu imagen!*\n\n_¿Ves qué rápida soy? No me des las gracias_ 🦋`,
            contextInfo: ctx
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error('[TOIMG ERROR]', e.message)
        await m.react('❌')
        m.reply(`💔 Ugh, este sticker se resistió...\n_Prueba con otro, tonto_ 🦋`)
    }
}

handler.help    = ['toimg', 'toimage', 'img']
handler.tags    = ['tools', 'stickers']
handler.command = ['toimg', 'toimage', 'img', 'stoi']
export default handler
