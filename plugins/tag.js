const getThumbnail = async () => {
    try {
        const res = await fetch(global.banner || 'https://causas-files.vercel.app/fl/fu5r.jpg')
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

export default {
    command: ['tag', 'everyone', 'todos', 'all'],
    tags: ['group'],
    group: true,
    admin: true,
    desc: 'Menciona a todos los miembros del grupo',

    async run(m, { conn, text, isOwner }) {
        const meta = await conn.groupMetadata(m.chat)
        const members = meta.participants.map(p => p.id)
        const total = members.length
        const grupoNombre = meta.subject || 'el grupo'
        const mensaje = (text || '').trim()
        const thumbnail = await getThumbnail()

        // Construir el texto con todas las menciones
        const tags = members.map(jid => `@${jid.split('@')[0]}`).join(' ')

        const texto =
            `🦋 *ATENCIÓN ${grupoNombre.toUpperCase()}* 🎀\n\n` +
            `${mensaje ? `💬 *Mensaje:* ${mensaje}\n\n` : ''}` +
            `🎀 *${total} miembros mencionados:*\n` +
            `${tags}\n\n` +
            `👑 _Mensaje enviado por @${m.sender.split('@')[0]}_`

        return conn.sendMessage(m.chat, {
            text: texto,
            mentions: [...members, m.sender],
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                    serverMessageId: '',
                    newsletterName: global.newsletterName || 'Nino Nakano'
                },
                externalAdReply: {
                    title: `🎀 TAG GRUPAL`,
                    body: `${global.botName || 'Nino Nakano'} — ${total} miembros`,
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
