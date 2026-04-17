/**
 * STICKER - NINO NAKANO
 * Creado por: Aarom
 * Versión optimizada para evitar stickers "fantasmas" (cuadros grises)
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const execAsync = promisify(exec)

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────

const PACK_NAME   = global.botName   || 'Nino Nakano'
const PACK_AUTHOR = global.ownerName || '𝓐𝓪𝓻𝓸𝓶'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const sendStk = async (conn, m, text, isError = false) => {
    try {
        if (typeof global.getBannerThumb === 'function' && typeof global.getNewsletterCtx === 'function') {
            const thumb = await global.getBannerThumb()
            const ctx   = global.getNewsletterCtx(
                thumb,
                (isError ? '❌ ' : '🦋 ') + (global.botName || 'Nino'),
                isError ? 'Error en Sticker' : 'Sticker Maker'
            )
            return await conn.sendMessage(m.chat, { text, contextInfo: ctx }, { quoted: m })
        }
    } catch (e) {}
    return await conn.sendMessage(m.chat, { text }, { quoted: m })
}

const tmpFile = (ext) => join(tmpdir(), `nino_${Date.now()}.${ext}`)

// ─── EXIF METADATA (INYECTOR SEGURO) ──────────────────────────────────────────

const addExif = async (webpBuffer, pack, auth) => {
    try {
        const json = {
            'sticker-pack-id': `nino-${Date.now()}`,
            'sticker-pack-name': pack,
            'sticker-pack-publisher': auth,
            'emojis': ['🦋', '✨']
        }
        const exifHeader = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00])
        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
        const lenBuffer  = Buffer.alloc(4)
        lenBuffer.writeUInt32LE(jsonBuffer.length, 0)
        
        const exif = Buffer.concat([exifHeader, lenBuffer, jsonBuffer])
        
        // Buscamos el final del archivo WebP para insertar el chunk EXIF
        let result = Buffer.concat([webpBuffer, exif])
        return result
    } catch (e) {
        return webpBuffer
    }
}

// ─── CONVERSIONES FFMEG ───────────────────────────────────────────────────────

const imageToWebp = async (buffer) => {
    const input  = tmpFile('jpg')
    const output = tmpFile('webp')
    try {
        await writeFile(input, buffer)
        // pix_fmt yuva420p es vital para que WhatsApp acepte la transparencia
        await execAsync(
            `ffmpeg -y -i "${input}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -pix_fmt yuva420p -q:v 75 "${output}"`
        )
        return await readFile(output)
    } finally {
        await unlink(input).catch(() => {})
        await unlink(output).catch(() => {})
    }
}

const videoToWebp = async (buffer, ext = 'mp4') => {
    const input  = tmpFile(ext)
    const output = tmpFile('webp')
    try {
        await writeFile(input, buffer)
        await execAsync(
            `ffmpeg -y -i "${input}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15" -pix_fmt yuva420p -lossless 0 -compression_level 6 -q:v 50 -loop 0 -an -t 7 "${output}"`
        )
        return await readFile(output)
    } finally {
        await unlink(input).catch(() => {})
        await unlink(output).catch(() => {})
    }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, command, text, usedPrefix }) => {
    const cmd    = command.toLowerCase()
    const quoted = m.quoted ? m.quoted : m
    const prefix = usedPrefix || '#'

    let packName   = PACK_NAME
    let authorName = PACK_AUTHOR

    if (text) {
        const parts = text.split('|').map(s => s.trim())
        if (parts[0]) packName   = parts[0]
        if (parts[1]) authorName = parts[1]
    }

    let msg = quoted.message || m.message
    if (!msg) return

    // Manejo de mensajes de "Ver una vez"
    if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message
    if (msg.viewOnceMessage)   msg = msg.viewOnceMessage.message

    const isImage    = !!msg.imageMessage
    const isVideo    = !!msg.videoMessage
    const isSticker  = !!msg.stickerMessage
    const isGif      = !!msg.videoMessage?.gifPlayback

    if (!isImage && !isVideo && !isSticker) {
        return sendStk(conn, m, 
            `🦋 *NINO STICKERS*\n\n` +
            `Responde a una imagen o video con:\n` +
            `› *${prefix + cmd}*\n` +
            `› *${prefix + cmd} Pack | Autor*`
        )
    }

    await m.react('⏳')

    try {
        // Descarga segura
        const buffer = typeof quoted.download === 'function' 
            ? await quoted.download() 
            : await conn.downloadMediaMessage(quoted)

        if (!buffer) throw new Error('No se pudo obtener el archivo')

        let webpBuffer

        if (isSticker) {
            // #take: No procesamos con FFmpeg para no arruinar la animación original
            webpBuffer = buffer
        } else if (isVideo || isGif) {
            webpBuffer = await videoToWebp(buffer)
        } else {
            webpBuffer = await imageToWebp(buffer)
        }

        // Inyectamos el EXIF para que salga tu nombre en el sticker
        const finalWebp = await addExif(webpBuffer, packName, authorName)

        await conn.sendMessage(m.chat, { 
            sticker: finalWebp 
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error(e)
        await m.react('❌')
        return sendStk(conn, m, `❌ *Error:* ${e.message}`, true)
    }
}

handler.command = ['s', 'sticker', 'take', 'stkr']
export default handler
