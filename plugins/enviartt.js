/**
 * ENVIARTT - NINO NAKANO
 * Descarga un TikTok y lo envía al canal oficial
 * Comandos: #enviartt, #sendtt
 * Solo owners
 */

const API_KEY = 'causa-ec43262f206b3305'

let handler = async (m, { conn, args }) => {
    const url = args[0] || (m.quoted?.text ? m.quoted.text.trim() : '')

    if (!url || !url.includes('tiktok.com')) {
        return conn.sendMessage(m.chat, {
            text:
                `🎵 *ENVIAR AL CANAL* 📌\n\n` +
                `Necesito un link válido de TikTok~\n\n` +
                `*Uso:*\n` +
                `▸ *#enviartt <link>*\n` +
                `▸ O responde a un mensaje que tenga el link\n\n` +
                `_Ejemplo: #enviartt https://vt.tiktok.com/..._`,
            contextInfo: {
                externalAdReply: {
                    title: `🎵 ${global.botName || 'Nino Nakano'}`,
                    body: 'TikTok → Canal 🦋',
                    thumbnail: await _getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }

    await m.react('⏳')

    try {
        // 1. Obtener JID del canal automáticamente
        const inviteCode = (global.rcanal || '').split('/').pop()
        const metadata = await conn.newsletterMetadata('invite', inviteCode).catch(e => {
            console.error('[ENVIARTT] Error metadata:', e)
            return null
        })

        if (!metadata?.id) {
            await m.react('❌')
            return m.reply(
                `❌ No pude obtener el ID del canal.\n\n` +
                `Asegúrate de que el bot sea *administrador* del canal 🦋`
            )
        }

        const JID_CANAL = metadata.id

        // 2. Descargar video de TikTok
        const res = await fetch(
            `https://rest.apicausas.xyz/api/v1/descargas/tiktok?url=${encodeURIComponent(url)}&apikey=${API_KEY}`
        )
        const json = await res.json()

        if (!json.status) throw new Error('La API de TikTok no respondió correctamente.')

        const videoUrl = json.data?.download?.url
        if (!videoUrl) throw new Error('No se obtuvo URL de descarga.')

        await m.react('⬇️')

        const videoRes = await fetch(videoUrl)
        if (!videoRes.ok) throw new Error(`Error al descargar el video: HTTP ${videoRes.status}`)
        const buffer = Buffer.from(await videoRes.arrayBuffer())

        const autor  = json.data?.autor  || 'Desconocido'
        const titulo = json.data?.titulo || ''

        // 3. Enviar al canal con créditos de Nino Nakano
        await conn.sendMessage(JID_CANAL, {
            video: buffer,
            caption:
                `🌸 *${titulo}*\n\n` +
                `👤 *Creador:* @${autor}\n` +
                `🔗 *Fuente:* TikTok\n\n` +
                `╭─────────────────╮\n` +
                `│  🦋 *${global.botName || 'Nino Nakano'}*  │\n` +
                `│  ✦ Z0RT SYSTEMS ✦  │\n` +
                `╰─────────────────╯`,
            mimetype: 'video/mp4',
            fileName: `${autor}_tiktok.mp4`
        })

        await m.react('✅')

        // 4. Confirmar al owner
        await conn.sendMessage(m.chat, {
            text:
                `✅ *¡Video enviado al canal!*\n\n` +
                `📺 *Canal:* ${metadata.name}\n` +
                `👤 *Autor:* @${autor}\n` +
                `📝 *Título:* ${titulo || '—'}`,
            contextInfo: {
                externalAdReply: {
                    title: `✅ ${global.botName || 'Nino Nakano'}`,
                    body: `Enviado a ${metadata.name} 🦋`,
                    thumbnail: await _getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })

    } catch (e) {
        console.error('[ENVIARTT ERROR]', e)
        await m.react('❌')
        return conn.sendMessage(m.chat, {
            text:
                `❌ *Error al procesar el video*\n\n` +
                `${e.message || e}\n\n` +
                `_Revisa que el bot sea administrador del canal_ 🦋`,
            contextInfo: {
                externalAdReply: {
                    title: `❌ ${global.botName || 'Nino Nakano'}`,
                    body: 'Error al enviar 🦋',
                    thumbnail: await _getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }
}

// ── Helper: banner como Buffer (soporta URL y base64) ─────────────────────────
const _getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) {
            return Buffer.from(src.split(',')[1], 'base64')
        }
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

handler.command = ['enviartt', 'sendtt']
handler.owner = true
export default handler