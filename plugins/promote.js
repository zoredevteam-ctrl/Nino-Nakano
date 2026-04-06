const getThumbnail = async () => {
    try {
        const res = await fetch(global.banner || 'https://causas-files.vercel.app/fl/fu5r.jpg')
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
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

        if (!user) return m.reply(isOwner
            ? `💕 Mi amor, dime a quién quieres promover 🥺\nEjemplo: *#promote @usuario* o responde a su mensaje`
            : `💕 ¿A quién quieres promover? Menciona o responde a su mensaje.`
        )

        if (user.endsWith('@lid') && m.isGroup) {
            try {
                const meta = await conn.groupMetadata(m.chat)
                const found = meta.participants.find(p => p.id.split('@')[0] === user.split('@')[0])
                if (found?.jid) user = found.jid
            } catch {}
        }

        const meta = await conn.groupMetadata(m.chat)
        const participant = meta.participants.find(p => p.id === user || p.jid === user)

        if (!participant) return m.reply(`💕 Esa persona no está en el grupo.`)
        if (participant.admin) return m.reply(`💕 Esa persona ya es administrador.`)

        await conn.groupParticipantsUpdate(m.chat, [user], 'promote')

        // Nombre del que ejecutó el comando
        const promotorNombre = m.pushName || m.sender.split('@')[0]
        const promotorTag = `@${m.sender.split('@')[0]}`
        const usuarioTag = `@${user.split('@')[0]}`
        const grupoNombre = meta.subject || 'este reino'

        const thumbnail = await getThumbnail()

        const texto =
            `👑 *ASCENSO DE RANGO* 👑\n\n` +
            `🎖️ ${usuarioTag} *ha sido promovido a Administrador*\n` +
            `en el reino de *${grupoNombre}*\n\n` +
            `🤝 Promovido por: ${promotorTag}\n\n` +
            `_¡Felicidades al nuevo Admin! Que sirvas bien al reino_ 🌸`

        return conn.sendMessage(m.chat, {
            text: texto,
            mentions: [user, m.sender],
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                    serverMessageId: '',
                    newsletterName: global.newsletterName || 'Nino Nakano'
                },
                externalAdReply: {
                    title: `👑 NUEVO ADMINISTRADOR`,
                    body: `${global.botName || 'Nino Nakano'} — Sistema de Grupos`,
                    mediaType: 1,
                    mediaUrl: global.rcanal || '',
                    sourceUrl: global.rcanal || '',
                    thumbnail,
                    showAdAttribution: false,
                    containsAutoReply: true,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m })
    }
}
