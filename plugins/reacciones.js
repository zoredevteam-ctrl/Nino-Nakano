/**
 * REACCIONES - NINO NAKANO
 * dance, hug, kill, kiss, sad — Todo en un solo archivo
 * Z0RT SYSTEMS 🦋
 */

// ─── HELPER COMPARTIDO ────────────────────────────────────────────────────────
// Toda la lógica repetida centralizada en una sola función

const reaccion = async (m, conn, db, config) => {
    const { reactInicio, reactFin, videos, textos, errorMsg } = config

    try {
        await m.react(reactInicio)

        // ── Resolver target ──
        let who
        if (m.mentionedJid?.length > 0)  who = m.mentionedJid[0]
        else if (m.quoted)                who = m.quoted.sender
        else                              who = m.sender

        // Resolver @lid a JID normal (necesario en algunos grupos)
        if (who.endsWith('@lid') || isNaN(who.split('@')[0])) {
            try {
                const meta  = await conn.groupMetadata(m.chat)
                const found = meta.participants.find(p => p.id === who || p.lid === who)
                if (found?.jid) who = found.jid
            } catch {}
        }

        // ── Nombres ──
        const getName = (jid) => db.users?.[jid]?.name || jid.split('@')[0]
        const name  = getName(who)
        const name2 = m.pushName || m.sender.split('@')[0]

        // ── Texto según contexto ──
        let str
        if (m.mentionedJid?.length > 0) str = textos.mention(name2, name)
        else if (m.quoted)               str = textos.quoted(name2, name)
        else                             str = textos.solo(name2)

        // ── Video aleatorio ──
        const video = videos[Math.floor(Math.random() * videos.length)]

        // ── Contexto newsletter ──
        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, `🦋 ${global.botName}`, 'Reacciones Anime')

        await conn.sendMessage(m.chat, {
            video:       { url: video },
            gifPlayback: true,
            caption:     str,
            mentions:    [who],
            contextInfo: ctx
        }, { quoted: m })

        await m.react(reactFin)

    } catch (e) {
        console.error('[REACCION ERROR]', e.message)
        await m.react('💔')
        m.reply(errorMsg)
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGS DE CADA REACCIÓN
// ══════════════════════════════════════════════════════════════════════════════

const CONFIGS = {

    // ── 💃 DANCE ──────────────────────────────────────────────────────────────
    dance: {
        reactInicio: '💃',
        reactFin:    '🦋',
        textos: {
            mention: (a, b) => `\`${a}\` *baila junto con* \`${b}\` 💃✨`,
            quoted:  (a, b) => `\`${a}\` *está bailando con* \`${b}\` 🦋`,
            solo:    (a)    => `\`${a}\` *suelta los pasos prohibidos* 💃`
        },
        errorMsg: '💔 Algo salió mal enviando el baile~',
        videos: [
            'https://files.catbox.moe/1ihm59.mp4',
            'https://files.catbox.moe/fuw5jt.mp4',
            'https://files.catbox.moe/u9lihf.mp4',
            'https://files.catbox.moe/dhd4cg.mp4',
            'https://files.catbox.moe/yyul5f.mp4',
            'https://files.catbox.moe/o0p0kl.mp4',
            'https://files.catbox.moe/8ds17n.mp4',
            'https://files.catbox.moe/4aoknb.mp4'
        ]
    },

    // ── 🫂 HUG ────────────────────────────────────────────────────────────────
    hug: {
        reactInicio: '🫂',
        reactFin:    '🌸',
        textos: {
            mention: (a, b) => `\`${a}\` *le dio un fuerte abrazo a* \`${b}\` 🤗`,
            quoted:  (a, b) => `\`${a}\` *abrazó a* \`${b}\` 🌸`,
            solo:    (a)    => `\`${a}\` *se abrazó a sí mismo* 🫂`
        },
        errorMsg: '💔 Algo salió mal enviando el abrazo~',
        videos: [
            'https://telegra.ph/file/6a3aa01fabb95e3558eec.mp4',
            'https://telegra.ph/file/0e5b24907be34da0cbe84.mp4',
            'https://telegra.ph/file/6bc3cd10684f036e541ed.mp4',
            'https://telegra.ph/file/3e443a3363a90906220d8.mp4',
            'https://telegra.ph/file/56d886660696365f9696b.mp4',
            'https://telegra.ph/file/3eeadd9d69653803b33c6.mp4',
            'https://telegra.ph/file/436624e53c5f041bfd597.mp4',
            'https://telegra.ph/file/5866f0929bf0c8fe6a909.mp4'
        ]
    },

    // ── 🗡️ KILL ───────────────────────────────────────────────────────────────
    kill: {
        reactInicio: '🗡️',
        reactFin:    '⚰️',
        textos: {
            mention: (a, b) => `\`${a}\` *mató a* \`${b}\` 💫`,
            quoted:  (a, b) => `\`${a}\` *eliminó a* \`${b}\` ⚰️`,
            solo:    (a)    => `\`${a}\` *se mató a sí mismo* 😵`
        },
        errorMsg: '⚠️ Algo falló al ejecutar el asesinato~',
        videos: [
            'https://files.catbox.moe/pv2q2f.mp4',
            'https://files.catbox.moe/oon0oa.mp4',
            'https://files.catbox.moe/vibexk.mp4',
            'https://files.catbox.moe/cv7odw.mp4',
            'https://files.catbox.moe/bztm0m.mp4',
            'https://files.catbox.moe/7ualwg.mp4'
        ]
    },

    // ── 💋 KISS ───────────────────────────────────────────────────────────────
    kiss: {
        reactInicio: '🫦',
        reactFin:    '💋',
        textos: {
            mention: (a, b) => `\`${a}\` *le dio besos a* \`${b}\` *( ˘ ³˘)♥*`,
            quoted:  (a, b) => `\`${a}\` *besó a* \`${b}\` 💋`,
            solo:    (a)    => `\`${a}\` *se besó a sí mismo ( ˘ ³˘)♥*`
        },
        errorMsg: '💔 Darling, algo salió mal enviando el beso~',
        videos: [
            'https://files.catbox.moe/hu4p0g.mp4',
            'https://files.catbox.moe/jevc51.mp4',
            'https://files.catbox.moe/zekrvg.mp4',
            'https://files.catbox.moe/czed90.mp4',
            'https://files.catbox.moe/nnsf25.mp4',
            'https://files.catbox.moe/zpxhw0.mp4',
            'https://files.catbox.moe/er4b5i.mp4',
            'https://files.catbox.moe/h462h6.mp4',
            'https://files.catbox.moe/qelt3e.mp4',
            'https://files.catbox.moe/t4e2j6.mp4',
            'https://files.catbox.moe/x3bchw.mp4',
            'https://files.catbox.moe/odhu8s.mp4',
            'https://files.catbox.moe/kvzxf4.mp4',
            'https://files.catbox.moe/53dlob.mp4',
            'https://files.catbox.moe/rln11n.mp4',
            'https://files.catbox.moe/5ylp16.mp4',
            'https://files.catbox.moe/wfix0f.mp4',
            'https://files.catbox.moe/j7nbs3.mp4',
            'https://files.catbox.moe/mi00rn.mp4'
        ]
    },

    // ── 😢 SAD ────────────────────────────────────────────────────────────────
    sad: {
        reactInicio: '😥',
        reactFin:    '🌧️',
        textos: {
            mention: (a, b) => `\`${a}\` *está triste por* \`${b}\` 😢`,
            quoted:  (a, b) => `\`${a}\` *llora por* \`${b}\` 💧`,
            solo:    (a)    => `\`${a}\` *está muy triste* 😔`
        },
        errorMsg: '💔 Algo salió mal enviando la tristeza~',
        videos: [
            'https://telegra.ph/file/9c69837650993b40113dc.mp4',
            'https://telegra.ph/file/071f2b8d26bca81578dd0.mp4',
            'https://telegra.ph/file/0af82e78c57f7178a333b.mp4',
            'https://telegra.ph/file/8fb8739072537a63f8aee.mp4',
            'https://telegra.ph/file/4f81cb97f31ce497c3a81.mp4',
            'https://telegra.ph/file/6d626e72747e0c71eb920.mp4',
            'https://telegra.ph/file/8fd1816d52cf402694435.mp4',
            'https://telegra.ph/file/3e940fb5e2b2277dc754b.mp4'
        ]
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// HANDLER ÚNICO
// ══════════════════════════════════════════════════════════════════════════════

let handler = async (m, { conn, command, db }) => {
    const cmd = command.toLowerCase()

    const map = {
        dance:   CONFIGS.dance,
        bailar:  CONFIGS.dance,
        hug:     CONFIGS.hug,
        abrazar: CONFIGS.hug,
        kill:    CONFIGS.kill,
        matar:   CONFIGS.kill,
        kiss:    CONFIGS.kiss,
        besar:   CONFIGS.kiss,
        sad:     CONFIGS.sad,
        triste:  CONFIGS.sad
    }

    const config = map[cmd]
    if (!config) return

    await reaccion(m, conn, db, config)
}

handler.command = [
    'dance', 'bailar',
    'hug',   'abrazar',
    'kill',  'matar',
    'kiss',  'besar',
    'sad',   'triste'
]
handler.tags  = ['anime']
handler.group = true

export default handler
