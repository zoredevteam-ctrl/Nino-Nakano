/**
 * HERRAMIENTAS - NINO NAKANO
 * #clima, #traducir, #acortar, #qr, #calc, #ip, #color,
 * #moneda, #dado, #cara, #tiempo, #wiki, #letra, #ascii,
 * #password, #base64, #hex, #binario, #timestamp, #ping
 * API: api.giftedtech.co.ke (apikey: Fedex)
 */

const API = 'https://api.giftedtech.co.ke/api'
const APIKEY = 'Fedex'
const RCANAL = 'https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G'

const apiGet = async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

const getThumbnail = async () => {
    try {
        const res = await fetch(global.banner || 'https://causas-files.vercel.app/fl/fu5r.jpg')
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const sendTool = async (conn, m, text) => {
    const thumbnail = await getThumbnail()
    const newsletterJid = global.newsletterJid || '120363408182996815@newsletter'
    return conn.sendMessage(m.chat, {
        text,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid,
                serverMessageId: '',
                newsletterName: global.botName || 'Nino Nakano'
            },
            externalAdReply: {
                title: `🔧 ${global.botName || 'Nino Nakano'} Tools`,
                body: '⚙️ Herramientas del Sistema',
                mediaType: 1,
                mediaUrl: global.rcanal || RCANAL,
                sourceUrl: global.rcanal || RCANAL,
                thumbnail,
                showAdAttribution: false,
                containsAutoReply: true,
                renderLargerThumbnail: false
            }
        }
    }, { quoted: m })
}

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

let handler = async (m, { conn, command, text, args }) => {
    const cmd = command.toLowerCase()
    const q = (text || '').trim()

    await m.react('⏳')

    try {

        // ==================== #clima ====================
        if (cmd === 'clima' || cmd === 'weather') {
            if (!q) {
                await m.react('❌')
                return sendTool(conn, m, `🌤️ *CLIMA*\n\nUso: *#clima <ciudad>*\nEjemplo: *#clima Bogotá*`)
            }
            const data = await apiGet(`${API}/search/weather?apikey=${APIKEY}&location=${encodeURIComponent(q)}`)
            const w = data?.result || data?.data || data
            if (!w || data?.error) {
                await m.react('❌')
                return sendTool(conn, m, `❌ No encontré el clima de *${q}*\nVerifica el nombre de la ciudad.`)
            }
            await m.react('✅')
            return sendTool(conn, m,
                `🌤️ *CLIMA EN ${q.toUpperCase()}*\n\n` +
                `🌡️ Temperatura: *${w.temperature || w.temp || 'N/A'}*\n` +
                `💧 Humedad: *${w.humidity || 'N/A'}*\n` +
                `🌬️ Viento: *${w.wind || w.windspeed || 'N/A'}*\n` +
                `☁️ Condición: *${w.condition || w.description || w.weather || 'N/A'}*\n` +
                `📍 Lugar: *${w.location || w.city || q}*`
            )
        }

        // ==================== #traducir ====================
        if (cmd === 'traducir' || cmd === 'translate' || cmd === 'tl') {
            if (!q) {
                await m.react('❌')
                return sendTool(conn, m,
                    `🌐 *TRADUCTOR*\n\nUso: *#traducir <idioma> <texto>*\n\n` +
                    `Ejemplos:\n` +
                    `› *#traducir en Hola mundo* → inglés\n` +
                    `› *#traducir pt Buenos días* → portugués\n` +
                    `› *#traducir fr Cómo estás* → francés\n\n` +
                    `Idiomas: en, es, pt, fr, de, it, ja, ko, zh, ar, ru`
                )
            }
            const parts = q.split(' ')
            const lang = parts[0]
            const textToTranslate = parts.slice(1).join(' ')
            if (!textToTranslate) {
                await m.react('❌')
                return sendTool(conn, m, `❌ Falta el texto.\nUso: *#traducir <idioma> <texto>*`)
            }
            // Traducir via API libre
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=es|${lang}`)
            const data = await res.json()
            const traduccion = data?.responseData?.translatedText || data?.matches?.[0]?.translation
            if (!traduccion) {
                await m.react('❌')
                return sendTool(conn, m, `❌ No pude traducir ese texto.\nVerifica el código de idioma.`)
            }
            await m.react('✅')
            return sendTool(conn, m,
                `🌐 *TRADUCCIÓN*\n\n` +
                `📝 Original: *${textToTranslate}*\n` +
                `🔄 Idioma: *${lang.toUpperCase()}*\n` +
                `✅ Traducción: *${traduccion}*`
            )
        }

        // ==================== #acortar ====================
        if (cmd === 'acortar' || cmd === 'short') {
            if (!q || !q.startsWith('http')) {
                await m.react('❌')
                return sendTool(conn, m, `🔗 *ACORTADOR DE LINKS*\n\nUso: *#acortar <url>*\nEjemplo: *#acortar https://ejemplo.com/pagina-muy-larga*`)
            }
            const data = await apiGet(`${API}/tools/tinyurl?apikey=${APIKEY}&url=${encodeURIComponent(q)}`)
            const shortUrl = data?.result?.shorturl || data?.result?.url || data?.shorturl || data?.url
            if (!shortUrl) {
                await m.react('❌')
                return sendTool(conn, m, `❌ No pude acortar ese link.\nVerifica que sea una URL válida.`)
            }
            await m.react('✅')
            return sendTool(conn, m,
                `🔗 *LINK ACORTADO*\n\n` +
                `📎 Original: ${q}\n` +
                `✅ Corto: *${shortUrl}*`
            )
        }

        // ==================== #qr ====================
        if (cmd === 'qr') {
            if (!q) {
                await m.react('❌')
                return sendTool(conn, m, `📱 *GENERADOR DE QR*\n\nUso: *#qr <texto o link>*\nEjemplo: *#qr https://github.com*`)
            }
            // Usar API de QR pública
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(q)}`
            const res = await fetch(qrUrl)
            if (!res.ok) {
                await m.react('❌')
                return sendTool(conn, m, `❌ No pude generar el QR.`)
            }
            const buffer = Buffer.from(await res.arrayBuffer())
            await m.react('✅')
            return conn.sendMessage(m.chat, {
                image: buffer,
                caption: `📱 *QR GENERADO*\n\n📝 Contenido: ${q}\n\n_Escanéalo con tu cámara_ 🦋`
            }, { quoted: m })
        }

        // ==================== #calc ====================
        if (cmd === 'calc' || cmd === 'calcular') {
            if (!q) {
                await m.react('❌')
                return sendTool(conn, m, `🧮 *CALCULADORA*\n\nUso: *#calc <operación>*\nEjemplos:\n› *#calc 2 + 2*\n› *#calc 150 * 3.14*\n› *#calc 1000 / 7*\n› *#calc 2 ** 10*`)
            }
            // Validar que solo tenga números y operadores
            const safeExpr = q.replace(/[^0-9+\-*/.()%\s]/g, '')
            if (!safeExpr) {
                await m.react('❌')
                return sendTool(conn, m, `❌ Expresión inválida.\nSolo se permiten: números y + - * / ( ) %`)
            }
            let result
            try {
                result = Function(`"use strict"; return (${safeExpr})`)()
            } catch {
                await m.react('❌')
                return sendTool(conn, m, `❌ No pude calcular eso.\nRevisa la expresión.`)
            }
            await m.react('✅')
            return sendTool(conn, m,
                `🧮 *CALCULADORA*\n\n` +
                `📝 Expresión: *${q}*\n` +
                `✅ Resultado: *${result}*`
            )
        }

        // ==================== #ip ====================
        if (cmd === 'ip') {
            const ipQuery = q || 'check'
            if (!q) {
                await m.react('❌')
                return sendTool(conn, m, `🌐 *INFO DE IP*\n\nUso: *#ip <dirección>*\nEjemplo: *#ip 8.8.8.8*`)
            }
            const res = await fetch(`https://ipapi.co/${q}/json/`)
            const data = await res.json()
            if (data?.error) {
                await m.react('❌')
                return sendTool(conn, m, `❌ IP inválida o no encontrada.`)
            }
            await m.react('✅')
            return sendTool(conn, m,
                `🌐 *INFO DE IP*\n\n` +
                `📍 IP: *${data.ip}*\n` +
                `🌍 País: *${data.country_name || 'N/A'}*\n` +
                `🏙️ Ciudad: *${data.city || 'N/A'}*\n` +
                `📡 ISP: *${data.org || 'N/A'}*\n` +
                `🗺️ Región: *${data.region || 'N/A'}*\n` +
                `⏰ Zona horaria: *${data.timezone || 'N/A'}*`
            )
        }

        // ==================== #color ====================
        if (cmd === 'color') {
            if (!q) {
                await m.react('❌')
                return sendTool(conn, m, `🎨 *INFO DE COLOR*\n\nUso: *#color <hex>*\nEjemplo: *#color FF69B4*`)
            }
            const hex = q.replace('#', '')
            const r = parseInt(hex.substring(0, 2), 16)
            const g = parseInt(hex.substring(2, 4), 16)
            const b = parseInt(hex.substring(4, 6), 16)
            if (isNaN(r) || isNaN(g) || isNaN(b)) {
                await m.react('❌')
                return sendTool(conn, m, `❌ Código HEX inválido.\nEjemplo válido: *FF69B4*`)
            }
            // Generar imagen del color
            const imgUrl = `https://singlecolorimage.com/get/${hex}/200x200`
            const res = await fetch(imgUrl)
            const buffer = Buffer.from(await res.arrayBuffer())
            await m.react('✅')
            return conn.sendMessage(m.chat, {
                image: buffer,
                caption:
                    `🎨 *INFO DEL COLOR*\n\n` +
                    `🔵 HEX: *#${hex.toUpperCase()}*\n` +
                    `🔴 RGB: *rgb(${r}, ${g}, ${b})*\n` +
                    `💡 Rojo: ${r} | Verde: ${g} | Azul: ${b}`
            }, { quoted: m })
        }

        // ==================== #moneda ====================
        if (cmd === 'moneda' || cmd === 'divisa' || cmd === 'convert') {
            if (!q || q.split(' ').length < 3) {
                await m.react('❌')
                return sendTool(conn, m,
                    `💱 *CONVERSIÓN DE DIVISAS*\n\n` +
                    `Uso: *#moneda <cantidad> <de> <a>*\n\n` +
                    `Ejemplos:\n` +
                    `› *#moneda 100 USD COP*\n` +
                    `› *#moneda 50 EUR USD*\n` +
                    `› *#moneda 1 BTC USD*`
                )
            }
            const [amount, from, to] = q.split(' ')
            const res = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from.toUpperCase()}&to=${to.toUpperCase()}`)
            const data = await res.json()
            if (data?.error || !data?.rates) {
                await m.react('❌')
                return sendTool(conn, m, `❌ No pude convertir *${from}* a *${to}*.\nVerifica los códigos de moneda.`)
            }
            const result = data.rates[to.toUpperCase()]
            await m.react('✅')
            return sendTool(conn, m,
                `💱 *CONVERSIÓN DE DIVISAS*\n\n` +
                `💰 ${amount} ${from.toUpperCase()} = *${result} ${to.toUpperCase()}*\n\n` +
                `_Tasa actualizada en tiempo real_ 📊`
            )
        }

        // ==================== #dado ====================
        if (cmd === 'dado' || cmd === 'dice' || cmd === 'roll') {
            const lados = parseInt(q) || 6
            if (lados < 2 || lados > 100) {
                await m.react('❌')
                return sendTool(conn, m, `🎲 Número de lados inválido (2-100)\nUso: *#dado* o *#dado 20*`)
            }
            const resultado = randInt(1, lados)
            await m.react('✅')
            return sendTool(conn, m,
                `🎲 *DADO DE ${lados} LADOS*\n\n` +
                `🎯 Resultado: *${resultado}*\n\n` +
                `${resultado === lados ? '🎉 ¡Número máximo! ¡Suertudo!' : resultado === 1 ? '💀 ¡Número mínimo! ¡Mala suerte!' : '_¡Suerte la próxima!_'}`
            )
        }

        // ==================== #cara ====================
        if (cmd === 'cara' || cmd === 'monedaflip' || cmd === 'flip') {
            const resultado = Math.random() > 0.5 ? 'CARA 🪙' : 'SELLO 🪙'
            await m.react('✅')
            return sendTool(conn, m,
                `🪙 *LANZAMIENTO DE MONEDA*\n\n` +
                `✨ Resultado: *${resultado}*\n\n` +
                `${resultado.includes('CARA') ? '_¡Cara! ¡Ganaste!_ 🎉' : '_¡Sello! ¡A intentar de nuevo!_ 😤'}`
            )
        }

        // ==================== #wiki ====================
        if (cmd === 'wiki' || cmd === 'wikipedia') {
            if (!q) {
                await m.react('❌')
                return sendTool(conn, m, `📖 *WIKIPEDIA*\n\nUso: *#wiki <tema>*\nEjemplo: *#wiki Inteligencia Artificial*`)
            }
            const res = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`)
            const data = await res.json()
            if (data?.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
                await m.react('❌')
                return sendTool(conn, m, `❌ No encontré *${q}* en Wikipedia.`)
            }
            const resumen = data?.extract?.slice(0, 800) || 'Sin descripción'
            await m.react('✅')
            return sendTool(conn, m,
                `📖 *${data.title || q}*\n\n` +
                `${resumen}${resumen.length >= 800 ? '...' : ''}\n\n` +
                `🔗 ${data.content_urls?.desktop?.page || ''}`
            )
        }

        // ==================== #letra ====================
        if (cmd === 'letra' || cmd === 'lyrics') {
            if (!q) {
                await m.react('❌')
                return sendTool(conn, m, `🎵 *LETRAS DE CANCIONES*\n\nUso: *#letra <artista - canción>*\nEjemplo: *#letra Bad Bunny - Tití Me Preguntó*`)
            }
            const data = await apiGet(`${API}/search/lyrics?apikey=${APIKEY}&query=${encodeURIComponent(q)}`)
            const lyrics = data?.result?.lyrics || data?.lyrics || data?.result
            const title = data?.result?.title || data?.title || q
            const artist = data?.result?.artist || data?.artist || ''
            if (!lyrics) {
                await m.react('❌')
                return sendTool(conn, m, `❌ No encontré la letra de *${q}*`)
            }
            const lyricsShort = typeof lyrics === 'string' ? lyrics.slice(0, 1500) : JSON.stringify(lyrics).slice(0, 1500)
            await m.react('✅')
            return sendTool(conn, m,
                `🎵 *${title}*${artist ? `\n👤 ${artist}` : ''}\n\n` +
                `${lyricsShort}${lyricsShort.length >= 1500 ? '\n\n_...letra recortada por límite de texto_' : ''}`
            )
        }

        // ==================== #password ====================
        if (cmd === 'password' || cmd === 'pass' || cmd === 'contrasena') {
            const longitud = Math.min(Math.max(parseInt(q) || 16, 4), 64)
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
            let password = ''
            for (let i = 0; i < longitud; i++) {
                password += chars[Math.floor(Math.random() * chars.length)]
            }
            await m.react('✅')
            return sendTool(conn, m,
                `🔐 *CONTRASEÑA GENERADA*\n\n` +
                `\`\`\`${password}\`\`\`\n\n` +
                `📏 Longitud: *${longitud}* caracteres\n` +
                `_Guárdala en un lugar seguro_ 🔒`
            )
        }

        // ==================== #base64 ====================
        if (cmd === 'base64') {
            const parts = q.split(' ')
            const modo = parts[0]?.toLowerCase()
            const contenido = parts.slice(1).join(' ')
            if (!modo || !contenido || (modo !== 'encode' && modo !== 'decode')) {
                await m.react('❌')
                return sendTool(conn, m,
                    `🔢 *BASE64*\n\n` +
                    `Uso:\n` +
                    `› *#base64 encode <texto>* — Codificar\n` +
                    `› *#base64 decode <texto>* — Decodificar`
                )
            }
            let result
            try {
                result = modo === 'encode'
                    ? Buffer.from(contenido).toString('base64')
                    : Buffer.from(contenido, 'base64').toString('utf8')
            } catch {
                await m.react('❌')
                return sendTool(conn, m, `❌ No pude procesar ese texto.`)
            }
            await m.react('✅')
            return sendTool(conn, m,
                `🔢 *BASE64 ${modo.toUpperCase()}*\n\n` +
                `📝 Input: \`${contenido.slice(0, 100)}\`\n` +
                `✅ Output:\n\`\`\`${result}\`\`\``
            )
        }

        // ==================== #binario ====================
        if (cmd === 'binario' || cmd === 'binary') {
            const parts = q.split(' ')
            const modo = parts[0]?.toLowerCase()
            const contenido = parts.slice(1).join(' ')
            if (!modo || !contenido || (modo !== 'encode' && modo !== 'decode')) {
                await m.react('❌')
                return sendTool(conn, m,
                    `💻 *BINARIO*\n\n` +
                    `Uso:\n` +
                    `› *#binario encode <texto>* — Texto a binario\n` +
                    `› *#binario decode <binario>* — Binario a texto`
                )
            }
            let result
            try {
                if (modo === 'encode') {
                    result = contenido.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ')
                } else {
                    result = contenido.split(' ').map(b => String.fromCharCode(parseInt(b, 2))).join('')
                }
            } catch {
                await m.react('❌')
                return sendTool(conn, m, `❌ No pude procesar ese texto.`)
            }
            await m.react('✅')
            return sendTool(conn, m,
                `💻 *BINARIO ${modo.toUpperCase()}*\n\n` +
                `📝 Input: \`${contenido.slice(0, 100)}\`\n` +
                `✅ Output:\n\`\`\`${result.slice(0, 500)}\`\`\``
            )
        }

        // ==================== #hex ====================
        if (cmd === 'hex') {
            const parts = q.split(' ')
            const modo = parts[0]?.toLowerCase()
            const contenido = parts.slice(1).join(' ')
            if (!modo || !contenido || (modo !== 'encode' && modo !== 'decode')) {
                await m.react('❌')
                return sendTool(conn, m,
                    `🔡 *HEX*\n\n` +
                    `Uso:\n` +
                    `› *#hex encode <texto>* — Texto a hex\n` +
                    `› *#hex decode <hex>* — Hex a texto`
                )
            }
            let result
            try {
                result = modo === 'encode'
                    ? Buffer.from(contenido).toString('hex')
                    : Buffer.from(contenido, 'hex').toString('utf8')
            } catch {
                await m.react('❌')
                return sendTool(conn, m, `❌ No pude procesar ese texto.`)
            }
            await m.react('✅')
            return sendTool(conn, m,
                `🔡 *HEX ${modo.toUpperCase()}*\n\n` +
                `📝 Input: \`${contenido.slice(0, 100)}\`\n` +
                `✅ Output:\n\`\`\`${result}\`\`\``
            )
        }

        // =========