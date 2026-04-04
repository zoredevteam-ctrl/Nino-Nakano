import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const getThumbnailBuffer = async (url) => {
    try {
        const res = await (await import('node-fetch')).default(url)
        return await res.buffer()
    } catch {
        return null
    }
}

export default {
    command: ['promote', 'promover', 'daradmin'],
    tags: ['group'],
    group: true,
    admin: true,
    botAdmin: true,
    desc: 'Promueve a un usuario a administrador',

    async run(m, { conn, who, isOwner }) {
        let user = who || m.quoted?.sender || m.mentionedJid?.[0]

        if (!user) {
            return m.reply(isOwner 
                ? `💕 Mi amor, dime a quién quieres promover 🥺\nEjemplo: *#promote @usuario* o responde a su mensaje`
                : `💕 ¿A quién quieres promover? Menciona o responde a su mensaje.`
            )
        }

        // Normalizar LID si es necesario
        if (user.endsWith('@lid') && m.isGroup) {
            try {
                const meta = await conn.groupMetadata(m.chat)
                const found = meta.participants.find(p => p.id.split('@')[0] === user.split('@')[0])
                if (found?.jid) user = found.jid
            } catch {}
        }

        const meta = await conn.groupMetadata(m.chat)
        const participant = meta.participants.find(p => p.id === user || p.jid === user)

        if (!participant) return m.reply(isOwner ? `💕 Mi cielo, esa persona no está en el grupo 🥺` : `💕 Esa persona no está en el grupo.`)

        if (participant.admin) return m.reply(isOwner ? `💕 Mi amor, ya es administrador 💕` : `💕 Esa persona ya es admin.`)

        await conn.groupParticipantsUpdate(m.chat, [user], "promote")

        const sendAsChannel = async (text) => {
            const bannerUrl = global.banner || 'https://qu.ax/zRNgk.jpg'
            const thumbnail = await getThumbnailBuffer(bannerUrl).catch(() => null)

            let newsletterJid = '0@s.whatsapp.net'
            if (global.rcanal && global.rcanal.includes('/channel/')) {
                const code = global.rcanal.split('/channel/')[1]
                newsletterJid = `${code}@newsletter`
            }

            const params = {
                text,
                contextInfo: {
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        serverMessageId: '',
                        newsletterName: global.botName || 'Nino Nakano'
                    },
                    externalAdReply: {
                        title: global.botName || 'Nino Nakano',
                        body: 'Nino Nakano Group 💕',
                        mediaType: 1,
                        mediaUrl: global.rcanal || '',
                        sourceUrl: global.rcanal || '',
                        thumbnail,
                        showAdAttribution: false,
                        containsAutoReply: true,
                        renderLargerThumbnail: true
                    }
                }
            }
            return conn.sendMessage(m.chat, params, { quoted: m })
        }

        const mensaje = isOwner
            ? `💖 *Promovido con éxito*\n\n👤 @${user.split('@')[0]}\n✨ Ahora es administrador del grupo\n\nMi rey siempre consigue lo que quiere\~ 🥰`
            : `💕 *Usuario promovido*\n👤 @${user.split('@')[0]} ahora es administrador del grupo`

        await sendAsChannel(mensaje, { mentions: [user] })
    }
}