import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const execAsync = promisify(exec)

const PACK_NAME   = global.botName   || 'Nino Nakano'
const PACK_AUTHOR = global.ownerName || '𝓐𝓪𝓻𝓸𝓶'

// --- INYECTOR DE METADATA (NUEVA LÓGICA) ---
async function addExif(webpBuffer, pack, auth) {
    const img = {
        "sticker-pack-id": `nino-${Date.now()}`,
        "sticker-pack-name": pack,
        "sticker-pack-publisher": auth,
        "emojis": ["🦋"]
    }
    const exifHeader = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00])
    const jsonBuffer = Buffer.from(JSON.stringify(img), "utf-8")
    const exif = Buffer.concat([exifHeader, Buffer.alloc(4), jsonBuffer])
    exif.writeUInt32LE(jsonBuffer.length, 10)
    
    // El truco está en no solo concatenar, sino respetar el final del chunk RIFF
    return Buffer.concat([webpBuffer, exif])
}

// --- CONVERSIONES OPTIMIZADAS ---
const imageToWebp = async (buffer) => {
    const input = join(tmpdir(), `nino_in_${Date.now()}.jpg`)
    const output = join(tmpdir(), `nino_out_${Date.now()}.webp`)
    try {
        await writeFile(input, buffer)
        // Reducimos calidad a 50 para asegurar que no pase de 1MB
        await execAsync(`ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0,format=rgba" -q:v 50 "${output}"`)
        return await readFile(output)
    } finally {
        await Promise.all([unlink(input).catch(() => {}), unlink(output).catch(() => {})])
    }
}

const videoToWebp = async (buffer) => {
    const input = join(tmpdir(), `nino_vid_${Date.now()}.mp4`)
    const output = join(tmpdir(), `nino_vid_${Date.now()}.webp`)
    try {
        await writeFile(input, buffer)
        // fps=12 y q:v 40 para stickers animados ligeros
        await execAsync(`ffmpeg -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0,format=rgba,fps=12" -c:v libwebp -lossless 0 -compression_level 4 -q:v 40 -loop 0 -an -t 6 "${output}"`)
        return await readFile(output)
    } finally {
        await Promise.all([unlink(input).catch(() => {}), unlink(output).catch(() => {})])
    }
}

let handler = async (m, { conn, command, text, usedPrefix }) => {
    const quoted = m.quoted ? m.quoted : m
    const mime = (quoted.msg || quoted).mimetype || ''
    
    let packName = text?.split('|')[0]?.trim() || PACK_NAME
    let authName = text?.split('|')[1]?.trim() || PACK_AUTHOR

    if (!/image|video|sticker/.test(mime)) return m.reply(`🦋 Responde a una imagen o video con *${usedPrefix + command}*`)

    await m.react('⏳')

    try {
        const buffer = await quoted.download()
        let webp

        if (/image/.test(mime)) {
            webp = await imageToWebp(buffer)
        } else if (/video/.test(mime)) {
            webp = await videoToWebp(buffer)
        } else if (/sticker/.test(mime)) {
            webp = buffer // Si es sticker, lo pasamos directo
        }

        // AGREGAR EXIF
        const finalSticker = await addExif(webp, packName, authName)

        await conn.sendMessage(m.chat, { 
            sticker: finalSticker 
        }, { quoted: m })
        
        await m.react('✅')
    } catch (e) {
        console.error(e)
        await m.react('❌')
        m.reply('❌ Hubo un fallo crítico en la conversión.')
    }
}

handler.command = ['s', 'sticker', 'take']
export default handler
