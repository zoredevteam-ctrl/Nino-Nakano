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

        // ==================== #timestamp ====================
        if (cmd === 'timestamp' || cmd === 'fecha' || cmd === 'time') {
            const now = new Date()
            const ts = Math.floor(now.getTime() / 1000)
            await m.react('✅')
            return sendTool(conn, m,
                `⏰ *FECHA Y HORA ACTUAL*\n\n` +
                `📅 Fecha: *${now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*\n` +
                `🕐 Hora UTC: *${now.toUTCString()}*\n` +
                `🔢 Timestamp: *${ts}*\n` +
                `📊 ISO: \`${now.toISOString()}\``
            )
        }

        // ==================== #ping (herramienta) ====================
        if (cmd === 'pingurl' || cmd === 'checkurl') {
            if (!q || !q.startsWith('http')) {
                await m.react('❌')
                return sendTool(conn, m, `🏓 *VERIFICAR URL*\n\nUso: *#checkurl <url>*\nEjemplo: *#checkurl https://google.com*`)
            }
            const start = Date.now()
            let status, ok
            try {
                const res = await fetch(q, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
                status = res.status
                ok = res.ok
            } catch {
                status = 'Sin respuesta'
                ok = false
            }
            const latency = Date.now() - start
            await m.react(ok ? '✅' : '❌')
            return sendTool(conn, m,
                `🏓 *CHECK URL*\n\n` +
                `🔗 URL: ${q}\n` +
                `${ok ? '🟢' : '🔴'} Estado: *${status}*\n` +
                `⚡ Latencia: *${latency}ms*\n` +
                `${ok ? '✅ Sitio en línea' : '❌ Sitio fuera de línea o inaccesible'}`
            )
        }

        // ==================== #ascii ====================
        if (cmd === 'ascii') {
            if (!q) {
                await m.react('❌')
                return sendTool(conn, m, `🔤 *TEXTO A ASCII*\n\nUso: *#ascii <texto>*\nEjemplo: *#ascii Hola*`)
            }
            const codes = q.split('').map(c => c.charCodeAt(0)).join(' - ')
            await m.react('✅')
            return sendTool(conn, m,
                `🔤 *TEXTO A ASCII*\n\n` +
                `📝 Texto: \`${q}\`\n` +
                `🔢 Códigos:\n\`\`\`${codes}\`\`\``
            )
        }

        // ==================== #pokedex ====================
        if (cmd === 'pokedex' || cmd === 'pokemon') {
            if (!q) {
                await m.react('❌')
                return sendTool(conn, m, `🎮 *POKÉDEX*\n\nUso: *#pokedex <nombre o número>*\nEjemplo: *#pokedex pikachu*`)
            }
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${q.toLowerCase()}`)
            if (!res.ok) {
                await m.react('❌')
                return sendTool(conn, m, `❌ No encontré al Pokémon *${q}*\nVerifica el nombre o número.`)
            }
            const data = await res.json()
            const tipos = data.types.map(t => t.type.name).join(', ')
            const stats = data.stats.map(s => `${s.stat.name}: ${s.base_stat}`).join('\n')
            const imgUrl = data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default
            const imgRes = await fetch(imgUrl)
            const imgBuf = Buffer.from(await imgRes.arrayBuffer())
            await m.react('✅')
            return conn.sendMessage(m.chat, {
                image: imgBuf,
                caption:
                    `🎮 *${data.name.toUpperCase()}* #${data.id}\n\n` +
                    `🔷 Tipo: *${tipos}*\n` +
                    `📏 Altura: *${data.height / 10}m*\n` +
                    `⚖️ Peso: *${data.weight / 10}kg*\n\n` +
                    `📊 *ESTADÍSTICAS*\n${stats}`
            }, { quoted: m })
        }

        // ==================== #chiste ====================
        if (cmd === 'chiste' || cmd === 'joke') {
            const res = await fetch('https://official-joke-api.appspot.com/random_joke')
            const data = await res.json()
            await m.react('😂')
            return sendTool(conn, m,
                `😂 *CHISTE DEL DÍA*\n\n` +
                `${data?.setup || 'No hay chiste disponible'}\n\n` +
                `👉 ${data?.punchline || ''}`
            )
        }

        // ==================== #frase ====================
        if (cmd === 'frase' || cmd === 'quote') {
            const res = await fetch('https://zenquotes.io/api/random')
            const data = await res.json()
            const frase = data?.[0]
            await m.react('✨')
            return sendTool(conn, m,
                `✨ *FRASE INSPIRADORA*\n\n` +
                `_"${frase?.q || 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.'}"_\n\n` +
                `— *${frase?.a || 'Anónimo'}*`
            )
        }

        // ==================== #acortaryt ====================
        if (cmd === 'ytlink' || cmd === 'acortaryt') {
            if (!q || !q.includes('youtube')) {
                await m.react('❌')
                return sendTool(conn, m, `🎥 *ACORTAR LINK DE YOUTUBE*\n\nUso: *#ytlink <url de youtube>*`)
            }
            const videoId = q.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
            if (!videoId) {
                await m.react('❌')
                return sendTool(conn, m, `❌ No pude extraer el ID del video.`)
            }
            await m.react('✅')
            return sendTool(conn, m,
                `🎥 *LINK ACORTADO*\n\n` +
                `📎 Original: ${q}\n` +
                `✅ Corto: *https://youtu.be/${videoId}*`
            )
        }

    } catch (e) {
        console.error(`[TOOLS ERROR] ${cmd}:`, e)
        await m.react('❌')
        return sendTool(conn, m, `❌ Error: ${e.message}`)
    }
}

handler.command = ['password','pass','contrasena','base64','binario','binary','hex','timestamp','fecha','time','pingurl','checkurl','ascii','pokedex','pokemon','chiste','joke','frase','quote','ytlink','acortaryt']
export default handler
