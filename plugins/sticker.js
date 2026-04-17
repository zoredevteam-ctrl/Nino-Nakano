/**
 * STICKER - NINO NAKANO
 * Crea stickers desde imágenes, videos, GIFs y stickers
 * Comandos: #s, #sticker, #take
 * Requiere: ffmpeg instalado en el sistema
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const execAsync = promisify(exec)

// ─── PACK INFO ────────────────────────────────────────────────────────────────

const PACK_NAME   = global.botName   || 'Nino Nakano'
const PACK_AUTHOR = global.ownerName || '𝓐𝓪𝓻𝓸𝓶'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const sendStk = async (conn, m, text, isError = false) => {
    const thumb = await global.getBannerThumb()
    const ctx   = global.getNewsletterCtx(
        thumb,
        (isError ? '❌ ' : '🦋 ') + global.botName,
        isError ? 'Error al crear sticker' : 'Sticker Maker'
    )
    return conn.sendMessage(m.chat, { text, contextInfo: ctx }, { quoted: m })
}

const tmpFile = (ext) => join(tmpdir(), `nino_stk_${Date.now()}.${ext}`)

// ─── EXIF METADATA ────────────────────────────────────────────────────────────

const addExif = async (webpBuffer, packName, authorName) => {
    try {
        const json = JSON.stringify({
            'sticker-pack-id':        'nino_' + Date.now(),
            'sticker-pack-name':      packName,
            'sticker-pack-publisher': authorName,
            'emojis': ['🦋']
        })

        const jsonBuf = Buffer.from(json, 'utf8')

        const exifHeader = Buffer.from([
            0x49, 0x49, 0x2A, 0x00,
            0x08, 0x00, 0x00, 0x00,
            0x01, 0x00,
            0x41, 0x57,
            0x07, 0x00
        ])

        const countBuf = Buffer.alloc(4)
        countBuf.writeUInt32LE(jsonBuf.length, 0)

        const offsetBuf = Buffer.alloc(4)
        offsetBuf.writeUInt32LE(0x16, 0)

        let exifData = Buffer.concat([exifHeader, countBuf, offsetBuf, jsonBuf])
        const originalExifLength = exifData.length

        let chunkData = exifData
        if (originalExifLength % 2 === 1) {
            chunkData = Buffer.concat([chunkData, Buffer.from([0x00])])
        }

        const exifChunkName = Buffer.from('EXIF')
        const exifChunkSize = Buffer.alloc(4)
        exifChunkSize.writeUInt32LE(originalExifLength, 0)

        const added = Buffer.concat([exifChunkName, exifChunkSize, chunkData])
        let result = Buffer.concat([webpBuffer, added])
        result.writeUInt32LE(result.length - 8, 4)

        return result
    } catch (e) {
        console.error('[EXIF ERROR]', e.message)
        return webpBuffer
    }
}

// ─── CONVERSIONES ─────────────────────────────────────────────────────────────

// Imagen → WebP estático
const imageToWebp = async (buffer) => {
    const input  = tmpFile('img')
    const output = tmpFile('webp')
    try {
        await writeFile(input, buffer)
        await execAsync(
            `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0" -quality 80 "${output}"`
        )
        return await readFile(output)
    } finally {
        await unlink(input).catch(() => {})
        await unlink(output).catch(() => {})
    }
}

// Video/GIF → WebP animado
const videoToWebp = async (buffer, ext = 'mp4') => {
    const input  = tmpFile(ext)
    const output = tmpFile('webp')
    try {
        await writeFile(input, buffer)
        await execAsync(
            `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0,fps=15" -vcodec libwebp -lossless 0 -compression_level 6 -quality 50 -loop 0 -preset picture -an -vsync 0 -t 8 "${output}"`
        )
        return await readFile(output)
    } finally {
        await unlink(input).catch(() => {})
        await unlink(output).catch(() => {})
    }
}

// WebP estático → WebP (resize)
const webpToWebp = async (buffer) => {
    const input  = tmpFile('webp')
    const output = tmpFile('webp')
    try {
        await writeFile(input, buffer)
        await execAsync(
            `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2" -quality 80 "${output}"`
        )
        return await readFile(output)
    } finally {
        await unlink(input).catch(() => {})
        await unlink(output).catch(() => {})
    }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, command, text }) => {
    const cmd    = command.toLowerCase()
    const quoted = m.quoted || m

    // ── #take — robar sticker con pack name personalizado ──
    const isTake = cmd === 'take'

    // Determinar pack y autor
    let packName   = PACK_NAME
    let authorName = PACK_AUTHOR

    if (text) {
        const parts = text.split('|').map(s => s.trim())
        if (parts[0]) packName   = parts[0]
        if (parts[1]) authorName = parts[1]
    }

    // Obtener el mensaje con media
    const msg = quoted?.message || m.message
    if (!msg) {
        return sendStk(conn, m,
            '🦋 *STICKER MAKER*\n\n' +
            'Responde a una imagen, video, GIF o sticker~\n\n' +
            '*Uso:*\n' +
            '› *' + global.prefix + 's* — sticker normal\n' +
            '› *' + global.prefix + 's NombrePack | Autor* — con nombre\n' +
            '› *' + global.prefix + 'take* — robar sticker\n\n' +
            '_Ejemplo: ' + global.prefix + 's Nino | 𝓐𝓪𝓻𝓸𝓶_'
        )
    }

    // Detectar tipo de media
    const imageMsg      = msg.imageMessage
    const videoMsg      = msg.videoMessage
    const stickerMsg    = msg.stickerMessage
    const gifMsg        = videoMsg?.gifPlayback ? videoMsg : null
    const documentMsg   = msg.documentMessage

    const hasMedia = imageMsg || videoMsg || stickerMsg || documentMsg

    if (!hasMedia) {
        return sendStk(conn, m,
            '🦋 Responde a una *imagen*, *video*, *GIF* o *sticker* para crear el sticker~\n\n' +
            '_Ejemplo: responde a una foto con *' + global.prefix + 's*_'
        )
    }

    await m.react('⏳')

    try {
        let webpBuffer

        if (stickerMsg) {
            // ── Sticker → Sticker (robar / cambiar pack) ──
            const buffer = await conn.downloadMediaMessage(quoted)
            webpBuffer = await webpToWebp(buffer)

        } else if (gifMsg) {
            // ── GIF → WebP animado ──
            const buffer = await conn.downloadMediaMessage(quoted)
            webpBuffer = await videoToWebp(buffer, 'mp4')

        } else if (videoMsg) {
            // ── Video → WebP animado (máx 8s) ──
            const buffer = await conn.downloadMediaMessage(quoted)
            webpBuffer = await videoToWebp(buffer, 'mp4')

        } else {
            // ── Imagen → WebP estático ──
            const buffer = await conn.downloadMediaMessage(quoted)
            webpBuffer = await imageToWebp(buffer)
        }

        if (!webpBuffer || webpBuffer.length < 100) {
            throw new Error('El WebP generado está vacío o corrupto')
        }

        // Agregar metadata EXIF (pack visible en WhatsApp)
        const finalWebp = await addExif(webpBuffer, packName, authorName)

        await conn.sendMessage(m.chat, {
            sticker: finalWebp
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error('[STICKER ERROR]', e.message)
        await m.react('❌')

        // Mensaje de error específico según el problema
        let errMsg = '❌ *Error al crear el sticker*\n\n'
        if (e.message.includes('ffmpeg')) {
            errMsg += '⚠️ FFmpeg no está instalado o no se encontró\n_Instala con: `pkg install ffmpeg`_'
        } else if (e.message.includes('vacío') || e.message.includes('corrupto')) {
            errMsg += '⚠️ El archivo de entrada está dañado o no es compatible'
        } else {
            errMsg += '⚠️ ' + e.message
        }

        return sendStk(conn, m, errMsg, true)
    }
}

handler.command = ['s', 'sticker', 'take', 'stkr']
export default handler
