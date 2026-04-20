import fs from 'fs'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import webp from 'node-webpmux'
import { tmpdir } from 'os'
import { Readable } from 'stream'

const PACK_NAME = 'Nino Nakano PREMIUM 🦋'
const PACK_AUTHOR = '𝓐𝓪𝓻𝓸𝓶'

const tempFolder = tmpdir()
const randomFileName = (ext) => `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`

export default {
  command: ['sticker', 's', 'stk'],
  category: 'stickers',
  run: async (m, { args, usedPrefix, command }) => {
    try {
      if (args[0] === '-list') {
        const helpText =
          `🦋 NINO NAKANO PREMIUM 🦋\n\n` +
          `✦ Uso:\n- Responde a imagen o video\n\n` +
          `> Ejemplo: ${usedPrefix + command}`
        return m.reply(helpText)
      }

      if (!m.chat || typeof m.chat !== 'string') return

      const quoted = m.quoted ? m.quoted : m
      const mime = (quoted.msg || quoted).mimetype || ''

      const filteredText = args.join(' ').trim()
      const marca = filteredText.split(/[•|]/).map(v => v.trim())
      const pack = marca[0] || PACK_NAME
      const author = marca[1] || PACK_AUTHOR

      await m.react('⏳')

      if (!/image|video|webp/.test(mime)) {
        return m.reply(
          `🦋 NINO NAKANO PREMIUM\n\nResponde a una imagen o video.`
        )
      }

      const buffer = await quoted.download()
      const isVideo = /video/.test(mime) || (quoted.msg || quoted).gifPlayback

      if (isVideo && (quoted.msg || quoted).seconds > 10) {
        return m.reply('🦋 Error: Video máximo 10 seg.')
      }

      const metadata = {
        packname: pack,
        author: author,
        categories: ['🦋']
      }

      let stickerPath

      if (isVideo) {
        stickerPath = await writeExifVid(buffer, metadata)
      } else {
        stickerPath = await writeExifImg(buffer, metadata)
      }

      const finalSticker = fs.readFileSync(stickerPath)

      await m.reply(finalSticker, null, {
        asSticker: true,
        packname: pack,
        author: author
      })

      await m.react('✅')

      if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath)

    } catch (e) {
      console.error(e)
      await m.react('❌')
      m.reply('🦋 Error de procesamiento.')
    }
  }
}

function bufferToStream(buffer) {
  return new Readable({
    read() {
      this.push(buffer)
      this.push(null)
    }
  })
}

async function imageToWebp(buffer) {
  return new Promise((resolve, reject) => {
    const chunks = []

    ffmpeg(bufferToStream(buffer))
      .inputFormat('jpeg')
      .addOutputOptions([
        "-vcodec", "libwebp",
        "-vf", "scale=320:320:force_original_aspect_ratio=increase,crop=320:320,fps=15,format=rgba"
      ])
      .format('webp')
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks)))
      .pipe()
      .on('data', c => chunks.push(c))
  })
}

async function videoToWebp(buffer) {
  return new Promise((resolve, reject) => {
    const chunks = []

    ffmpeg(bufferToStream(buffer))
      .inputFormat('mp4')
      .addOutputOptions([
        "-vcodec", "libwebp",
        "-vf", "scale=320:320:force_original_aspect_ratio=increase,crop=320:320,fps=15,format=rgba",
        "-loop", "0",
        "-ss", "00:00:00",
        "-t", "00:00:05",
        "-preset", "default",
        "-an",
        "-vsync", "0"
      ])
      .format('webp')
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(chunks)))
      .pipe()
      .on('data', c => chunks.push(c))
  })
}

async function writeExifImg(media, metadata) {
  const wMedia = await imageToWebp(media)
  return await addExif(wMedia, metadata)
}

async function writeExifVid(media, metadata) {
  const wMedia = await videoToWebp(media)
  return await addExif(wMedia, metadata)
}

async function addExif(webpBuffer, metadata) {
  const tmpIn = path.join(tempFolder, randomFileName("webp"))
  const tmpOut = path.join(tempFolder, randomFileName("webp"))

  fs.writeFileSync(tmpIn, webpBuffer)

  const json = {
    "sticker-pack-id": "suki-3.0",
    "sticker-pack-name": metadata.packname,
    "sticker-pack-publisher": metadata.author,
    emojis: metadata.categories || [""]
  }

  const exifAttr = Buffer.from([
    0x49,0x49,0x2A,0x00,
    0x08,0x00,0x00,0x00,
    0x01,0x00,0x41,0x57,
    0x07,0x00,0x00,0x00,
    0x00,0x00,0x16,0x00,
    0x00,0x00
  ])

  const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8")
  const exif = Buffer.concat([exifAttr, jsonBuff])
  exif.writeUIntLE(jsonBuff.length, 14, 4)

  const img = new webp.Image()
  await img.load(tmpIn)
  img.exif = exif
  await img.save(tmpOut)

  fs.unlinkSync(tmpIn)

  return tmpOut
}