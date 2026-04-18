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
const tmpFile   = (ext) => join(tmpdir(), `nino_toimg_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`)

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

// Desenvuelve el mensaje real (puede venir en viewOnce, ephemeral, etc.)
const unwrap = (msg) => {
    if (!msg) return null
    return msg.viewOnceMessage?.message
        || msg.ephemeralMessage?.message
        || msg.documentWithCaptionMessage?.message
        || msg
}

// Extrae el mensaje con media desde el quoted
const getMediaMsg = (m) => {
    // 1. Intentar desde m.quoted directamente
    if (m.quoted?.message) {
        const msg = unwrap(m.quoted.message)
        if (msg?.stickerMessage || msg?.videoMessage || msg?.imageMessage) return msg
    }

    // 2. Intentar desde m.quoted.quoted (cuando se cita un forward)
    if (m.quoted?.quoted?.message) {
        const msg = unwrap(m.quoted.quoted.message)
        if (msg?.stickerMessage || msg?.videoMessage || msg?.imageMessage) return msg
    }

    // 3. Intentar desde el mensaje actual
    if (m.message) {
        const msg = unwrap(m.message)
        if (msg?.stickerMessage || msg?.videoMessage || msg?.imageMessage) return msg
    }

    return null
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
const videoToPng = async (buffer) => {
    const input  = tmpFile('mp4')
    const output = tmpFile('png')
    try {
        await writeFile(input, buffer)
        await execAsync(`ffmpeg -y -i "${input}" -vframes 1 "${output}"`)
        return await readFile(output)
    } finally {
        await unlink(input).catch(() => {})
        await unlink(output).catch(() => {})
    }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn }) => {
    const msg = getMediaMsg(m)

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

    await m.react('⏳')

    try {
        let pngBuffer
        let tipo = ''

        // Usamos m.quoted para descargar, con fallback a m
        const target = m.quoted || m

        if (stickerMsg) {
            tipo = 'Sticker'
            const buffer = await conn.downloadMediaMessage(target)
            pngBuffer = await webpToPng(buffer)

        } else if (gifMsg || videoMsg) {
            tipo = gifMsg ? 'GIF' : 'Video'
            const buffer = await conn.downloadMediaMessage(target)
            pngBuffer = await videoToPng(buffer)

        } else if (imageMsg) {
            tipo = 'Imagen'
            pngBuffer = await conn.downloadMediaMessage(target)
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
