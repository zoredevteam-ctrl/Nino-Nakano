import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)
const RCANAL = 'https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G'

const downloadMedia = async (msg, mtype) => {
    const mediaType = mtype.replace('Message', '')
    const stream = await downloadContentFromMessage(msg, mediaType)
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    return Buffer.concat(chunks)
}

// Imagen a webp - sin parentesis en el filtro para compatibilidad con sh
const imageToWebp = async (buffer) => {
    const tmpIn  = path.join(os.tmpdir(), 'nino_in_'  + Date.now() + '.jpg')
    const tmpOut = path.join(os.tmpdir(), 'nino_out_' + Date.now() + '.webp')
    try {
        fs.writeFileSync(tmpIn, buffer)
        // Usar scale simple sin pad para evitar el error de parentesis
        await execAsync(
            'ffmpeg -y -i "' + tmpIn + '"' +
            ' -vf "scale=512:512:force_original_aspect_ratio=decrease"' +
            ' -c:v libwebp -quality 80' +
            ' "' + tmpOut + '"'
        )
        return fs.readFileSync(tmpOut)
    } finally {
        try { fs.unlinkSync(tmpIn) } catch {}
        try { fs.unlinkSync(tmpOut) } catch {}
    }
}

// Video/gif a webp ANIMADO
const videoToWebp = async (buffer) => {
    const tmpIn  = path.join(os.tmpdir(), 'nino_in_'  + Date.now() + '.mp4')
    const tmpOut = path.join(os.tmpdir(), 'nino_out_' + Date.now() + '.webp')
    try {
        fs.writeFileSync(tmpIn, buffer)
        // Comando probado para webp animado - sin parentesis
        await execAsync(
            'ffmpeg -y -i "' + tmpIn + '"' +
            ' -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15"' +
            ' -vcodec libwebp' +
            ' -lossless 0' +
            ' -compression_level 6' +
            ' -q:v 50' +
            ' -loop 0' +
            ' -preset picture' +
            ' -an' +
            ' -t 8' +
            ' "' + tmpOut + '"'
        )
        return fs.readFileSync(tmpOut)
    } finally {
        try { fs.unlinkSync(tmpIn) } catch {}
        try { fs.unlinkSync(tmpOut) } catch {}
    }
}

// Agregar metadata EXIF al webp (info del pack visible en WhatsApp)
const addExif = async (webpBuffer, packName, authorName) => {
    try {
        // Construir el EXIF manualmente con el JSON de WhatsApp
        const json = JSON.stringify({
            'sticker-pack-id': 'nino_' + Date.now(),
            'sticker-pack-name': packName,
            'sticker-pack-publisher': authorName,
            'emojis': ['🦋']
        })

        const jsonBuf = Buffer.from(json, 'utf8')

        // Header EXIF para WebP
        const exifHeader = Buffer.from([
            0x49, 0x49, 0x2A, 0x00, // TIFF header little-endian
            0x08, 0x00, 0x00, 0x00, // Offset al primer IFD
            0x01, 0x00,             // Numero de entradas IFD
            0x41, 0x57,             // Tag 0x5741 = 'WA'
            0x07, 0x00              // Tipo: UNDEFINED
        ])

        const sizeBuf = Buffer.alloc(4)
        sizeBuf.writeUInt32LE(jsonBuf.length, 0)

        const exifData = Buffer.concat([exifHeader, sizeBuf, jsonBuf])

        // Insertar en el WebP
        // WebP tiene formato: RIFF????WEBP + chunks
        // Agregar chunk EXIF
        if (webpBuffer.slice(0, 4).toString() !== 'RIFF') {
            return webpBuffer
        }

        const exifChunkName = Buffer.from('EXIF')
        const exifChunkSize = Buffer.alloc(4)
        exifChunkSize.writeUInt32LE(exifData.length, 0)

        // Marcar el archivo WebP como que tiene EXIF en el byte de flags
        const result = Buffer.concat([
            webpBuffer,
            exifChunkName,
            exifChunkSize,
            exifData
        ])

        // Actualizar el tamaño RIFF
        result.writeUInt32LE(result.length - 8, 4)

        return result
    } catch {
        return webpBuffer
    }
}

let handler = async (m, { conn, text }) => {
    const nombreBot = global.botName || 'Nino Nakano'
    const canalLink = global.rcanal || RCANAL
    const bannerUrl = global.banner || ''

    const sendNino = async (txt) => {
        let thumbBuf = null
        try {
            const r = await fetch(bannerUrl || 'https://causas-files.vercel.app/fl/cyns.png')
            thumbBuf = Buffer.from(await r.arrayBuffer())
        } catch {}
        return conn.sendMessage(m.chat, {
            text: txt,
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                    serverMessageId: '',
                    newsletterName: global.newsletterName || nombreBot
                },
                externalAdReply: {
                    title: '🦋 ' + nombreBot + ' Stickers',
                    body: 'Sticker Maker',
                    thumbnail: thumbBuf,
                    sourceUrl: canalLink,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    showAdAttribution: false
                }
            }
        }, { quoted: m })
    }

    // Verificar ffmpeg
    try {
        await execAsync('ffmpeg -version')
    } catch {
        return sendNino('❌ *ffmpeg* no esta instalado.\n\nEn servidor: apt install ffmpeg\nEn Termux: pkg install ffmpeg')
    }

    // Detectar media
    let mediaMsg = null
    let mediaType = null
    let isAnimated = false

    if (m.mtype === 'imageMessage') {
        mediaMsg  = m.msg
        mediaType = 'imageMessage'
    } else if (m.mtype === 'videoMessage') {
        mediaMsg   = m.msg
        mediaType  = 'videoMessage'
        isAnimated = true
    } else if (m.quoted) {
        const qmtype = m.quoted.mtype
        if (qmtype === 'imageMessage') {
            mediaMsg  = m.quoted
            mediaType = 'imageMessage'
        } else if (qmtype === 'videoMessage') {
            mediaMsg   = m.quoted
            mediaType  = 'videoMessage'
            isAnimated = true
        } else if (qmtype === 'stickerMessage') {
            mediaMsg   = m.quoted
            mediaType  = 'stickerMessage'
            isAnimated = m.quoted.isAnimated || false
        }
    }

    if (!mediaMsg || !mediaType) {
        return sendNino(
            '🎨 *CREADOR DE STICKERS*\n\n' +
            'Envia o responde una *imagen* o *video* con *#s*\n\n' +
            '📌 Ejemplos:\n' +
            '› Envia imagen + *#s*\n' +
            '› Responde imagen con *#s*\n' +
            '› Responde video/gif con *#s* (max 8 seg)\n\n' +
            '_Stickers by ' + nombreBot + '_ 🦋'
        )
    }

    await m.react('⏳')

    try {
        const buffer = await downloadMedia(mediaMsg, mediaType)

        let webp
        if (isAnimated || mediaType === 'videoMessage') {
            webp = await videoToWebp(buffer)
        } else {
            webp = await imageToWebp(buffer)
        }

        // Pack info visible en WhatsApp
        const packName   = (text && text.trim()) ? text.trim() : nombreBot
        const authorName = canalLink.includes('/channel/')
            ? '@' + canalLink.split('/channel/')[1]
            : nombreBot

        webp = await addExif(webp, packName, authorName)

        // Enviar sticker (sin contextInfo, Baileys no lo soporta en stickers)
        await conn.sendMessage(m.chat, {
            sticker: webp
        }, { quoted: m })

        // Mensaje de confirmacion con newsletter
        const thumbBuf = await fetch(bannerUrl || 'https://causas-files.vercel.app/fl/cyns.png')
            .then(r => r.arrayBuffer())
            .then(b => Buffer.from(b))
            .catch(() => null)

        await conn.sendMessage(m.chat, {
            text: '✅ *Sticker creado por ' + nombreBot + '* 🦋',
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                    serverMessageId: '',
                    newsletterName: global.newsletterName || nombreBot
                },
                externalAdReply: {
                    title: '🦋 ' + nombreBot + ' Stickers',
                    body: 'Sticker creado exitosamente',
                    thumbnail: thumbBuf,
                    sourceUrl: canalLink,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    showAdAttribution: false
                }
            }
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error('[STICKER ERROR]', e.message)
        await m.react('❌')
        return sendNino('❌ No pude crear el sticker.\n\nError: ' + e.message)
    }
}

handler.command = ['s', 'sticker']
export default handler
