const getThumbnail = async () => {
    try {
        const res = await fetch(global.banner || 'https://causas-files.vercel.app/fl/fu5r.jpg')
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

export default {
    command: ['demote', 'degradar', 'quitaradmin'],
    tags: ['group'],
    group: true,
    admin: true,
    botAdmin: true,
    desc: 'Degrada a un administrador del grupo',

    async run(m, { conn, who, isOwner }) {
        let user = who || m.quoted?.sender || m.mentionedJid?.[0]

        if (!user) return m.reply(isOwner
            ? `💕 Mi amor, dime a quién quieres degradar 🥺\nEjemplo: *#demote @usuario* o responde a su mensaje`
            : `💕 ¿A quién quieres quitarle el admin? Menciona o responde.`
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
        if (!participant.admin) return m.reply(`💕 Esa persona ni siquiera es admin.`)

        await conn.groupParticipantsUpdate(m.chat, [user], 'demote')

        // Nombre del que ejecutó el comando
        const degradadorNombre = m.pushName || m.sender.split('@')[0]
        const degradadorTag = `@${m.sender.split('@')[0]}`
        const usuarioTag = `@${user.split('@')[0]}`
        const grupoNombre = meta.subject || 'este reino'

        const thumbnail = await getThumbnail()

        const texto =
            `🦋 *CAÍDA DE RANGO* 🦋\n\n` +
            `🎀 ${usuarioTag} *ha sido bajado de rango*\n` +
            `en el reino de *${grupoNombre}*\n\n` +
            `🎀 Degradado por: ${degradadorTag}\n\n` +
            `_El reino ha hablado. Ya no portarás la corona_ 🥀`

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
                    title: `⚔️ RANGO REMOVIDO`,
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
