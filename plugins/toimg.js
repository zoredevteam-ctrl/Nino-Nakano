/**
 * TOIMG - NINO NAKANO
 * Convierte stickers → imagen y video/GIF → primer frame
 * Comandos: #toimg, #stickertoimg, #stoi
 * Requiere: ffmpeg instalado
 * Z0RT SYSTEMS 🦋
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const execAsync = promisify(exec)
const tmpFile   = (ext) => join(tmpdir(), `nino_toimg_${Date.now()}.${ext}`)

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const sendToimg = async (conn, m, text, isError = false) => {
    const thumb = await global.getBannerThumb()
    const ctx   = global.getNewsletterCtx(
        thumb,
        (isError ? '❌ ' : '🖼️ ') + global.botName,
        isError ? 'Error al convertir' : 'Sticker → Imagen'
    )
    return conn.sendMessage(m.chat, { text, contextInfo: ctx }, { quoted: m })
}

// Sticker WebP → PNG
const webpToPng = async (buffer) => {
    const input  = tmpFile('webp')
    const output = tmpFile('png')
    try {
        await writeFile(input, buffer)
        await execAsync(`ffmpeg -y -i "${input}" "${output}"`)
        return await readFile(output)
    } finally {
        await unlink(input).catch(() => {})
        await unlink(output).catch(() => {})
    }
}

// Video/GIF → primer frame PNG
const videoToPng = async (buffer, ext = 'mp4') => {
    const input  = tmpFile(ext)
    const output = tmpFile('png')
    try {
        await writeFile(input, buffer)
        // -vframes 1 = solo el primer frame
        await execAsync(`ffmpeg -y -i "${input}" -vframes 1 "${output}"`)
        return await readFile(output)
    } finally {
        await unlink(input).catch(() => {})
        await unlink(output).catch(() => {})
    }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn }) => {
    const quoted = m.quoted || m
    const msg    = quoted?.message || m.message

    if (!msg) {
        return sendToimg(conn, m,
            `🖼️ *TOIMG — CONVERTIDOR*\n\n` +
            `Responde a un *sticker*, *video* o *GIF* para convertirlo a imagen~\n\n` +
            `*Soporta:*\n` +
            `› 🎴 Sticker → Imagen PNG\n` +
            `› 🎬 Video → Primer frame\n` +
            `› 🌀 GIF → Primer frame\n\n` +
            `_Ejemplo: responde a un sticker con *${global.prefix}toimg*_ 🦋`
        )
    }

    const stickerMsg = msg.stickerMessage
    const videoMsg   = msg.videoMessage
    const gifMsg     = videoMsg?.gifPlayback ? videoMsg : null
    const imageMsg   = msg.imageMessage

    const hasMedia = stickerMsg || videoMsg || imageMsg

    if (!hasMedia) {
        return sendToimg(conn, m,
            `🖼️ Responde a un *sticker*, *video* o *GIF* para convertirlo~\n\n` +
            `_No detecté ningún tipo de media compatible_ 🦋`
        )
    }

    await m.react('⏳')

    try {
        let pngBuffer
        let tipo = ''

        if (stickerMsg) {
            // ── Sticker WebP → PNG ──
            tipo = 'Sticker'
            const buffer = await conn.downloadMediaMessage(quoted)
            pngBuffer = await webpToPng(buffer)

        } else if (gifMsg || videoMsg) {
            // ── Video / GIF → primer frame ──
            tipo = gifMsg ? 'GIF' : 'Video'
            const buffer = await conn.downloadMediaMessage(quoted)
            pngBuffer = await videoToPng(buffer, 'mp4')

        } else if (imageMsg) {
            // ── Imagen ya es imagen, solo re-enviar ──
            tipo = 'Imagen'
            pngBuffer = await conn.downloadMediaMessage(quoted)
        }

        if (!pngBuffer || pngBuffer.length < 100) {
            throw new Error('La imagen generada está vacía o corrupta')
        }

        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, `🖼️ ${global.botName}`, 'Sticker → Imagen 🦋')

        await conn.sendMessage(m.chat, {
            image:       pngBuffer,
            caption:     `🖼️ *${tipo} convertido a imagen* ✅\n\n_¿Ves qué rápida soy? No me des las gracias_ 🦋`,
            contextInfo: ctx
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error('[TOIMG ERROR]', e.message)
        await m.react('❌')

        let errMsg = `❌ *Error al convertir*\n\n`
        if (e.message.includes('ffmpeg')) {
            errMsg += `⚠️ FFmpeg no está instalado\n_Instala con: \`apt install ffmpeg\`_`
        } else {
            errMsg += `⚠️ ${e.message}`
        }

        return sendToimg(conn, m, errMsg, true)
    }
}

handler.command = ['toimg', 'stickertoimg', 'stoi', 'toimage']
export default handler
