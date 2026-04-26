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

function _attachMessageHandler(conn, subbotId, db) {
    conn.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return
        const m = messages[0]
        if (!m?.message || m.key.remoteJid === 'status@broadcast') return

        const subbotData = db?.subbots?.[subbotId]

        // ✅ FIX CONCURRENCIA: en vez de modificar globals compartidos,
        // guardamos el contexto del subbot DENTRO del conn y lo leemos desde ahí.
        // Así el bot principal nunca ve globals contaminados.
        conn._subbotContext = {
            botName:    subbotData?.name   || global.botName,
            banner:     subbotData?.banner || global.banner,
            subbotId
        }

        try {
            await handler(m, conn, global.plugins)
        } catch (e) {
            console.error(`[SUBBOT HANDLER] ${subbotId}:`, e.message)
        } finally {
            // Limpiar contexto al terminar
            conn._subbotContext = null
        }
    })

    conn.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata    = await conn.groupMetadata(anu.id)
            const subbotData  = db?.subbots?.[subbotId]
            const canalLink   = global.rcanal || ''

            // ✅ Banner del subbot como Buffer (nunca thumbnailUrl con base64)
            const bannerSrc   = subbotData?.banner || global.banner || ''
            let ppBuffer      = null
            try {
                if (bannerSrc.startsWith('data:image')) {
                    ppBuffer = Buffer.from(bannerSrc.split(',')[1], 'base64')
                } else if (bannerSrc) {
                    const r  = await fetch(bannerSrc)
                    ppBuffer = Buffer.from(await r.arrayBuffer())
                }
            } catch {}

            for (const num of anu.participants) {
                // Foto de perfil del usuario como Buffer
                let userThumb = ppBuffer
                try {
                    const ppUrl = await conn.profilePictureUrl(num, 'image')
                    const ppRes = await fetch(ppUrl)
                    userThumb   = Buffer.from(await ppRes.arrayBuffer())
                } catch {}

                if (anu.action === 'add') {
                    const txt = [
                        `💐 ¡Bienvenid@ a *${metadata.subject}*, @${num.split('@')[0]}! 🎀`,
                        ``,
                        `Soy Nino... y aunque no suelo decir esto fácilmente...`,
                        `me alegra que estés aquí. 🌸`,
                        ``,
                        `Espero que te sientas cómodo/a, que respetes a todos`,
                        `y que disfrutes mucho tu tiempo con nosotros. 💕`,
                        ``,
                        `*¡Bienvenid@ de verdad!* 🦋✨`
                    ].join('\n')

                    await conn.sendMessage(anu.id, {
                        text: txt,
                        contextInfo: {
                            mentionedJid: [num],
                            externalAdReply: {
                                title: '🌸 ¡Nuevo integrante! 🌸',
                                body: `Bienvenido/a a ${metadata.subject}`,
                                thumbnail: userThumb,
                                sourceUrl: canalLink,
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    })

                } else if (anu.action === 'remove') {
                    const txt = [
                        `🍂 @${num.split('@')[0]} ha salido de *${metadata.subject}*.`,
                        ``,
                        `Fue bonito tenerte aquí mientras duró... 🌙`,
                        `Cuídate mucho donde vayas. Quizás nos volvamos a ver. 💫`
                    ].join('\n')

                    await conn.sendMessage(anu.id, {
                        text: txt,
                        contextInfo: {
                            mentionedJid: [num],
                            externalAdReply: {
                                title: '🍂 Hasta pronto...',
                                body: `Se fue de ${metadata.subject}`,
                                thumbnail: userThumb,
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

    const tiempoBase = data.connectedAt || data.createdAt || Date.now()
    const tiempoMuerto = Date.now() - tiempoBase

    const noActivo = !activeSubBots.has(subbotId) && tiempoMuerto > 2 * 60 * 1000

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
}, 2 * 60 * 1000)