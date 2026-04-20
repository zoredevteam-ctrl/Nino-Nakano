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
    const debug = async (txt) => {
      try { await m.reply('🐞 ' + txt) } catch {}
    }

    try {
      await debug('Inicio comando')

      if (args[0] === '-list') {
        return m.reply(
          `🦋 NINO NAKANO PREMIUM 🦋\n\n` +
          `✦ Uso:\n- Responde a imagen o video\n\n` +
          `> Ejemplo: ${usedPrefix + command}`
        )
      }

      if (!m.chat || typeof m.chat !== 'string') {
        await debug('Chat inválido')
        return
      }

      const quoted = m.quoted || m
const msg = quoted.msg || quoted

const mime = msg.mimetype || ''
const hasMedia = msg.url || msg.directPath

if (!hasMedia) {
  await debug('Sin mediaKey / media inválida')
  return m.reply('❌ Ese mensaje no contiene media válida')
}

      await debug('Mime: ' + mime)

      if (!/image|video|webp/.test(mime)) {
        await debug('Mime no válido')
        return m.reply(`Responde a imagen o video`)
      }

      const buffer = await quoted.download()
      await debug('Media descargada: ' + buffer.length + ' bytes')

      const isVideo = /video/.test(mime) || (quoted.msg || quoted).gifPlayback

      if (isVideo && (quoted.msg || quoted).seconds > 10) {
        await debug('Video muy largo')
        return m.reply('Máximo 10 segundos')
      }

      const filteredText = args.join(' ').trim()
      const marca = filteredText.split(/[•|]/).map(v => v.trim())
      const pack = marca[0] || PACK_NAME
      const author = marca[1] || PACK_AUTHOR

      const metadata = {
        packname: pack,
        author: author,
        categories: ['🦋']
      }

      await debug('Procesando a webp...')

      let stickerPath

      if (isVideo) {
        await debug('Modo video')
        stickerPath = await writeExifVid(buffer, metadata, debug)
      } else {
        await debug('Modo imagen')
        stickerPath = await writeExifImg(buffer, metadata, debug)
      }

      await debug('Leyendo resultado')

      const finalSticker = fs.readFileSync(stickerPath)

      await m.reply({
  sticker: finalSticker,
  packname: pack,
  author: author
})

      await debug('Sticker enviado')

      if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath)

    } catch (e) {
      console.error(e)
      const msg = e?.stack?.slice(0, 400) || e.toString()
      await m.reply('💥 ERROR:\n' + msg)
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

async function imageToWebp(buffer, debug) {
  return new Promise((resolve, reject) => {
    const chunks = []

    ffmpeg(bufferToStream(buffer))
      .addOutputOptions([
        "-vcodec", "libwebp",
        "-vf", "scale=320:320:force_original_aspect_ratio=increase,crop=320:320,fps=15,format=rgba"
      ])
      .format('webp')
      .on('error', async (err) => {
        await debug('Error ffmpeg img: ' + err.message)
        reject(err)
      })
      .on('end', async () => {
        await debug('ffmpeg img OK')
        resolve(Buffer.concat(chunks))
      })
      .pipe()
      .on('data', c => chunks.push(c))
  })
}

async function videoToWebp(buffer, debug) {
  return new Promise((resolve, reject) => {
    const chunks = []

    ffmpeg(bufferToStream(buffer))
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
      .on('error', async (err) => {
        await debug('Error ffmpeg vid: ' + err.message)
        reject(err)
      })
      .on('end', async () => {
        await debug('ffmpeg vid OK')
        resolve(Buffer.concat(chunks))
      })
      .pipe()
      .on('data', c => chunks.push(c))
  })
}

async function writeExifImg(media, metadata, debug) {
  const wMedia = await imageToWebp(media, debug)
  await debug('Añadiendo EXIF img')
  return await addExif(wMedia, metadata, debug)
}

async function writeExifVid(media, metadata, debug) {
  const wMedia = await videoToWebp(media, debug)
  await debug('Añadiendo EXIF vid')
  return await addExif(wMedia, metadata, debug)
}

async function addExif(webpBuffer, metadata, debug) {
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

  try {
    const img = new webp.Image()
    await img.load(tmpIn)
    img.exif = exif
    await img.save(tmpOut)
    await debug('EXIF aplicado')
  } catch (e) {
    await debug('Error EXIF: ' + e.message)
    throw e
  }

  fs.unlinkSync(tmpIn)
  return tmpOut
}