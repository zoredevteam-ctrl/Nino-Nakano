import { database } from '../lib/database.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { startSubBot, stopSubBot, getSubBots } from '../lib/subbot-manager.js'

/**
 * SISTEMA DE SUB-BOTS - NINO NAKANO
 * Comandos: #code, #code on/off, #subbots, #setnombre, #setbanner, #delsubbot
 */

const RCANAL = 'https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G'
const MAX_SUBBOTS = 30

// ✅ Cache de buffers de banners en memoria (evita re-descargar cada vez)
// key: subbotId o 'main', value: Buffer
const bannerCache = new Map()

/**
 * Obtiene el thumbnail como Buffer para usar en externalAdReply.
 * - Si el banner es base64 → lo convierte a Buffer directamente
 * - Si es URL https:// → lo descarga y cachea
 * - Si falla → retorna null
 */
const getBannerBuffer = async (bannerUrlOrBase64, cacheKey = 'main') => {
    if (!bannerUrlOrBase64) return null

    // Si ya está en cache, usar ese
    if (bannerCache.has(cacheKey)) return bannerCache.get(cacheKey)

    try {
        let buffer
        if (bannerUrlOrBase64.startsWith('data:image')) {
            // Base64 → Buffer directo
            const base64Data = bannerUrlOrBase64.split(',')[1]
            buffer = Buffer.from(base64Data, 'base64')
        } else {
            // URL → descargar
            const res = await fetch(bannerUrlOrBase64)
            buffer = Buffer.from(await res.arrayBuffer())
        }
        bannerCache.set(cacheKey, buffer)
        return buffer
    } catch {
        return null
    }
}

const sendNino = async (conn, m, text, subbotKey = null) => {
    const canalLink = global.rcanal || RCANAL
    const bannerSrc = subbotKey
        ? (database.data?.subbots?.[subbotKey]?.banner || global.banner || '')
        : (global.banner || '')
    const thumbnail = await getBannerBuffer(bannerSrc, subbotKey || 'main')

    return conn.sendMessage(m.chat, {
        text,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                serverMessageId: '',
                newsletterName: global.newsletterName || 'Nino Nakano'
            },
            externalAdReply: {
                title: global.botName || 'Nino Nakano',
                body: 'Sistema de Sub-Bots 🎀',
                // ✅ Usar thumbnail como Buffer, no como URL base64
                thumbnail,
                sourceUrl: canalLink,
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false
            }
        }
    }, { quoted: m })
}

export default {
    command: ['code', 'subbots', 'setnombre', 'setbanner', 'delsubbot'],
    tags: ['subbots'],
    desc: 'Sistema de Sub-Bots Nino Nakano',

    async run(m, { conn, command, text, args, isOwner, db }) {
        const cmd = command.toLowerCase()
        const sender = m.sender

        // Asegurar estructura en db
        if (!db.subbots) db.subbots = {}
        if (!db.subbotConfig) db.subbotConfig = { codeEnabled: true }

        const cfg = db.subbotConfig
        const subbots = db.subbots

        // ==================== #code on / #code off (solo owner) ====================
        if (cmd === 'code' && (text === 'on' || text === 'off')) {
            if (!isOwner) return sendNino(conn, m, '💕 Solo mis dueños pueden habilitar o deshabilitar el #code.')
            cfg.codeEnabled = text === 'on'
            return sendNino(conn, m, `👑 El comando *#code* ahora está *${cfg.codeEnabled ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}*`)
        }

        // ==================== #code (vincular sub-bot) ====================
        if (cmd === 'code') {
            if (!cfg.codeEnabled) {
                return sendNino(conn, m, '❌ El sistema de vinculación está desactivado por el owner.')
            }

            const totalActivos = Object.keys(subbots).filter(k => subbots[k]?.connected).length
            if (totalActivos >= MAX_SUBBOTS) {
                return sendNino(conn, m, `❌ Se alcanzó el límite máximo de *${MAX_SUBBOTS} sub-bots*. Elimina uno antes de agregar otro.\n\nUsa *#subbots* para ver la lista.`)
            }

            const numArg = (text || '').replace(/\D/g, '')
            if (!numArg || numArg.length < 8) {
                return sendNino(conn, m,
                    `👑 *VINCULAR SUB-BOT*\n\n` +
                    `Para vincular un sub-bot necesito tu número de WhatsApp.\n\n` +
                    `🎀 *Uso:* #code <número>\n` +
                    `🎀 *Ejemplo:* #code 573001234567\n\n` +
                    `_Incluye el código de país sin el + (ej: 57 para Colombia)_`
                )
            }

            const yaExiste = Object.values(subbots).find(s => s.phone === numArg)
            if (yaExiste) {
                return sendNino(conn, m, `🦋 El número *+${numArg}* ya tiene un sub-bot registrado.\n\nUsa *#delsubbot ${numArg}* para eliminarlo primero.`)
            }

            const subbotId = `subbot_${Date.now()}`

            await sendNino(conn, m,
                `👑 *VINCULANDO SUB-BOT...*\n\n` +
                `📱 Número: *+${numArg}*\n` +
                `🔄 Generando código de 8 dígitos...\n\n` +
                `_Espera un momento_ 🦋`
            )

            try {
                const result = await startSubBot(subbotId, numArg, conn, db)

                if (!result.success) {
                    return sendNino(conn, m, `❌ Error al generar el código: ${result.error}`)
                }

                subbots[subbotId] = {
                    id: subbotId,
                    phone: numArg,
                    owner: sender,
                    name: `SubBot ${Object.keys(subbots).length + 1}`,
                    banner: '',
                    connected: false,
                    createdAt: Date.now()
                }

                await conn.sendMessage(m.chat, {
                    text:
                        `👑 *VINCULAR SUB-BOT*\n\n` +
                        `📲 *Cómo hacerlo:*\n` +
                        `1. Abre WhatsApp en *+${numArg}*\n` +
                        `2. Ve a ⚙️ Ajustes → Dispositivos Vinculados\n` +
                        `3. Toca *Vincular un dispositivo*\n` +
                        `4. Selecciona *Vincular con número de teléfono*\n` +
                        `5. Copia y pega el código del siguiente mensaje 👇\n\n` +
                        `⏱️ _El código expira en 60 segundos_`
                }, { quoted: m })

                await conn.sendMessage(m.chat, { text: result.code })

            } catch (e) {
                console.error('[SUBBOT CODE ERROR]', e)
                return sendNino(conn, m, `❌ Ocurrió un error al generar el código de vinculación.\n\nError: ${e.message}`)
            }

            return
        }

        // ==================== #subbots (ver lista) ====================
        if (cmd === 'subbots') {
            const lista = Object.values(subbots)

            if (!lista.length) {
                return sendNino(conn, m,
                    `👑 *SUB-BOTS*\n\n` +
                    `No hay sub-bots registrados aún.\n\n` +
                    `Usa *#code <número>* para vincular uno.`
                )
            }

            let txt = `💫 *LISTA DE SUB-BOTS* (${lista.length}/${MAX_SUBBOTS})\n\n`
            lista.forEach((s, i) => {
                const estado = s.connected ? '🟢 Conectado' : '🔴 Desconectado'
                txt += `*${i + 1}.* ${s.name || 'SubBot'}\n`
                txt += `   📱 +${s.phone}\n`
                txt += `   ${estado}\n\n`
            })

            txt += `_Usa *#delsubbot <número>* para eliminar un sub-bot_`
            return sendNino(conn, m, txt)
        }

        // ==================== #setnombre ====================
        if (cmd === 'setnombre') {
            if (!text || !text.trim()) {
                return sendNino(conn, m, `💕 Usa: *#setnombre <nombre>*\nEjemplo: *#setnombre Mi Bot Bonito*`)
            }

            const miSubbot = Object.entries(subbots).find(([, s]) => s.owner === sender)

            if (!miSubbot && !isOwner) {
                return sendNino(conn, m, `❌ No tienes ningún sub-bot registrado.\n\nUsa *#code <número>* para vincular uno.`)
            }

            const nuevoNombre = text.trim().slice(0, 50)

            if (isOwner && !miSubbot) {
                global.botName = nuevoNombre
                return sendNino(conn, m, `✅ Nombre del bot principal cambiado a: *${nuevoNombre}*`)
            }

            const [subbotKey] = miSubbot
            subbots[subbotKey].name = nuevoNombre
            return sendNino(conn, m, `✅ Nombre del sub-bot cambiado a: *${nuevoNombre}*\n\nSe mostrará así en el menú del sub-bot 🌸`, subbotKey)
        }

        // ==================== #setbanner ====================
        if (cmd === 'setbanner') {
            const miSubbot = Object.entries(subbots).find(([, s]) => s.owner === sender)

            if (!miSubbot && !isOwner) {
                return sendNino(conn, m, `❌ No tienes ningún sub-bot registrado.\n\nUsa *#code <número>* para vincular uno.`)
            }

            const isImageMsg = m.message?.imageMessage
            const isQuotedImage = m.quoted?.message?.imageMessage

            if (!isImageMsg && !isQuotedImage) {
                return sendNino(conn, m, `🖼️ Envía una imagen con *#setbanner* o responde una imagen con ese comando.`)
            }

            try {
                const targetMsg = isImageMsg
                    ? { key: m.key, message: m.message }
                    : { key: m.quoted.key, message: m.quoted.message }

                const buffer = await downloadMediaMessage(
                    targetMsg,
                    'buffer',
                    {},
                    {
                        logger: {
                            level: 'silent', child: () => ({
                                level: 'silent', info: () => {}, error: () => {},
                                warn: () => {}, debug: () => {}, trace: () => {}
                            })
                        },
                        reuploadRequest: conn.updateMediaMessage
                    }
                )

                // ✅ Guardar como base64 en DB (para persistencia)
                const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`

                if (isOwner && !miSubbot) {
                    // ✅ Bot principal: guardar base64 en DB y buffer en memoria
                    if (!db.settings) db.settings = {}
                    db.settings.banner = base64
                    global.banner = base64

                    // ✅ Actualizar cache con el buffer nuevo
                    bannerCache.set('main', buffer)

                    return sendNino(conn, m, `✅ Banner del bot principal actualizado 🌸`)
                }

                const [subbotKey] = miSubbot

                // ✅ Sub-bot: guardar solo en su entrada de DB
                subbots[subbotKey].banner = base64

                // ✅ Actualizar cache del subbot con el buffer nuevo
                bannerCache.set(subbotKey, buffer)

                // ✅ Actualizar global.banner si este subbot está activo ahora
                if (global._currentSubbotId === subbotKey) {
                    global.banner = base64
                }

                return sendNino(conn, m, `✅ Banner del sub-bot actualizado 🌸`, subbotKey)

            } catch (e) {
                console.error('[SETBANNER ERROR]', e)
                return sendNino(conn, m, `❌ No pude procesar la imagen: ${e.message}`)
            }
        }

        // ==================== #delsubbot ====================
        if (cmd === 'delsubbot') {
            const numArg = (text || '').replace(/\D/g, '')

            if (!numArg) {
                return sendNino(conn, m, `💕 Usa: *#delsubbot <número>*\nEjemplo: *#delsubbot 573001234567*`)
            }

            const entrada = Object.entries(subbots).find(([, s]) => s.phone === numArg)

            if (!entrada) {
                return sendNino(conn, m, `❌ No encontré ningún sub-bot con el número *+${numArg}*`)
            }

            const [subbotKey, subbotData] = entrada

            if (subbotData.owner !== sender && !isOwner) {
                return sendNino(conn, m, `❌ Solo el dueño de ese sub-bot o el owner puede eliminarlo.`)
            }

            try { await stopSubBot(subbotKey) } catch {}

            // ✅ Limpiar cache del banner al eliminar
            bannerCache.delete(subbotKey)

            delete subbots[subbotKey]

            return sendNino(conn, m, `✅ Sub-bot *+${numArg}* eliminado correctamente.\n\nUsa *#subbots* para ver la lista actualizada.`)
        }
    }
}