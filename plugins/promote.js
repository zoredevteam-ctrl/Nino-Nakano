import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
    command: ['promote', 'promover', 'daradmin'],
    tags: ['group'],
    group: true,
    admin: true,
    botAdmin: true,
    desc: 'Promueve a un usuario a administrador del grupo',

    async run(m, { conn, who, isOwner }) {
        let user = who || m.quoted?.sender || m.mentionedJid?.[0]

        if (!user) {
            return m.reply(isOwner 
                ? `Mi amor, dime a quién quieres promover 🥺\nEjemplo: *${m.prefix}promote @usuario* o responde a un mensaje`
                : `¿A quién quieres promover, tonto? Menciona a alguien o responde a su mensaje 💅`
            )
        }

        // Normalizar JID
        if (user.endsWith('@lid')) {
            try {
                const groupMeta = await conn.groupMetadata(m.chat)
                const found = groupMeta.participants.find(p => 
                    p.id.split('@')[0] === user.split('@')[0]
                )
                if (found?.jid) user = found.jid
            } catch {}
        }

        const participant = await conn.groupMetadata(m.chat)
            .then(meta => meta.participants.find(p => p.id === user || p.jid === user))

        if (!participant) {
            return m.reply(isOwner ? `Mi cielo, esa persona no está en el grupo 🥺` : `Esa persona no está en el grupo, tonto 🙄`)
        }

        if (participant.admin) {
            return m.reply(isOwner ? `Mi amor, esa persona ya es admin 💕` : `Esa persona ya es administrador, ¿estás ciego? 💢`)
        }

        try {
            await conn.groupParticipantsUpdate(m.chat, [user], "promote")

            const name = participant.name || participant.notify || user.split('@')[0]

            const mensaje = isOwner 
                ? `💖 *Promovido con éxito*\n\n` +
                  `👤 Usuario: @${user.split('@')[0]}\n` +
                  `✨ Ahora es administrador del grupo\n\n` +
                  `Mi rey siempre consigue lo que quiere\~ 🥰`
                : `✅ *Usuario promovido*\n` +
                  `👤 @${user.split('@')[0]} ahora es administrador\n` +
                  `No me des las gracias, lo hice porque quise 💅`

            await conn.sendMessage(m.chat, {
                text: mensaje,
                mentions: [user]
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply(isOwner ? `Ay no mi amor, algo salió mal al promoverlo 🥺` : `Ugh, no pude promoverlo. Inténtalo de nuevo, tonto 💢`)
        }
    }
}