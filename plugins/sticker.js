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
    // Fallback de seguridad por si las funciones globales no existen en tu base
    try {
        if (typeof global.getBannerThumb === 'function' && typeof global.getNewsletterCtx === 'function') {
            const thumb = await global.getBannerThumb()
            const ctx   = global.getNewsletterCtx(
                thumb,
                (isError ? '❌ ' : '🦋 ') + (global.botName || 'Bot'),
                isError ? 'Error al crear sticker' : 'Sticker Maker'
            )
            return await conn.sendMessage(m.chat, { text, contextInfo: ctx }, { quoted: m })
        }
    } catch (e) {
        console.warn('[WARN] Funciones globales de contexto no encontradas. Usando mensaje simple.');
    }
    
    return await conn.sendMessage(m.chat, { text }, { quoted: m })
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
        // Se agregó -vcodec libwebp y se corrigió el color alpha (color=0x00000000)
        await execAsync(
            `ffmpeg -y -i "${input}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -q:v 80 "${output}"`
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
        // Se corrigió el color alpha para evitar fallos en ciertas versiones de ffmpeg
        await execAsync(
            `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15" -vcodec libwebp -lossless 0 -compression_level 6 -q:v 50 -loop 0 -preset picture -an -vsync 0 -t 8 "${output}"`
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
    const prefix = usedPrefix || global.prefix || '#'

    let packName   = PACK_NAME
    let authorName = PACK_AUTHOR

    if (text) {
        const parts = text.split('|').map(s => s.trim())
        if (parts[0]) packName   = parts[0]
        if (parts[1]) authorName = parts[1]
    }

    // Extraer mensaje, dando soporte a "Ver una vez" (ViewOnce)
    let msg = quoted?.message || m.message
    if (!msg) return
    
    if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message
    else if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message

    const imageMsg      = msg.imageMessage
    const videoMsg      = msg.videoMessage
    const stickerMsg    = msg.stickerMessage
    const gifMsg        = videoMsg?.gifPlayback ? videoMsg : null
    const documentMsg   = msg.documentMessage

    const hasMedia = imageMsg || videoMsg || stickerMsg || documentMsg

    if (!hasMedia) {
        return sendStk(conn, m,
            '🦋 *STICKER MAKER*\n\n' +
            'Responde a una imagen, video, GIF o sticker~\n\n' +
            '*Uso:*\n' +
            '› *' + prefix + 's* — sticker normal\n' +
            '› *' + prefix + 's NombrePack | Autor* — con nombre\n' +
            '› *' + prefix + 'take* — robar sticker\n\n' +
            '_Ejemplo: ' + prefix + 's Nino | 𝓐𝓪𝓻𝓸𝓶_'
        )
    }

    await m.react('⏳')

    try {
        let webpBuffer

        // Soporte universal para descargas en distintas bases de Baileys
        const buffer = typeof quoted.download === 'function' 
            ? await quoted.download() 
            : await conn.downloadMediaMessage(quoted)

        if (!buffer) throw new Error('No se pudo descargar el archivo')

        if (stickerMsg) {
            // ── Sticker → No usar ffmpeg para NO PERDER la animación ──
            webpBuffer = buffer
        } else if (gifMsg || videoMsg) {
            // ── GIF/Video → WebP animado ──
            webpBuffer = await videoToWebp(buffer, 'mp4')
        } else {
            // ── Imagen → WebP estático ──
            webpBuffer = await imageToWebp(buffer)
        }

        if (!webpBuffer || webpBuffer.length < 100) {
            throw new Error('El WebP generado está vacío o corrupto')
        }

        const finalWebp = await addExif(webpBuffer, packName, authorName)

        await conn.sendMessage(m.chat, {
            sticker: finalWebp
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error('[STICKER ERROR]', e)
        await m.react('❌')

        let errMsg = '❌ *Error al crear el sticker*\n\n'
        if (e.message.includes('ffmpeg') || e.message.includes('spawn')) {
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
