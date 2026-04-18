// Código creado por Zoredevteam-ctrl

import ytsearch from 'yt-search'
import { getBuffer } from '../../core/message.ts'
import fetch from 'node-fetch'

export default {
  command: ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'],
  category: 'downloader',
  run: async (sock, m, args) => {
    try {
      if (!args[0]) {
        return m.reply('《✧》 ¡Hola! Por favor, dime el nombre o envíame el enlace del video que deseas escuchar 💕')
      }

      const text = args.join(' ')
      const searchResult = await ytsearch(text)
      if (!searchResult.videos || !searchResult.videos.length) {
        return m.reply('《✧》 Lo siento mucho, no pude encontrar ese video. ¿Podrías intentar con otro? 🥺')
      }

      const video = searchResult.videos[0]

      const { title, author, timestamp: duration, views, url, image } = video
      const vistas = (views || 0).toLocaleString()
      const canal = author?.name || author || 'Desconocido'
      const thumbBuffer = await getBuffer(image)

      const caption = `➥ Descargando tu canción › ${title}

> ✿⃘࣪◌ ֪ Canal › ${canal}
> ✿⃘࣪◌ ֪ Duración › ${duration || 'Desconocido'}
> ✿⃘࣪◌ ֪ Vistas › ${vistas}
> ✿⃘࣪◌ ֪ Enlace › ${url}

𐙚 ❀ ｡ ↻ Dame un momentito, Nino ya te está enviando el audio... ˙𐙚`

      await sock.sendMessage(m.chat, { image: thumbBuffer, caption }, { quoted: m })

      const dlEndpoint = `${global.api.url}/dl/ytmp3v2?url=${encodeURIComponent(url)}&key=${global.api.key}`
      const resDl = await fetch(dlEndpoint).then(r => r.json())
      
      if (!resDl?.status || !resDl.data?.dl) {
        return m.reply('《✧》 Ay, hubo un problemita y no pude descargar el *audio*. ¿Lo intentamos de nuevo más tarde? 🌸')
      }

      const audioBuffer = await getBuffer(resDl.data.dl)
      const mensaje = {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${resDl.data.title || title}.mp3`
      }

      await sock.sendMessage(m.chat, mensaje, { quoted: m })
    } catch (e) {
      await m.reply(global.msgglobal || '《✧》 Ocurrió un error inesperado, por favor avísale a mi creador. 😥')
    }
  }
}
