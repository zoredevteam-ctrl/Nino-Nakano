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

const activeSubBots = new Map()
const connSubbotMap = new WeakMap()

if (!fs.existsSync(SESSIONS_BASE)) {
    fs.mkdirSync(SESSIONS_BASE, { recursive: true })
}

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

            // ✅ Guardar contexto directamente en el conn — nunca en globals
            conn._subbotId = subbotId
            connSubbotMap.set(conn, subbotId)

            conn.ev.on('creds.update', saveCreds)

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

            let handlerAttached = false

            conn.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update

                if (connection === 'open') {
                    console.log(`[SUBBOT] ✅ Conectado: ${subbotId} (${phoneNumber})`)

                    if (db?.subbots?.[subbotId]) {
                        db.subbots[subbotId].connected = true
                        db.subbots[subbotId].connectedAt = Date.now()
                    }

                    activeSubBots.set(subbotId, conn)

                    if (global.plugins && !handlerAttached) {
                        handlerAttached = true
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

                    if (statusCode !== DisconnectReason.loggedOut) {
                        console.log(`[SUBBOT] 🔄 Reconectando: ${subbotId}`)
                        setTimeout(() => startSubBot(subbotId, phoneNumber, mainConn, db), 5000)
                    } else {
                        console.log(`[SUBBOT] ❌ Sesión cerrada permanentemente: ${subbotId}`)
                        try {
                            fs.rmSync(path.join(SESSIONS_BASE, subbotId), { recursive: true, force: true })
                        } catch {}
                        if (db?.subbots?.[subbotId]) {
                            delete db.subbots[subbotId]
                        }
                    }
                }
            })

            if (state.creds.registered && !handlerAttached) {
                handlerAttached = true
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

export const stopSubBot = async (subbotId) => {
    const conn = activeSubBots.get(subbotId)
    if (conn) {
        try { await conn.logout() } catch {}
        try { conn.end() } catch {}
        activeSubBots.delete(subbotId)
    }
    const sessionPath = path.join(SESSIONS_BASE, subbotId)
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true })
    }
}

export const getSubBots = () => activeSubBots

export const reconnectAllSubBots = async (db) => {
    if (!db?.subbots) return
    const lista = Object.entries(db.subbots)
    if (!lista.length) return

    console.log(`[SUBBOT] Reconectando ${lista.length} sub-bot(s)...`)

    for (const [subbotId, data] of lista) {
        const sessionPath = path.join(SESSIONS_BASE, subbotId)
        if (fs.existsSync(sessionPath)) {
            try {
                await startSubBot(subbotId, data.phone, global.conn, db)
            } catch (e) {
                console.error(`[SUBBOT] Error reconectando ${subbotId}:`, e.message)
            }
        } else {
            db.subbots[subbotId].connected = false
        }
    }
}

// 🧹 Limpieza automática de sesiones huérfanas / inactivas
export const cleanInactiveSubBots = async (db) => {
    try {
        if (!db?.subbots) return

        const sessionFolders = fs.existsSync(SESSIONS_BASE)
            ? fs.readdirSync(SESSIONS_BASE)
            : []

        const activos = new Set(Object.keys(db.subbots))

        // 1. 🗑️ Eliminar carpetas que ya no existen en DB
        for (const folder of sessionFolders) {
            if (!activos.has(folder)) {
                try {
                    fs.rmSync(path.join(SESSIONS_BASE, folder), { recursive: true, force: true })
                    console.log(`[CLEAN] 🗑️ Carpeta huérfana eliminada: ${folder}`)
                } catch {}
            }
        }

        // 2. 🗑️ Eliminar registros en DB sin carpeta o desconectados permanentemente
        for (const [subbotId, data] of Object.entries(db.subbots)) {
            const sessionPath = path.join(SESSIONS_BASE, subbotId)

            const noFolder = !fs.existsSync(sessionPath)
            const noActivo = !activeSubBots.has(subbotId)

            if (noFolder || noActivo) {
                try {
                    if (fs.existsSync(sessionPath)) {
                        fs.rmSync(sessionPath, { recursive: true, force: true })
                    }
                } catch {}

                delete db.subbots[subbotId]
                console.log(`[CLEAN] ❌ Subbot eliminado por inactividad: ${subbotId}`)
            }
        }

    } catch (e) {
        console.error('[CLEAN ERROR]', e.message)
    }
}

// ⏱️ Ejecutar limpieza cada 10 minutos
setInterval(() => {
    try {
        if (global.db?.data) {
            cleanInactiveSubBots(global.db.data)
        }
    } catch {}
}, 10 * 60 * 1000)