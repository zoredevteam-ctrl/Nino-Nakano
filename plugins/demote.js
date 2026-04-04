import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
    command: ['demote', 'degradar', 'quitaradmin'],
    tags: ['group'],
    group: true,
    admin: true,
    botAdmin: true,
    desc: 'Degrada a un administrador del grupo',

    async run(m, { conn, who, isOwner }) {
        let user = who || m.quoted?.sender || m.mentionedJid?.[0]

        if (!user) {
            return m.reply(isOwner 
                ? `Mi amor, dime a quién quieres degradar 🥺\nEjemplo: *${m.prefix}demote @usuario* o responde a un mensaje`
                : `¿A quién quieres quitarle el admin, tonto? Menciona o responde 💅`
            )
        }

        // Normalizar JID (soporte LID)
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
            return m.reply(isOwner ? `Mi cielo, esa persona no está en el grupo 🥺` : `Esa persona no está en el grupo 🙄`)
        }

        if (!participant.admin) {
            return m.reply(isOwner ? `Mi amor, esa persona no es administrador 💕` : `Esa persona ni siquiera es admin, ¿qué quieres degradar? 💢`)
        }

        try {
            await conn.groupParticipantsUpdate(m.chat, [user], "demote")

            const name = participant.name || participant.notify || user.split('@')[0]

            const mensaje = isOwner 
                ? `💔 *Degradado con éxito*\n\n` +
                  `👤 Usuario: @${user.split('@')[0]}\n` +
                  `✨ Ya no es administrador\n\n` +
                  `Solo mi rey puede decidir quién manda aquí\~ 🥰`
                : `✅ *Administrador degradado*\n` +
                  `👤 @${user.split('@')[0]} ya no es admin\n` +
                  `Bien hecho... supongo 💅`

            await conn.sendMessage(m.chat, {
                text: mensaje,
                mentions: [user]
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply(isOwner ? `Ay no mi amor, no pude degradarlo 🥺 Inténtalo de nuevo` : `Ugh, no pude degradarlo. Algo falló, tonto 💢`)
        }
    }
}