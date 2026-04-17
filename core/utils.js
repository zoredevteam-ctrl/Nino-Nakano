/**
 * CORE/UTILS.JS — NINO NAKANO
 * Helpers globales reutilizables para todos los plugins
 * Importa desde cualquier plugin: import { apiGet, tryApis, sendBot, formatViews } from '../../core/utils.js'
 */

// ─── HTTP ──────────────────────────────────────────────────────────────────────

/**
 * Fetch con timeout y User-Agent de Android
 * @param {string} url
 * @param {number} timeout ms (default 15s)
 */
export const apiGet = async (url, timeout = 15000) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Accept': 'application/json'
            }
        })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
    } finally {
        clearTimeout(timer)
    }
}

// ─── FALLBACK DE APIs ─────────────────────────────────────────────────────────

/**
 * Intenta una lista de APIs en orden, retorna el primer resultado válido
 * @param {Array<{ nombre: string, fn: () => Promise<any> }>} fuentes
 * @param {string} tag — prefijo para los logs (ej: '[PLAY]')
 */
export const tryApis = async (fuentes, tag = '[API]') => {
    for (const { nombre, fn } of fuentes) {
        try {
            console.log(`${tag} Intentando: ${nombre}`)
            const result = await fn()
            if (result && (typeof result !== 'string' || result.startsWith('http'))) {
                console.log(`${tag} OK: ${nombre}`)
                return result
            }
        } catch (e) {
            console.log(`${tag} Falló ${nombre}: ${e.message}`)
        }
    }
    return null
}

// ─── MENSAJE CON CONTEXTO ─────────────────────────────────────────────────────

/**
 * Envía un mensaje de texto con contexto newsletter
 * Reemplaza sendPlay, sendTt, sendApk, sendMf, etc.
 * @param {object} conn
 * @param {object} m
 * @param {string} text
 * @param {object} opts — { title, body, isError }
 */
export const sendBot = async (conn, m, text, { title, body, isError = false } = {}) => {
    const thumb = await global.getBannerThumb()
    const ctx   = global.getNewsletterCtx(
        thumb,
        (isError ? '❌ ' : '🌸 ') + (title || global.botName),
        body || (global.botName + ' 🦋')
    )
    return conn.sendMessage(m.chat, { text, contextInfo: ctx }, { quoted: m })
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────

/**
 * Formatea número de vistas/reproducciones
 * 1500000 → '1.5M' | 25000 → '25.0k'
 */
export const formatViews = (views) => {
    try {
        const n = parseInt(views) || 0
        if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
        if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M'
        if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'k'
        return n.toLocaleString()
    } catch { return String(views || 0) }
}

/**
 * Formatea bytes a KB / MB / GB
 * 1048576 → '1.0 MB'
 */
export const formatSize = (bytes) => {
    if (!bytes) return 'N/A'
    const b = parseInt(bytes)
    if (b >= 1_073_741_824) return (b / 1_073_741_824).toFixed(2) + ' GB'
    if (b >= 1_048_576)     return (b / 1_048_576).toFixed(1) + ' MB'
    if (b >= 1_024)         return (b / 1_024).toFixed(1) + ' KB'
    return b + ' B'
}

/**
 * Formatea milisegundos a '1h : 30m : 5s'
 */
export const formatDelta = (ms) => {
    if (!ms || ms <= 0) return '00:00:00'
    const total = Math.floor(ms / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const parts = []
    if (h) parts.push(`${h}h`)
    if (m) parts.push(`${m}m`)
    parts.push(`${s}s`)
    return parts.join(' : ')
}

/**
 * Tikwm a veces devuelve rutas relativas (/video/media/...)
 * Esta función las convierte a URLs absolutas
 */
export const fixUrl = (url) => {
    if (!url) return null
    const s = String(url)
    if (s.startsWith('http')) return s
    if (s.startsWith('/'))    return 'https://www.tikwm.com' + s
    return null
}

/**
 * Número aleatorio entre min y max (inclusive)
 */
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

/**
 * Convierte horas/minutos/segundos a milisegundos
 */
export const toMs = (h = 0, m = 0, s = 0) => ((h * 3600) + (m * 60) + s) * 1000
