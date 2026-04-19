import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { tmpdir } from 'os';

// ─── CONFIGURACIÓN DE IDENTIDAD ───────────────────────────────────────────────
const PACK_NAME   = 'Nino Nakano PREMIUM 🦋'
const PACK_AUTHOR = '𝓐𝓪𝓻𝓸𝓶'

export default {
  command: ['sticker', 's', 'stk'],
  category: 'stickers',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      // ─── MENÚ DE AYUDA (-list) ──────────────────────────────────────────────
      if (args[0] === '-list') {
        const helpText =
          `🦋 *NINO NAKANO PREMIUM* 🦋\n\n` +
          `✦ *Formas:*\n- -c (Círculo), -t (Triángulo), -s (Estrella), -r (Redondeado), -v (Corazón), -d (Diamante)\n\n` +
          `✧ *Efectos:*\n- -blur, -sepia, -invert, -grayscale, -flip, -flop, -tint\n\n` +
          `> *Ejemplo:* ${usedPrefix + command} -c -blur Nino | 𝓐𝓪𝓻om`
        return client.reply(m.chat, helpText, m)
      }

      const quoted = m.quoted ? m.quoted : m
      const mime   = (quoted.msg || quoted).mimetype || ''

      // Manejo de Texto / Pack / Autor
      const filteredText = args.join(' ').replace(/-\w+/g, '').trim()
      const marca  = filteredText.split(/[\u2022|]/).map(part => part.trim())
      const pack   = marca[0] || PACK_NAME
      const author = marca.length > 1 ? marca[1] : PACK_AUTHOR

      // ─── CONTEXTO NEWSLETTER ───────────────────────────────────────────────
      const thumb       = await global.getBannerThumb()
      const contextInfo = global.getNewsletterCtx(
        thumb,
        `🦋 ${global.botName || 'Nino Bot'}`,
        'Sticker Maker PREMIUM'
      )

      // ─── VALIDAR MEDIA ────────────────────────────────────────────────────
      if (!/image|video|webp/.test(mime)) {
        return client.reply(
          m.chat,
          `🦋 *NINO NAKANO PREMIUM*\n\n` +
          `Responde a una imagen o video para crear un sticker.\n` +
          `> Usa *${usedPrefix + command} -list* para ver efectos.`,
          m
        )
      }

      const buffer  = await quoted.download()
      const isVideo = /video/.test(mime) || (quoted.msg || quoted).gifPlayback

      if (isVideo && (quoted.msg || quoted).seconds > 10) {
        return client.reply(
          m.chat,
          '🦋 *Error:* El video no puede durar más de 10 segundos.',
          m
        )
      }

      const inputPath  = path.join(tmpdir(), `nino_in_${Date.now()}`)
      const outputPath = path.join(tmpdir(), `nino_out_${Date.now()}.webp`)
      fs.writeFileSync(inputPath, buffer)

      // ─── FFmpeg ANTIFANTASMA ──────────────────────────────────────────────
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
        p.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg falló con código ' + code)))
      })

      const stickerBuffer = fs.readFileSync(outputPath)
      const finalSticker  = await addExif(stickerBuffer, pack, author)

      // ENVÍO DEL STICKER (tu base sí soporta esto)
      await client.sendMessage(
        m.chat,
        { sticker: finalSticker, contextInfo },
        { quoted: m }
      )

    } catch (e) {
      console.error('[STICKER ERROR]', e.message)
      client.reply(
        m.chat,
        '🦋 *Error:* Intenta con una imagen más pequeña o un video más corto.',
        m
      )
    }
  }
}

// ─── FUNCIONES TÉCNICAS ───────────────────────────────────────────────────────

async function addExif(buffer, pack, auth) {
    const json = {
        'sticker-pack-id':        `nino-${Date.now()}`,
        'sticker-pack-name':      pack,
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

    filters.push('format=yuva420p') // CRÍTICO: evita sticker fantasma
    return filters.join(',')
        }
