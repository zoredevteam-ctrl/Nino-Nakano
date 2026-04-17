import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import exif from '../../core/exif.js';
const { writeExif } = exif;

export default {
  command: ['sticker', 's', 'stk'],
  category: 'stickers',
  run: async (client, m, args, usedPrefix, command) => {
    try {
      // ─── MENÚ DE AYUDA (-list) ──────────────────────────────────────────────
      if (args[0] === '-list') {
        let helpText = `🦋 *NINO NAKANO PREMIUM - STICKER HELP* 🦋\n\n` +
          `✦ *Formas Disponibles:*\n` +
          `- -c : Circular\n- -t : Triangular\n- -s : Estrella\n- -r : Redondeado\n- -h : Hexagonal\n- -d : Diamante\n` +
          `- -f : Con Marco\n- -b : Con Borde\n- -w : Onda\n- -m : Espejado\n- -o : Octogonal\n- -v : Corazón\n` +
          `- -x : Expandido (Cover)\n- -i : Contenido (Contain)\n\n` +
          `✧ *Efectos Disponibles:*\n` +
          `- -blur : Desenfoque\n- -sepia : Sepia\n- -invert : Invertir\n- -grayscale : Grises\n- -flip : Giro horizontal\n- -flop : Giro vertical\n` +
          `- -tint : Tinte de color\n\n` +
          `> *Ejemplo:* ${usedPrefix + command} -c -blur Nino | 𝓐𝓪𝓻𝓸𝓶`;
        return client.reply(m.chat, helpText, m);
      }

      const quoted = m.quoted ? m.quoted : m;
      const mime = (quoted.msg || quoted).mimetype || '';
      
      // ─── IDENTIDAD DEL BOT (PREMIUM) ────────────────────────────────────────
      const packDefault = "Nino Nakano PREMIUM 🦋";
      const authorDefault = "𝓐𝓪𝓻𝓸𝓶";

      let urlArg = null;
      let argsWithoutUrl = [];
      for (let arg of args) {
        if (isUrl(arg)) urlArg = arg;
        else argsWithoutUrl.push(arg);
      }

      let filteredText = argsWithoutUrl.join(' ').replace(/-\w+/g, '').trim();
      let marca = filteredText.split(/[\u2022|]/).map(part => part.trim());
      
      let pack = marca[0] || packDefault;
      let author = marca.length > 1 ? marca[1] : authorDefault;

      // ─── CONFIGURACIÓN DE FILTROS ───────────────────────────────────────────
      const shapeArgs = { '-c': 'circle', '-t': 'triangle', '-s': 'star', '-r': 'roundrect', '-h': 'hexagon', '-d': 'diamond', '-f': 'frame', '-b': 'border', '-w': 'wave', '-m': 'mirror', '-o': 'octagon', '-y': 'pentagon', '-e': 'ellipse', '-z': 'cross', '-v': 'heart', '-x': 'cover', '-i': 'contain' };
      const effectArgs = { '-blur': 'blur', '-sepia': 'sepia', '-sharpen': 'sharpen', '-brighten': 'brighten', '-darken': 'darken', '-invert': 'invert', '-grayscale': 'grayscale', '-rotate90': 'rotate90', '-rotate180': 'rotate180', '-flip': 'flip', '-flop': 'flop', '-normalice': 'normalise', '-negate': 'negate', '-tint': 'tint' };
      
      const effects = [];
      for (const arg of argsWithoutUrl) {
        if (shapeArgs[arg]) effects.push({ type: 'shape', value: shapeArgs[arg] });
        else if (effectArgs[arg]) effects.push({ type: 'effect', value: effectArgs[arg] });
      }

      // ─── FUNCIONES DE PROCESAMIENTO ──────────────────────────────────────────
      const sendWebpWithExif = async (webpBuffer) => {
        const media = { mimetype: 'webp', data: webpBuffer };
        const metadata = { packname: pack, author: author, categories: ['🦋'] };
        const stickerPath = await writeExif(media, metadata);
        await client.sendMessage(m.chat, { sticker: { url: stickerPath } }, { quoted: m });
        if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath);
      };

      const processWithFFmpeg = async (inputPath, isVideo = false) => {
        const outputPath = `./tmp/nino_stk_${Date.now()}.webp`;
        const vf = buildFFmpegFilters(effects);
        
        // Ajuste de calidad: Bajamos de 70 a 50 para evitar stickers pesados que causan "fantasma"
        let ffmpegArgs = [
          '-y', '-i', inputPath, 
          '-vf', vf, 
          '-an', 
          '-fps_mode', 'passthrough', 
          '-c:v', 'libwebp', // Usamos libwebp estándar para mayor compatibilidad
          '-preset', 'default', 
          '-compression_level', '6', 
          '-q:v', isVideo ? '35' : '50', // Calidad baja para videos para asegurar peso < 1MB
          '-loop', '0', 
          outputPath
        ];

        await new Promise((resolve, reject) => {
          const p = spawn('ffmpeg', ffmpegArgs);
          let err = '';
          p.stderr.on('data', (d) => err += d.toString());
          p.on('close', (code) => { if (code === 0) resolve(); else reject(new Error(err)); });
        });

        const data = fs.readFileSync(outputPath);
        fs.unlinkSync(outputPath);
        await sendWebpWithExif(data);
      };

      // ─── LÓGICA DE DETECCIÓN ────────────────────────────────────────────────
      await m.react('⏳');

      if (/image|webp/.test(mime)) {
        let buffer = await quoted.download();
        const inputPath = `./tmp/nino_in_${Date.now()}.${/webp/.test(mime) ? 'webp' : 'png'}`;
        fs.writeFileSync(inputPath, buffer);
        await processWithFFmpeg(inputPath, false);
        fs.unlinkSync(inputPath);
      } else if (/video/.test(mime)) {
        // Límite de 8 segundos para evitar cuadros grises por peso excesivo
        if ((quoted.msg || quoted).seconds > 8) {
          return m.reply('🦋 *Ups!* El video es muy largo. Máximo 8 segundos para evitar errores.');
        }
        let buffer = await quoted.download();
        const inputPath = `./tmp/nino_vid_${Date.now()}.mp4`;
        fs.writeFileSync(inputPath, buffer);
        await processWithFFmpeg(inputPath, true);
        fs.unlinkSync(inputPath);
      } else if (urlArg) {
        // Soporte URL (se mantiene tu lógica original con nombres corregidos)
        const response = await fetch(urlArg);
        if (!response.ok) return m.reply('🦋 No pude descargar la imagen de esa URL.');
        const buffer = Buffer.from(await response.arrayBuffer());
        const inputPath = `./tmp/nino_url_${Date.now()}.png`;
        fs.writeFileSync(inputPath, buffer);
        await processWithFFmpeg(inputPath, urlArg.includes('.mp4'));
        fs.unlinkSync(inputPath);
      } else {
        return client.reply(m.chat, `🦋 *NINO NAKANO PREMIUM*\n\nResponde a una imagen, video o sticker para empezar.\n\n> Usa *${usedPrefix + command} -list* para ver los efectos pro.`, m);
      }
      
      await m.react('✅');

    } catch (e) {
      console.error(e);
      await m.react('❌');
      return m.reply(`🦋 *Error en el sistema:*\n> ${e.message}`);
    }
  }
};

// ─── CONSTRUCCIÓN DE FILTROS FFmpeg (CORREGIDO PARA EVITAR STICKER GRIS) ───────
const buildFFmpegFilters = (effects) => {
  const W = 512;
  const H = 512;
  const filters = [];
  const shape = effects.find(e => e.type === 'shape')?.value;
  const effectList = effects.filter(e => e.type === 'effect').map(e => e.value);

  if (shape === 'cover') {
    filters.push(`scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`);
  } else {
    filters.push(`scale=${W}:${H}:force_original_aspect_ratio=decrease`);
    // Corregimos el color de fondo a transparente total
    filters.push(`pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`);
  }

  filters.push('format=rgba'); // Canal alpha necesario para transparencia

  for (const effect of effectList) {
    switch (effect) {
      case 'blur': filters.push('gblur=sigma=5'); break;
      case 'sepia': filters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'); break;
      case 'invert': filters.push('negate'); break;
      case 'grayscale': filters.push('hue=s=0'); break;
      case 'flip': filters.push('hflip'); break;
      case 'flop': filters.push('vflip'); break;
      case 'tint': filters.push('colorchannelmixer=1:0:0:0:0:0.5:0:0:0:0:0.5'); break;
    }
  }

  // Lógica de formas geométricas (Circle, Heart, etc.)
  if (shape && !['cover', 'contain', 'mirror', 'border', 'frame'].includes(shape)) {
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) / 2;
    let alphaExpr = '';
    switch (shape) {
      case 'circle': alphaExpr = `if(lte((X-${cx})*(X-${cx})+(Y-${cy})*(Y-${cy}),${r * r}),255,0)`; break;
      case 'heart': alphaExpr = `if(lte(pow((X-${cx})/(${W * 0.3})*(X-${cx})/(${W * 0.3})+(Y-${cy})/(${H * 0.3})*(Y-${cy})/(${H * 0.3})-1,3)-((X-${cx})/(${W * 0.3})*(X-${cx})/(${W * 0.3}))*pow((Y-${cy})/(${H * 0.3}),3),0),255,0)`; break;
      case 'diamond': alphaExpr = `if(lte(abs(X-${cx})+abs(Y-${cy}),${r}),255,0)`; break;
      case 'star': alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W * 0.25}+${W * 0.1}*cos(5*atan2(Y-${cy},X-${cx}))),255,0)`; break;
    }
    if (alphaExpr) filters.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaExpr}'`);
  }

  // Pix_fmt yuva420p es obligatorio para que WhatsApp no dé cuadro gris
  filters.push('format=yuva420p'); 
  return filters.join(',');
};

const isUrl = (text) => {
  return text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/, 'gi'));
};
