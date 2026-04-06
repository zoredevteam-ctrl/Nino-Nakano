import chalk from 'chalk'

const getThumbnail = async () => {
    try {
        const res = await fetch(global.banner || 'https://causas-files.vercel.app/fl/fu5r.jpg')
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

let handler = async (m, { conn, isOwner }) => {
    if (!isOwner) return m.reply('💕 Solo mis dueños pueden reiniciarme.')

    const thumbnail = await getThumbnail()

    await conn.sendMessage(m.chat, {
        text:
            `🔄 *REINICIANDO ${(global.botName || 'Nino Nakano').toUpperCase()}*\n\n` +
            `⏳ Vuelvo en unos segundos...\n` +
            `_Hasta pronto_ 🦋💕`,
        contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                serverMessageId: '',
                newsletterName: global.newsletterName || 'Nino Nakano'
            },
            externalAdReply: {
                title: '🔄 REINICIANDO BOT',
                body: `${global.botName || 'Nino Nakano'} — Sistema`,
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

    console.log(chalk.magentaBright('\n🔄 [RESTART] Reiniciando por comando del owner...\n'))
    setTimeout(() => process.exit(0), 2000)
}

handler.command = ['restart', 'reiniciar', 'reboot']
handler.owner = true
export default handler
