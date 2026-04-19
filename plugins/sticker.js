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
      // TEST: verificar que el handler se ejecuta
      return client.reply(
        m.chat,
        `🦋 Handler Nino activo.\n\nArgs: ${args.join(' ') || '(sin args)'}\nComando: ${usedPrefix + command}`,
        m
      )
    } catch (e) {
      console.error('[STICKER TEST ERROR]', e.message)
      client.reply(
        m.chat,
        '🦋 *Error en handler de prueba.*',
        m
      )
    }
  }
}

// ─── FUNCno usadas en la prueba, pero las dejo igual) ────────

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

    filters.push('format=yuva420p')
    return filters.join(',')
  }
