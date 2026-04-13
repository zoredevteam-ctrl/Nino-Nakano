/**
 * GENERADOR DE IMÁGENES IA - NINO NAKANO
 * Comando: #imagen <descripción>
 * API: api.giftedtech.co.ke (generación gratuita)
 */

const GIFTED_API = 'https://api.giftedtech.co.ke/api'
const GIFTED_KEY = 'gifted'

const getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

let handler = async (m, { conn, text }) => {
    const prompt = (text || '').trim()

    if (!prompt) {
        return conn.sendMessage(m.chat, {
            text:
                `🎨 *GENERADOR DE IMÁGENES IA*\n\n` +
                `Describe lo que quieres que dibuje~\n\n` +
                `*Uso:* *#imagen <descripción>*\n\n` +
                `*Ejemplos:*\n` +
                `▸ #imagen una chica anime con cabello rosa en un jardín\n` +
                `▸ #imagen un castillo en las nubes al atardecer\n` +
                `▸ #imagen un gato astronauta en el espacio\n\n` +
                `_Mientras más detallada la descripción, mejor el resultado_ 🦋`,
            contextInfo: {
                externalAdReply: {
                    title: `🎨 ${global.botName || 'Nino Nakano'} — Imágenes IA`,
                    body: 'Generador de imágenes 🖼️',
                    thumbnail: await getBannerBuffer(),
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }

    await m.react('🎨')

    // Intentar varias APIs de generación gratuitas
    const apis = [
        {
            nombre: 'GiftedTech Flux',
            fn: async () => {
                const r = await fetch(`${GIFTED_API}/ai/fluximage?apikey=${GIFTED_KEY}&prompt=${encodeURIComponent(prompt)}`)
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                const j = await r.json()
                return j?.result || j?.url || j?.image || null
            }
        },
        {
            nombre: 'GiftedTech Imagine',
            fn: async () => {
                const r = await fetch(`${GIFTED_API}/ai/imagine?apikey=${GIFTED_KEY}&prompt=${encodeURIComponent(prompt)}`)
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                const j = await r.json()
                return j?.result || j?.url || j?.image || null
            }
        },
        {
            nombre: 'Pollinations AI',
            fn: async () => {
                // API completamente gratuita sin key
                const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`
                const r   = await fetch(url)
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                // Retorna directamente la imagen
                return url
            }
        }
    ]

    let imgUrl = null
    for (const api of apis) {
        try {
            console.log(`[IMAGEN] 🔄 ${api.nombre}`)
            imgUrl = await api.fn()
            if (imgUrl) {
                console.log(`[IMAGEN] ✅ ${api.nombre}`)
                break
            }
        } catch (e) {
            console.log(`[IMAGEN] ❌ ${api.nombre}: ${e.message}`)
        }
    }

    if (!imgUrl) {
        await m.react('❌')
        return m.reply(`❌ No pude generar la imagen ahora mismo.\nIntenta de nuevo en unos segundos 🦋`)
    }

    try {
        // Descargar la imagen como buffer
        const imgRes = await fetch(imgUrl)
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
        const buffer = Buffer.from(await imgRes.arrayBuffer())

        await m.react('✅')

        await conn.sendMessage(m.chat, {
            image: buffer,
            caption:
                `🎨 *IMAGEN GENERADA CON IA*\n\n` +
                `📝 *Prompt:* ${prompt}\n\n` +
                `> _Generado con ${global.botName || 'Nino Nakano'} IA_ 🦋`
        }, { quoted: m })

    } catch (e) {
        console.error('[IMAGEN ERROR]', e)
        await m.react('❌')
        return m.reply(`❌ No pude procesar la imagen: ${e.message} 🦋`)
    }
}

handler.command = ['imagen', 'imagine', 'generar', 'draw', 'dibujar']
export default handler