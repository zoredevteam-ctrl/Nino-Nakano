import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import pino from 'pino'
import {
    Browsers,
    makeWASocket,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidDecode,
    DisconnectReason
} from '@whiskeysockets/baileys'
import { handler } from '../handler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSIONS_BASE = path.resolve('./Sessions/SubBots')
const RCANAL = 'https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G'

// Map de conexiones activas: subbotId -> conn
const activeSubBots = new Map()

// Asegurar carpeta base de sesiones
if (!fs.existsSync(SESSIONS_BASE)) {
    fs.mkdirSync(SESSIONS_BASE, { recursive: true })
}

/**
 * Inicia un sub-bot y devuelve el código de vinculación
 * @param {string} subbotId
 * @param {string} phoneNumber
 * @param {object} mainConn - conexión del bot principal (para reenviar mensajes de estado)
 * @param {object} db - database.data
 */
export const startSubBot = async (subbotId, phoneNumber, mainConn, db) => {
    return new Promise(async (resolve) => {
        try {
            const sessionPath = path.join(SESSIONS_BASE, subbotId)
            if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

            const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
            const { version } = await fetchLatestBaileysVersion()

            const conn = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                browser: Browsers.ubuntu('Chrome'),
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
                },
                markOnlineOnConnect: true,
                generateHighQualityLinkPreview: true,
                getMessage: async () => ({ conversation: 'Nino SubBot' })
            })

            conn.decodeJid = jid => {
                if (!jid) return jid
                const decode = jidDecode(jid) || {}
                return (decode.user && decode.server) ? `${decode.user}@${decode.server}` : jid
            }

            conn.ev.on('creds.update', saveCreds)

            // Solicitar código de vinculación
            let codeSent = false
            setTimeout(async () => {
                try {
                    if (!state.creds.registered && !codeSent) {
                        codeSent = true
                        const rawCode = await conn.requestPairingCode(phoneNumber)
                        const formatted = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode
                        resolve({ success: true, code: formatted })
                    }
                } catch (e) {
                    resolve({ success: false, error: e.message })
                }
            }, 2000)

            // Eventos de conexión
            conn.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update

                if (connection === 'open') {
                    console.log(`[SUBBOT] ✅ Conectado: ${subbotId} (${phoneNumber})`)

                    // Marcar como conectado en db
                    if (db?.subbots?.[subbotId]) {
                        db.subbots[subbotId].connected = true
                        db.subbots[subbotId].connectedAt = Date.now()
                    }

                    activeSubBots.set(subbotId, conn)

                    // Cargar plugins globales
                    if (global.plugins) {
                        _attachMessageHandler(conn, subbotId, db)
                    }
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode
                    console.log(`[SUBBOT] ⚠️ Desconectado: ${subbotId} (código: ${statusCode})`)

                    if (db?.subbots?.[subbotId]) {
                        db.subbots[subbotId].connected = false
                    }

                    activeSubBots.delete(subbotId)

                    // Reconectar si no fue logout
                    if (statusCode !== DisconnectReason.loggedOut) {
                        console.log(`[SUBBOT] 🔄 Reconectando: ${subbotId}`)
                        setTimeout(() => startSubBot(subbotId, phoneNumber, mainConn, db), 5000)
                    } else {
                        console.log(`[SUBBOT] ❌ Sesión cerrada permanentemente: ${subbotId}`)
                        // Limpiar sesión
                        try {
                            fs.rmSync(path.join(SESSIONS_BASE, subbotId), { recursive: true, force: true })
                        } catch {}
                        if (db?.subbots?.[subbotId]) {
                            delete db.subbots[subbotId]
                        }
                    }
                }
            })

            // Si ya estaba registrado, no necesita código
            if (state.creds.registered) {
                activeSubBots.set(subbotId, conn)
                _attachMessageHandler(conn, subbotId, db)
                resolve({ success: true, code: 'YA_VINCULADO' })
            }

        } catch (e) {
            console.error(`[SUBBOT ERROR] ${subbotId}:`, e)
            resolve({ success: false, error: e.message })
        }
    })
}

/**
 * Detiene un sub-bot y cierra su sesión
 */
export const stopSubBot = async (subbotId) => {
    const conn = activeSubBots.get(subbotId)
    if (conn) {
        try {
            await conn.logout()
        } catch {}
        try {
            conn.end()
        } catch {}
        activeSubBots.delete(subbotId)
    }

    // Limpiar archivos de sesión
    const sessionPath = path.join(SESSIONS_BASE, subbotId)
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true })
    }
}

/**
 * Devuelve el Map de sub-bots activos
 */
export const getSubBots = () => activeSubBots

/**
 * Reconecta todos los sub-bots guardados en db al arrancar el bot
 * Llamar desde index.js después de loadPlugins()
 */
export const reconnectAllSubBots = async (db) => {
    if (!db?.subbots) return
    const lista = Object.entries(db.subbots)
    if (!lista.length) return

    console.log(`[SUBBOT] Reconectando ${lista.length} sub-bot(s)...`)

    for (const [subbotId, data] of lista) {
        const sessionPath = path.join(SESSIONS_BASE, subbotId)
        // Solo reconectar si tiene sesión guardada
        if (fs.existsSync(sessionPath)) {
            try {
                await startSubBot(subbotId, data.phone, global.conn, db)
            } catch (e) {
                console.error(`[SUBBOT] Error reconectando ${subbotId}:`, e.message)
            }
        } else {
            // No hay sesión, marcar como desconectado
            db.subbots[subbotId].connected = false
        }
    }
}

/**
 * Adjunta el handler de mensajes a un sub-bot
 * El sub-bot usa los mismos plugins que el bot principal
 * pero con su propio nombre y banner de db
 */
function _attachMessageHandler(conn, subbotId, db) {
    // Sobreescribir globals del subbot para este contexto
    conn._subbotId = subbotId

    conn.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return
        const m = messages[0]
        if (!m?.message || m.key.remoteJid === 'status@broadcast') return

        // Aplicar nombre y banner del subbot temporalmente
        const subbotData = db?.subbots?.[subbotId]
        const prevName = global.botName
        const prevBanner = global.banner

        if (subbotData?.name) global.botName = subbotData.name
        if (subbotData?.banner) global.banner = subbotData.banner

        try {
            await handler(m, conn, global.plugins)
        } catch (e) {
            console.error(`[SUBBOT HANDLER] ${subbotId}:`, e.message)
        } finally {
            // Restaurar globals del bot principal
            global.botName = prevName
            global.banner = prevBanner
        }
    })

    // Bienvenida / Despedida (igual que el bot principal)
    conn.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata = await conn.groupMetadata(anu.id)
            const subbotData = db?.subbots?.[subbotId]

            for (const num of anu.participants) {
                let ppuser
                try {
                    ppuser = await conn.profilePictureUrl(num, 'image')
                } catch {
                    ppuser = subbotData?.banner || global.banner || ''
                }

                const canalLink = global.rcanal || RCANAL

                if (anu.action === 'add') {
                    await conn.sendMessage(anu.id, {
                        text: `¡Oye, @${num.split('@')[0]}! No creas que me alegra que te hayas unido, pero intenta no ser una molestia en *${metadata.subject}*. Bienvenid@, supongo... 🦋🙄`,
                        contextInfo: {
                            mentionedJid: [num],
                            externalAdReply: {
                                title: 'NUEVO INTEGRANTE 🦋',
                                body: `Bienvenido a ${metadata.subject}`,
                                thumbnailUrl: ppuser,
                                sourceUrl: canalLink,
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    })
                } else if (anu.action === 'remove') {
                    await conn.sendMessage(anu.id, {
                        text: `@${num.split('@')[0]} se fue del grupo. Ugh, una molestia menos. ¡Ni regreses! 💅💢`,
                        contextInfo: {
                            mentionedJid: [num],
                            externalAdReply: {
                                title: 'USUARIO SALIENTE 🦋',
                                body: `Se fue de ${metadata.subject}`,
                                thumbnailUrl: ppuser,
                                sourceUrl: canalLink,
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    })
                }
            }
        } catch (e) {
            console.error(`[SUBBOT GROUP] ${subbotId}:`, e.message)
        }
    })

    console.log(`[SUBBOT] 🎀 Handler adjuntado: ${subbotId}`)
}
