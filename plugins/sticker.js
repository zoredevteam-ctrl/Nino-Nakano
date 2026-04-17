/**
 * STICKER - NINO NAKANO PREMIUM
 * Optimizada para evitar el error de "cuadro gris"
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const execAsync = promisify(exec)

// ─── INFO DEL BOT ─────────────────────────────────────────────────────────────
const PACK_NAME   = 'Nino Nakano PREMIUM 🦋'
const PACK_AUTHOR = '𝓐𝓪𝓻𝓸𝓶'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const tmpFile = (ext) => join(tmpdir(), `nino_${Date.now()}.${ext}`)

/**
 * Inyector EXIF preciso. 
 * WhatsApp requiere que el bloque EXIF esté bien definido en la cabecera.
 */
async function addExif(webpBuffer, pack, auth) {
    const json = {
        "sticker-pack-id": `nino-${Date.now()}`,
        "sticker-pack-name": pack,
        "sticker-pack-publisher": auth,
        "emojis": ["🦋"]
    }
    const exifHeader = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00])
    const jsonBuffer = Buffer.from(JSON.stringify(json), "utf-8")
    const exif = Buffer.concat([exifHeader, Buffer.alloc(4), jsonBuffer])
    exif.writeUInt32LE(jsonBuffer.length, 10)
    
    // Unimos el buffer cuidando la integridad del archivo
    return Buffer.concat([webpBuffer, exif])
}

// ─── CONVERSIONES FFMEG (ULTRA COMPATIBLES) ───────────────────────────────────

const imageToWebp = async (buffer) => {
    const input = tmpFile('jpg')
    const output = tmpFile('webp')
    try {
        await writeFile(input, buffer)
        // Reducimos calidad a 60% para evitar archivos pesados
        // Usamos pix_fmt yuva420p para asegurar transparencia compatible
        await execAsync(
            `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0,format=rgba" -pix_fmt yuva420p -c:v libwebp -q:v 60 "${output}"`
        )
        return await readFile(output)
    } finally {
        await Promise.all([unlink(input).catch(() => {}), unlink(output).catch(() => {})])
    }
}

const videoToWebp = async (buffer) => {
    const input = tmpFile('mp4')
    const output = tmpFile('webp')
    try {
        await writeFile(input, buffer)
        // Bajamos FPS a 10 y calidad a 35 para que el sticker animado sea muy ligero
        // Si pesa más de 1MB WhatsApp lo pone en gris
        await execAsync(
            `ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0,format=rgba,fps=10" -pix_fmt yuva420p -c:v libwebp -lossless 0 -compression_level 5 -q:v 35 -loop 0 -an -t 6 "${output}"`
        )
        return await readFile(output)
    } finally {
        await Promise.all([unlink(input).catch(() => {}), unlink(output).catch(() => {})])
    }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, command, text, usedPrefix }) => {
    const quoted = m.quoted ? m.quoted : m
    const mime = (quoted.msg || quoted).mimetype || ''
    
    // Si el usuario pone texto, se usa, si no, la info de Nino Premium
    let packName = text?.split('|')[0]?.trim() || PACK_NAME
    let authName = text?.split('|')[1]?.trim() || PACK_AUTHOR

    if (!/image|video|sticker/.test(mime)) {
        return m.reply(`🦋 *NINO NAKANO PREMIUM*\n\nResponde a una imagen o video con *${usedPrefix + command}* para crear tu sticker.`)
    }

    await m.react('⏳')

    try {
        const buffer = await quoted.download()
        if (!buffer) throw new Error('No pude descargar el archivo.')

        let webp

        if (/image/.test(mime)) {
            webp = await imageToWebp(buffer)
        } else if (/video/.test(mime)) {
            webp = await videoToWebp(buffer)
        } else if (/sticker/.test(mime)) {
            // Para #take (robar), pasamos el buffer directo
            webp = buffer 
        }

        // Inyección de la nueva metadata PREMIUM
        const finalSticker = await addExif(webp, packName, authName)

        await conn.sendMessage(m.chat, { 
            sticker: finalSticker 
        }, { quoted: m })
        
        await m.react('✅')
    } catch (e) {
        console.error('ERROR STICKER:', e)
        await m.react('❌')
        m.reply(`❌ Fallo al crear sticker: ${e.message}`)
    }
}

handler.command = ['s', 'sticker', 'take']
export default handler
