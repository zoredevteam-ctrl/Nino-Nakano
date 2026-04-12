/**
 * ENVIARTT - NINO NAKANO
 * Descarga un TikTok y lo envia al canal oficial
 * Comandos: #enviartt, #sendtt
 * Solo owners
 *
 * FIX: Baileys 7.x no puede enviar media directo a canales (newsletter).
 * Solución: enviar video al chat primero, luego forwardMessage al canal.
 */

const RCANAL    = 'https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G'
const CANAL_JID = '120363408182996815@newsletter'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const sendCtx = async (conn, m, text, isError = false) => {
    const thumb = await global.getBannerThumb()
    const ctx   = global.getNewsletterCtx(
        thumb,
        (isError ? '❌ ' : '🎵 ') + global.botName,
        isError ? 'Error al enviar' : 'TikTok Canal'
    )
    return conn.sendMessage(m.chat, { text, contextInfo: ctx }, { quoted: m })
}

// ─── DESCARGA TIKTOK ──────────────────────────────────────────────────────────

const downloadTikTok = async (url) => {
    let videoUrl = null
    let autor    = 'Desconocido'
    let titulo   = ''

    const apis = [
        async () => {
            const r = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(url))
            const j = await r.json()
            if (j?.code !== 0) throw new Error('Tikwm error ' + j?.code)
            autor  = j.data?.author?.unique_id || 'Desconocido'
            titulo = j.data?.title || ''
            // play = sin marca de agua, wmplay = con marca
            return j.data?.play || j.data?.wmplay || null
        },
        async () => {
            const r = await fetch('https://rest.alyabotpe.xyz/dl/tiktok?url=' + encodeURIComponent(url) + '&key=Duarte-zz12')
            const j = await r.json()
            if (!j?.status) throw new Error('AlyaBot sin status')
            autor  = j.data?.author || j.data?.username || 'Desconocido'
            titulo = j.data?.title  || j.data?.desc     || ''
            return j.data?.download || j.data?.dl || j.data?.url || null
        },
        async () => {
            const r = await fetch('https://api.giftedtech.co.ke/api/download/tiktok?apikey=Fedex&url=' + encodeURIComponent(url))
            const j = await r.json()
            const d = j?.result || j?.data
            if (!d) throw new Error('GiftedTech sin resultado')
            autor  = d.author   || d.username || 'Desconocido'
            titulo = d.title    || d.desc     || ''
            return d.video?.noWatermark || d.video?.watermark || d.download?.url || d.url || null
        }
    ]

    for (const fn of apis) {
        try {
            const link = await fn()
            if (link && String(link).startsWith('http')) {
                videoUrl = link
                console.log('[ENVIARTT] Descarga OK:', videoUrl.slice(0, 60))
                break
            }
        } catch (e) { console.log('[ENVIARTT] API falló:', e.message) }
    }

    if (!videoUrl) throw new Error('Ninguna API pudo descargar el video de TikTok')
    return { videoUrl, autor, titulo }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, args }) => {
    const url = args[0] || (m.quoted?.text ? m.quoted.text.trim() : '')

    if (!url || !url.includes('tiktok.com')) {
        return sendCtx(conn, m,
            '🎵 *ENVIAR AL CANAL*\n\n' +
            'Necesito un link válido de TikTok~\n\n' +
            '*Uso:*\n' +
            '› *#enviartt <link>*\n' +
            '› O responde a un mensaje con el link\n\n' +
            '_Ejemplo: #enviartt https://vt.tiktok.com/..._'
        )
    }

    await m.react('⏳')

    try {
        const JID_CANAL    = global.newsletterJid || CANAL_JID
        const canalNombre  = global.newsletterName || 'Canal de Nino'

        // ── 1. Descargar info del TikTok ──
        const { videoUrl, autor, titulo } = await downloadTikTok(url)
        await m.react('⬇️')

        const caption =
            '🌸 *' + (titulo || 'TikTok') + '*\n\n' +
            '👤 *Creador:* @' + autor + '\n' +
            '🔗 *Fuente:* TikTok\n\n' +
            '╭─────────────────╮\n' +
            '│  🦋 *' + global.botName + '*  │\n' +
            '│  ✦ Z0RT SYSTEMS ✦  │\n' +
            '╰─────────────────╯'

        await m.react('📤')

        // ── 2. Enviar video al chat del owner primero ──
        // (Baileys 7.x no puede enviar media directo a canales newsletter)
        const sent = await conn.sendMessage(m.chat, {
            video: { url: videoUrl },
            caption,
            mimetype: 'video/mp4'
        }, { quoted: m })

        // ── 3. Reenviar el mensaje al canal usando forwardMessage ──
        // forwardMessage sí funciona con media en canales en Baileys 7.x
        try {
            await conn.forwardMessage(JID_CANAL, sent, { force: true })
            console.log('[ENVIARTT] Video reenviado al canal OK')
        } catch (fwdErr) {
            // Si forwardMessage falla, intentar con copyNForward
            console.log('[ENVIARTT] forwardMessage falló, intentando copyNForward:', fwdErr.message)
            try {
                await conn.copyNForward(JID_CANAL, sent, false)
                console.log('[ENVIARTT] copyNForward al canal OK')
            } catch (copyErr) {
                // Último recurso: enviar directo por URL al canal
                console.log('[ENVIARTT] copyNForward falló, enviando por URL directo:', copyErr.message)
                await conn.sendMessage(JID_CANAL, {
                    video: { url: videoUrl },
                    caption,
                    mimetype: 'video/mp4'
                })
            }
        }

        await m.react('✅')

        return sendCtx(conn, m,
            '✅ *Video publicado en el canal!*\n\n' +
            '📺 *Canal:* ' + canalNombre + '\n' +
            '👤 *Autor:* @' + autor + '\n' +
            '📝 *Título:* ' + (titulo || '—') + '\n\n' +
            '_El video ya está en el canal_ 🦋'
        )

    } catch (e) {
        console.error('[ENVIARTT ERROR]', e)
        await m.react('❌')
        return sendCtx(conn, m,
            '❌ *Error al procesar el video*\n\n' +
            (e.message || String(e)) + '\n\n' +
            '_Revisa que el bot sea administrador del canal_ 🦋',
            true
        )
    }
}

handler.command = ['enviartt', 'sendtt']
handler.owner   = true
export default handler
