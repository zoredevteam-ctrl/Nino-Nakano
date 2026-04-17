/**
 * CORE/APIS.JS — NINO NAKANO
 * Lógica de descarga centralizada para todos los plugins
 * Importa: import { downloadAudio, downloadVideo, downloadTikTok, downloadApk, downloadMediaFire } from '../../core/apis.js'
 */

import { apiGet, tryApis, fixUrl } from './utils.js'

// ─── KEYS (leídas desde settings.js) ─────────────────────────────────────────

const A  = () => global.apis?.alya   || { base: 'https://rest.alyabotpe.xyz',          key: 'Duarte-zz12' }
const G  = () => global.apis?.gifted || { base: 'https://api.giftedtech.co.ke/api',    key: 'Fedex'       }
const C  = () => global.apis?.causas || { base: 'https://api-causas.duckdns.org/api/v1', key: 'causa-adc2c572476abdd8' }

// ─── YOUTUBE AUDIO ────────────────────────────────────────────────────────────

export const downloadAudio = async (url) => {
    return tryApis([
        {
            nombre: 'AlyaBot ytmp3v2',
            fn: async () => {
                const r = await apiGet(`${A().base}/dl/ytmp3v2?url=${encodeURIComponent(url)}&key=${A().key}`)
                return r?.status ? (r.data?.dl || r.data?.url || r.data?.download) : null
            }
        },
        {
            nombre: 'AlyaBot ytmp3',
            fn: async () => {
                const r = await apiGet(`${A().base}/dl/ytmp3?url=${encodeURIComponent(url)}&key=${A().key}`)
                return r?.status ? (r.data?.dl || r.data?.url || r.data?.download) : null
            }
        },
        {
            nombre: 'GiftedTech ytmp3',
            fn: async () => {
                const r = await apiGet(`${G().base}/download/ytmp3?apikey=${G().key}&url=${encodeURIComponent(url)}`)
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.audio || null
            }
        },
        {
            nombre: 'GiftedTech savetubemp3',
            fn: async () => {
                const r = await apiGet(`${G().base}/download/savetubemp3?apikey=${G().key}&url=${encodeURIComponent(url)}`)
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.audio || null
            }
        }
    ], '[AUDIO]')
}

// ─── YOUTUBE VIDEO ────────────────────────────────────────────────────────────

export const downloadVideo = async (url) => {
    return tryApis([
        {
            nombre: 'AlyaBot ytmp4',
            fn: async () => {
                const r = await apiGet(`${A().base}/dl/ytmp4?url=${encodeURIComponent(url)}&key=${A().key}`)
                return r?.status ? (r.data?.dl || r.data?.url || r.data?.download) : null
            }
        },
        {
            nombre: 'GiftedTech ytmp4',
            fn: async () => {
                const r = await apiGet(`${G().base}/download/ytmp4?apikey=${G().key}&url=${encodeURIComponent(url)}`)
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.video || null
            }
        },
        {
            nombre: 'GiftedTech savetubemp4',
            fn: async () => {
                const r = await apiGet(`${G().base}/download/savetubemp4?apikey=${G().key}&url=${encodeURIComponent(url)}`)
                return r?.result?.downloadUrl || r?.result?.url || r?.result?.video || null
            }
        },
        {
            nombre: 'Causas video',
            fn: async () => {
                const r = await apiGet(`${C().base}/descargas/youtube?url=${encodeURIComponent(url)}&type=video&apikey=${C().key}`)
                return r?.status ? (r.data?.download?.url || r.data?.download) : null
            }
        }
    ], '[VIDEO]')
}

// ─── TIKTOK ───────────────────────────────────────────────────────────────────

export const downloadTikTok = async (url) => {
    let autor  = 'Desconocido'
    let titulo = ''
    let likes  = 0
    let plays  = 0
    let videoUrl = null

    const apis = [
        async () => {
            const r = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(url))
            const j = await r.json()
            if (j?.code !== 0) throw new Error('Tikwm code ' + j?.code)
            autor  = j.data?.author?.unique_id || 'Desconocido'
            titulo = j.data?.title  || ''
            likes  = j.data?.digg_count || 0
            plays  = j.data?.play_count || 0
            return fixUrl(j.data?.play) || fixUrl(j.data?.wmplay) || null
        },
        async () => {
            const r = await fetch(`${A().base}/dl/tiktok?url=${encodeURIComponent(url)}&key=${A().key}`)
            const j = await r.json()
            if (!j?.status) throw new Error('AlyaBot sin status')
            autor  = j.data?.author   || j.data?.username || 'Desconocido'
            titulo = j.data?.title    || j.data?.desc     || ''
            return j.data?.download   || j.data?.dl || j.data?.url || null
        },
        async () => {
            const r = await fetch(`${G().base}/download/tiktok?apikey=${G().key}&url=${encodeURIComponent(url)}`)
            const j = await r.json()
            const d = j?.result || j?.data
            if (!d) throw new Error('GiftedTech sin resultado')
            autor  = d.author || d.username || 'Desconocido'
            titulo = d.title  || d.desc     || ''
            return d.video?.noWatermark || d.video?.watermark || d.download?.url || d.url || null
        }
    ]

    for (const fn of apis) {
        try {
            const link = await fn()
            if (link && String(link).startsWith('http')) { videoUrl = link; break }
        } catch (e) { console.log('[TIKTOK] API falló:', e.message) }
    }

    if (!videoUrl) throw new Error('Ninguna API pudo descargar el TikTok')
    return { videoUrl, autor, titulo, likes, plays }
}

// ─── APK ──────────────────────────────────────────────────────────────────────

export const downloadApk = async (query) => {
    const apis = [
        async () => {
            const r = await apiGet(`${G().base}/download/apkdl?apikey=${G().key}&q=${encodeURIComponent(query)}`)
            const d = r?.result || r?.data
            if (!d?.downloadUrl && !d?.download && !d?.url) return null
            return { nombre: d.name || d.title || query, version: d.version || 'N/A', icon: d.icon || d.thumbnail || '', download: d.downloadUrl || d.download || d.url }
        },
        async () => {
            const r = await apiGet(`${A().base}/dl/apk?q=${encodeURIComponent(query)}&key=${A().key}`)
            const d = r?.data || r?.result
            if (!r?.status || (!d?.download && !d?.dl && !d?.url)) return null
            return { nombre: d.name || d.title || query, version: d.version || 'N/A', icon: d.icon || d.thumbnail || '', download: d.download || d.dl || d.url }
        },
        async () => {
            const r = await apiGet(`${C().base}/descargas/apk?q=${encodeURIComponent(query)}&apikey=${C().key}`)
            const d = r?.data || r?.result
            if (!r?.status || (!d?.download && !d?.url)) return null
            return { nombre: d.name || d.title || query, version: d.version || 'N/A', icon: d.icon || d.thumbnail || '', download: d.download || d.url }
        }
    ]

    for (const fn of apis) {
        try {
            const result = await fn()
            if (result?.download) return result
        } catch (e) { console.log('[APK] API falló:', e.message) }
    }
    return null
}

// ─── MEDIAFIRE ────────────────────────────────────────────────────────────────

export const downloadMediaFire = async (url) => {
    const apis = [
        async () => {
            const r = await apiGet(`${G().base}/download/mediafire?apikey=${G().key}&url=${encodeURIComponent(url)}`)
            const d = r?.result || r?.data
            if (!d?.downloadUrl && !d?.download && !d?.direct && !d?.url) return null
            return { nombre: d.filename || d.name || 'archivo', size: d.size || d.filesize || 0, download: d.downloadUrl || d.download || d.direct || d.url }
        },
        async () => {
            const r = await apiGet(`${A().base}/dl/mediafire?url=${encodeURIComponent(url)}&key=${A().key}`)
            const d = r?.data || r?.result
            if (!r?.status || (!d?.download && !d?.dl && !d?.url && !d?.direct)) return null
            return { nombre: d.filename || d.name || 'archivo', size: d.size || d.filesize || 0, download: d.download || d.dl || d.direct || d.url }
        },
        async () => {
            const r = await apiGet(`${C().base}/descargas/mediafire?url=${encodeURIComponent(url)}&apikey=${C().key}`)
            const d = r?.data || r?.result
            if (!r?.status || (!d?.download && !d?.url)) return null
            return { nombre: d.filename || d.name || 'archivo', size: d.size || 0, download: d.download || d.url }
        }
    ]

    for (const fn of apis) {
        try {
            const result = await fn()
            if (result?.download) return result
        } catch (e) { console.log('[MEDIAFIRE] API falló:', e.message) }
    }
    return null
}
