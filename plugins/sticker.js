import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { tmpdir } from 'os';

const PACK_NAME   = 'Nino Nakano PREMIUM 🦋'
const PACK_AUTHOR = '𝓐𝓪𝓻𝓸𝓶'

export default {
  command: ['sticker', 's', 'stk'],
  category: 'stickers',
  run: async (m, { conn, args, usedPrefix, command }) => {

    try {
      if (args[0] === '-list') {
        const helpText =
          `🦋 NINO NAKANO PREMIUM 🦋\n\n` +
          `✦ Formas:\n- -c (Círculo), -t (Triángulo), -s (Estrella), -r (Redondeado), -v (Corazón), -d (Diamante)\n\n` +
          `✧ Efectos:\n- -blur, -sepia, -invert, -grayscale, -flip, -flop, -tint\n\n` +
          `> Ejemplo: ${usedPrefix + command} -c -blur Nino | 𝓐𝓪𝓻om`
        return conn.reply(m.chat, helpText, m)
      }

      if (!m.chat || typeof m.chat !== 'string') return

      const quoted = m.quoted ? m.quoted : m
      const mime   = (quoted.msg || quoted).mimetype || ''

      const filteredText = args.join(' ').replace(/-\w+/g, '').trim()
      const marca  = filteredText.split(/[•|]/).map(part => part.trim())
      const pack   = marca[0] || PACK_NAME
      const author = marca.length > 1 ? marca[1] : PACK_AUTHOR

      const contextInfo = {
        externalAdReply: {
          title: `🦋 ${global.botName || 'Nino Bot'}`,
          body: 'Sticker Maker PREMIUM',
          mediaType: 1,
          previewType: 0,
          renderLargerThumbnail: false,
          thumbnailUrl: 'https://qu.ax/ZviU.jpg',
          sourceUrl: 'https://github.com'
        }
      }

      await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

      if (!/image|video|webp/.test(mime)) {
        return conn.reply(m.chat,
          `🦋 NINO NAKANO PREMIUM\n\n` +
          `Responde a una image o video.\n` +
          `> Usa ${usedPrefix + command} -list`,
          m
        )
      }

      const buffer  = await quoted.download()
      const isVideo = /video/.test(mime) || (quoted.msg || quoted).gifPlayback

      if (isVideo && (quoted.msg || quoted).seconds > 10) {
        return conn.reply(m.chat, '🦋 Error: Video máximo 10 seg.', m)
      }

      const inputPath  = path.join(tmpdir(), `ninoin${Date.now()}`)
      const outputPath = path.join(tmpdir(), `ninoout${Date.now()}.webp`)
      fs.writeFileSync(inputPath, buffer)

      const vf = buildFFmpegFilters(args)
      const ffmpegArgs = [
        '-y', '-i', inputPath,
        '-vf', vf,
        '-vcodec', 'libwebp',
        '-lossless', '0',
        '-compression_level', '6',
        '-q:v', isVideo ? '30' : '50',
        '-loop', '0',
        '-preset', 'picture',
        '-an', '-vsync', '0',
        outputPath
      ]

      await new Promise((resolve, reject) => {
        const p = spawn('ffmpeg', ffmpegArgs)
        p.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg error ' + code)))
      })

      const stickerBuffer = fs.readFileSync(outputPath)
      const finalSticker  = await addExif(stickerBuffer, pack, author)

      const safeQuoted = m?.key ? { key: m.key, message: m.message } : undefined

      await conn.sendMessage(m.chat, {
        sticker: finalSticker,
        contextInfo
      }, safeQuoted ? { quoted: safeQuoted } : {})

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)

    } catch (e) {
      console.error(e)
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      conn.reply(m.chat, '🦋 Error de procesamiento.', m)
    }
  }
}

async function addExif(buffer, pack, auth) {
    const json = {
        'sticker-pack-id': `nino-${Date.now()}`,
        'sticker-pack-name': pack,
        'sticker-pack-publisher': auth,
        'emojis': ['🦋']
    }
    const exifHeader = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00])
    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8')
    const exif = Buffer.concat([exifHeader, Buffer.alloc(4), jsonBuffer])
    exif.writeUInt32LE(jsonBuffer.length, 10)
    return Buffer.concat([buffer, exif])
}

const buildFFmpegFilters = (args) => {
    const effectArgs = {
        '-blur':      'gblur=sigma=5',
        '-sepia':     'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
        '-invert':    'negate',
        '-grayscale': 'hue=s=0',
        '-flip':      'hflip',
        '-flop':      'vflip'
    }
    const filters = [
        'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        'format=rgba'
    ]
    args.forEach(arg => {
        if (effectArgs[arg]) filters.push(effectArgs[arg])
        if (arg === '-c') filters.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte((X-256)*(X-256)+(Y-256)*(Y-256),256*256),255,0)'`)
        if (arg === '-v') filters.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(pow((X-256)/160,2)+pow((Y-256)/160,2)-1,3)-pow((X-256)/160,2)*pow((Y-256)/160,3),0),255,0)'`)
    })
    filters.push('format=yuva420p') 
    return filters.join(',')
    }
