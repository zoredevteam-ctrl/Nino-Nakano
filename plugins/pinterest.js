/**
 * PINTEREST - NINO NAKANO
 * Comandos: #pinterest, #pin
 * Busca imágenes/videos en Pinterest o descarga desde URL
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

// ─── DESCARGA DESDE URL ───────────────────────────────────────────────────────

const dlPin = async (url) => {
    try {
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        })
        const $ = cheerio.load(res.data)

        // Intentar video primero
        const videoTag = $('script[data-test-id="video-snippet"]')
        if (videoTag.length) {
            const result = JSON.parse(videoTag.text())
            return { title: result.name || 'Pinterest', download: result.contentUrl, isVideo: true }
        }

        // Imagen desde relay response
        const json = JSON.parse($("script[data-relay-response='true']").eq(0).text())
        const result = json.response.data['v3GetPinQuery'].data
        return {
            title: result.title || 'Pinterest',
            download: result.imageLargeUrl,
            isVideo: false
        }
    } catch {
        return null
    }
}

// ─── BÚSQUEDA POR TEXTO ───────────────────────────────────────────────────────

const searchPins = async (query) => {
    const link =
        `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D` +
        `${encodeURIComponent(query)}%26rs%3Dtyped&data=%7B%22options%22%3A%7B%22applied_unified_filters%22%3Anull%2C` +
        `%22appliedProductFilters%22%3A%22---%22%2C%22article%22%3Anull%2C%22auto_correction_disabled%22%3Afalse%2C` +
        `%22corpus%22%3Anull%2C%22customized_rerank_type%22%3Anull%2C%22domains%22%3Anull%2C` +
        `%22dynamicPageSizeExpGroup%22%3A%22control%22%2C%22filters%22%3Anull%2C%22journey_depth%22%3Anull%2C` +
        `%22page_size%22%3Anull%2C%22price_max%22%3Anull%2C%22price_min%22%3Anull%2C` +
        `%22query_pin_sigs%22%3Anull%2C%22query%22%3A%22${encodeURIComponent(query)}%22%2C` +
        `%22redux_normalize_feed%22%3Atrue%2C%22request_params%22%3Anull%2C%22rs%22%3A%22typed%22%2C` +
        `%22scope%22%3A%22pins%22%2C%22selected_one_bar_modules%22%3Anull%2C%22seoDrawerEnabled%22%3Afalse%2C` +
        `%22source_id%22%3Anull%2C%22source_module_id%22%3Anull%2C` +
        `%22source_url%22%3A%22%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}%26rs%3Dtyped%22%2C` +
        `%22top_pin_id%22%3Anull%2C%22top_pin_ids%22%3Anull%7D%2C%22context%22%3A%7B%7D%7D`

    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'referer': 'https://id.pinterest.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'x-app-version': 'c056fb7',
        'x-pinterest-appstate': 'active',
        'x-pinterest-pws-handler': 'www/index.js',
        'x-pinterest-source-url': '/',
        'x-requested-with': 'XMLHttpRequest'
    }

    try {
        const res = await axios.get(link, { headers })
        const results = res.data?.resource_response?.data?.results || []
        return results
            .filter(item => item?.images)
            .map(item => item.images.orig?.url || item.images['564x']?.url || null)
            .filter(Boolean)
    } catch (e) {
        console.error('[PIN SEARCH ERROR]', e.message)
        return []
    }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, text, args }) => {
    if (!text) {
        return conn.sendMessage(m.chat, {
            text:
                `🌸 *PINTEREST* 📌\n\n` +
                `Dime qué imagen quieres buscar y yo la traigo~\n\n` +
                `*Uso:*\n` +
                `▸ *#pin <búsqueda>* — busca imágenes\n` +
                `▸ *#pin <url>* — descarga desde link de Pinterest`,
            contextInfo: {
                externalAdReply: {
                    title: `📌 ${global.botName || 'Nino Nakano'}`,
                    body: 'Pinterest Downloader 🌸',
                    thumbnailUrl: global.banner || '',
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }

    await m.react('🔍')

    try {
        // ── Modo descarga directa desde URL ──────────────────────────────────
        if (text.includes('https://')) {
            const data = await dlPin(args[0])

            if (!data?.download) {
                await m.react('❌')
                return m.reply(`❌ No pude descargar ese pin. Intenta con otro link 🦋`)
            }

            await m.react('⬇️')

            await conn.sendMessage(m.chat, {
                [data.isVideo ? 'video' : 'image']: { url: data.download },
                caption:
                    `📌 *${data.title}*\n\n` +
                    `> Descargado con ${global.botName || 'Nino Nakano'} 🌸`,
                contextInfo: {
                    externalAdReply: {
                        title: `📌 ${global.botName || 'Nino Nakano'}`,
                        body: 'Pinterest Downloader 🌸',
                        thumbnailUrl: global.banner || '',
                        sourceUrl: global.rcanal || '',
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            }, { quoted: m })

            await m.react('✅')
            return
        }

        // ── Modo búsqueda por texto ───────────────────────────────────────────
        const urls = await searchPins(text)

        if (!urls.length) {
            await m.react('❌')
            return conn.sendMessage(m.chat, {
                text: `❌ No encontré imágenes para *${text}*\n\nIntenta con otra búsqueda 🦋`,
                contextInfo: {
                    externalAdReply: {
                        title: `📌 ${global.botName || 'Nino Nakano'}`,
                        body: 'Pinterest Downloader 🌸',
                        thumbnailUrl: global.banner || '',
                        sourceUrl: global.rcanal || '',
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            }, { quoted: m })
        }

        const top10 = urls.slice(0, 10)
        await m.react('⬇️')

        for (let i = 0; i < top10.length; i++) {
            try {
                await conn.sendMessage(m.chat, {
                    image: { url: top10[i] },
                    caption: i === 0
                        ? `📌 *${text}* — ${top10.length} imágenes\n> ${global.botName || 'Nino Nakano'} 🌸`
                        : ''
                }, { quoted: i === 0 ? m : undefined })
            } catch {
                // Si una imagen falla, continuar con las demás
            }
        }

        await m.react('✅')

    } catch (e) {
        console.error('[PINTEREST ERROR]', e)
        await m.react('❌')
        return conn.sendMessage(m.chat, {
            text:
                `❌ Ocurrió un error buscando *${text}*\n\n` +
                `Error: ${e.message}\n\n` +
                `_Intenta de nuevo en unos segundos_ 🦋`,
            contextInfo: {
                externalAdReply: {
                    title: `📌 ${global.botName || 'Nino Nakano'}`,
                    body: 'Pinterest Downloader 🌸',
                    thumbnailUrl: global.banner || '',
                    sourceUrl: global.rcanal || '',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }
}

handler.command = ['pinterest', 'pin']
export default handler