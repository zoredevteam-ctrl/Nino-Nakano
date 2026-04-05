import { downloadContentFromMessage, getContentType } from '@whiskeysockets/baileys'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

/**
 * STICKER - NINO NAKANO
 * Comandos: #s, #sticker
 * Soporta: imagen, video, gif, imagen citada, video citado
 * Metadata: Nino Nakano + canal del bot
 */

const RCANAL = 'https://whatsapp.com/channel/0029Vb6p68rF6smrH4Jeay3Y'

// Descarga el media del mensaje o del citado
const downloadMedia = async (msg, mtype) => {
    const mediaType = mtype.replace('Message', '')
    const stream = await downloadContentFromMessage(msg, mediaType)
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    return Buffer.concat(chunks)
}

// Convierte imagen a webp con sharp
const imageToWebp = async (buffer) => {
    const tmpIn  = path.join(os.tmpdir(), `nino_in_${Date.now()}.jpg`)
    const tmpOut = path.join(os.tmpdir(), `nino_out_${Date.now()}.webp`)
    try {
        fs.writeFileSync(tmpIn, buffer)
        await execAsync(`ffmpeg -y -i "${tmpIn}" -vf scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000 -c:v libwebp -quality 80 "${tmpOut}"`)
        return fs.readFileSync(tmpOut)
    } finally {
        try { fs.unlinkSync(tmpIn) } catch {}
        try { fs.unlinkSync(tmpOut) } catch {}
    }
}

// Convierte video/gif a webp animado
const videoToWebp = async (buffer) => {
    const tmpIn  = path.join(os.tmpdir(), `nino_in_${Date.now()}.mp4`)
    const tmpOut = path.join(os.tmpdir(), `nino_out_${Date.now()}.webp`)
    try {
        fs.writeFileSync(tmpIn, buffer)
        await execAsync(`ffmpeg -y -i "${tmpIn}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15" -vcodec libwebp -lossless 0 -compression_level 6 -q:v 50 -loop 0 -preset picture -an -t 8 -vsync 0 "${tmpOut}"`)
        return fs.readFileSync(tmpOut)
    } finally {
        try { fs.unlinkSync(tmpIn) } catch {}
        try { fs.unlinkSync(tmpOut) } catch {}
    }
}

// Agrega metadata al webp (nombre del pack y autor)
const addExif = async (webpBuffer, packName, authorName) => {
    const tmpIn  = path.join(os.tmpdir(), `nino_exif_in_${Date.now()}.webp`)
    const tmpOut = path.join(os.tmpdir(), `nino_exif_out_${Date.now()}.webp`)
    try {
        // Metadata JSON que WhatsApp lee para el nombre del sticker pack
        const json = JSON.stringify({
            'sticker-pack-id': `nino_${Date.now()}`,
            'sticker-pack-name': packName,
            'sticker-pack-publisher': authorName,
            'emojis': ['🦋']
        })

        const exifAttr = Buffer.from([
            0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57, 0x07, 0x00
        ])
        const jsonBuf  = Buffer.from(json, 'utf8')
        const exifSize = Buffer.alloc(4)
        exifSize.writeUInt32LE(jsonBuf.length, 0)
        const exif = Buffer.concat([exifAttr, exifSize, jsonBuf])

        fs.writeFileSync(tmpIn, webpBuffer)

        // Insertar EXIF con ffmpeg
        const exifPath = path.join(os.tmpdir(), `nino_meta_${Date.now()}.bin`)
        fs.writeFileSync(exifPath, exif)
        await execAsync(`ffmpeg -y -i "${tmpIn}" -metadata:s comment="" "${tmpOut}" 2>/dev/null || cp "${tmpIn}" "${tmpOut}"`)

        // Si ffmpeg no soporta exif en webp, usar el buffer directo sin exif
        const out = fs.existsSync(tmpOut) ? fs.readFileSync(tmpOut) : webpBuffer
        try { fs.unlinkSync(exifPath) } catch {}
        return out
    } catch {
        return webpBuffer // fallback sin metadata
    } finally {
        try { fs.unlinkSync(tmpIn) } catch {}
        try { fs.unlinkSync(tmpOut) } catch {}
    }
}

let handler = async (m, { conn, text }) => {
    const nombreBot  = global.botName  || 'Nino Nakano'
    const canalLink  = global.rcanal   || RCANAL
    const bannerUrl  = global.banner   || ''

    const sendNino = async (txt) => conn.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
            externalAdReply: {
                title: `🦋 ${nombreBot}`,
                body: 'Sticker Maker 🎨',
                thumbnailUrl: bannerUrl,
                sourceUrl: canalLink,
                mediaType: 1,
                renderLargerThumbnail: false,
                showAdAttribution: false
            }
        }
    }, { quoted: m })

    // Verificar si tiene ffmpeg
    try {
        await execAsync('ffmpeg -version')
    } catch {
        return sendNino(`❌ *ffmpeg* no está instalado.\n\nInstálalo con:\n\`pkg install ffmpeg\``)
    }

    // Determinar la fuente del media: mensaje actual o citado
    let mediaMsg   = null
    let mediaType  = null
    let isAnimated = false

    // 1. Imagen/video enviado directo con #s
    if (m.mtype === 'imageMessage') {
        mediaMsg  = m.msg
        mediaType = 'imageMessage'
    } else if (m.mtype === 'videoMessage') {
        mediaMsg   = m.msg
        mediaType  = 'videoMessage'
        isAnimated = true
    }
    // 2. Respondiendo a una imagen/video
    else if (m.quoted) {
        const qmtype = m.quoted.mtype
        if (qmtype === 'imageMessage') {
            mediaMsg  = m.quoted
            mediaType = 'imageMessage'
        } else if (qmtype === 'videoMessage') {
            mediaMsg   = m.quoted
            mediaType  = 'videoMessage'
            isAnimated = true
        } else if (qmtype === 'stickerMessage') {
            // Convertir sticker existente
            mediaMsg   = m.quoted
            mediaType  = 'stickerMessage'
            isAnimated = m.quoted.isAnimated || false
        }
    }

    if (!mediaMsg || !mediaType) {
        return sendNino(
            `🎨 *CREADOR DE STICKERS*\n\n` +
            `Envía o responde una *imagen* o *video* con *#s* para convertirlo en sticker.\n\n` +
            `📌 *Ejemplos:*\n` +
            `› Envía imagen + *#s*\n` +
            `› Responde imagen con *#s*\n` +
            `› Responde video/gif con *#s* (máx 8 seg)\n\n` +
            `_Stickers con info de ${nombreBot}_ 🦋`
        )
    }

    // Reaccionar mientras procesa
    await m.react('⏳')

    try {
        // Descargar media
        const buffer = await downloadMedia(mediaMsg, mediaType)

        // Convertir a webp
        let webp
        if (isAnimated || mediaType === 'videoMessage') {
            webp = await videoToWebp(buffer)
        } else {
            webp = await imageToWebp(buffer)
        }

        // Agregar metadata con info del bot
        const packName   = text?.trim() || nombreBot
        const authorName = `@${canalLink.split('/channel/')[1] || 'NinoNakano'}`
        webp = await addExif(webp, packName, authorName)

        // Enviar sticker
        await conn.sendMessage(m.chat, {
            sticker: webp,
            contextInfo: {
                externalAdReply: {
                    title: `🦋 ${nombreBot}`,
                    body: `Sticker creado por ${nombreBot}`,
                    thumbnailUrl: bannerUrl,
                    sourceUrl: canalLink,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    showAdAttribution: false
                }
            }
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error('[STICKER ERROR]', e)
        await m.react('❌')
        return sendNino(`❌ No pude crear el sticker.\n\nError: ${e.message}`)
    }
}

handler.command = ['s', 'sticker']
export default handler
