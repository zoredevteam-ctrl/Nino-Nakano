/**
 * TOIMG - NINO NAKANO
 * Convierte stickers → imagen
 * Comandos: #toimg, #toimage, #img
 * Z0RT SYSTEMS 🦋
 */

import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

let handler = async (m, { conn }) => {
    const q    = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || q.mimetype || ''

    // Validar si es un sticker (webp)
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
        // Descargar el buffer original en WebP
        const media = await downloadMediaMessage(q, 'buffer', {}, {
            reuploadRequest: conn.updateMediaMessage
        })

        // Nombres para los archivos temporales (únicos por timestamp)
        const tmpWebp = path.join(process.cwd(), `tmp_${Date.now()}.webp`)
        const tmpPng  = path.join(process.cwd(), `tmp_${Date.now()}.png`)

        // 1. Guardar el sticker en el disco
        fs.writeFileSync(tmpWebp, media)

        // 2. Usar FFMPEG para convertir de WebP a PNG
        exec(`ffmpeg -i ${tmpWebp} ${tmpPng}`, async (err) => {
            // Eliminar el archivo WebP temporal ya que no lo necesitamos
            if (fs.existsSync(tmpWebp)) fs.unlinkSync(tmpWebp)

            if (err) {
                console.error('[TOIMG CONVERSION ERROR]', err)
                await m.react('❌')
                return m.reply(`💔 Ugh, este sticker se resistió al convertirlo...\n_Prueba con otro, tonto_ 🦋`)
            }

            // 3. Leer el nuevo archivo PNG
            const imageBuffer = fs.readFileSync(tmpPng)
            const thumb = await global.getBannerThumb()
            const ctx   = global.getNewsletterCtx(thumb, `🖼️ ${global.botName}`, 'Sticker → Imagen 🦋')

            // 4. Enviar la imagen final
            await conn.sendMessage(m.chat, {
                image:       imageBuffer,
                caption:     `🖼️ *¡Aquí está tu imagen!*\n\n_¿Ves qué rápida soy? No me des las gracias_ 🦋`,
                contextInfo: ctx
            }, { quoted: m })

            await m.react('✅')

            // Limpiar el archivo PNG temporal
            if (fs.existsSync(tmpPng)) fs.unlinkSync(tmpPng)
        })

    } catch (e) {
        console.error('[TOIMG DOWNLOAD ERROR]', e.message)
        await m.react('❌')
        m.reply(`💔 Ugh, ocurrió un error al descargar el mensaje...\n_Prueba con otro, tonto_ 🦋`)
    }
}

handler.help    = ['toimg', 'toimage', 'img']
handler.tags    = ['tools', 'stickers']
handler.command = ['toimg', 'toimage', 'img', 'stoi']
export default handler
