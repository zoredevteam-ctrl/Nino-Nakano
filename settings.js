import fs from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

// ————————————————————————————————————————————————————————————————————
// CONFIGURACIÓN DE IDENTIDAD 🦋
// ————————————————————————————————————————————————————————————————————

global.botName = 'Nino Nakano'
global.ownerName = '𝓐𝓪𝓻𝓸𝓶 𝓞𝔀𝓷𝓮𝓻 🦋'
global.botVersion = '1.0.5'

global.owner = [
  ['573107400303', 'Aarom 🦋', true],
  ['573508941325', 'Félix ⚡', true],
  ['123613520896125', 'Aarom LID 🦋', true]
]

global.owners = global.owner.map(v => v[0])
global.mods = []
global.prems = []

global.prefix = '#'

// ————————————————————————————————————————————————————————————————————
// ENLACES Y VISUALES 🎀
// ————————————————————————————————————————————————————————————————————

global.rcanal = 'https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G'

global.newsletterJid = '120363408182996815@newsletter'
global.newsletterName = '𓆩 ✧ 𝐍𝐢𝐧𝐨 ⌁ 𝑼𝒑𝒅𝒂𝒕𝒆𝒔 ✧ 𓆪'

// Banner principal del bot owner
global.banner = 'https://causas-files.vercel.app/fl/k7uk.jp'

// ————————————————————————————————————————————————————————————————————
// BANNER CONTEXTUAL — Resuelve el banner correcto según contexto 🦋
// Si hay un sub-bot activo con su propio banner, lo usa.
// Si no, usa el banner principal del bot owner.
// ————————————————————————————————————————————————————————————————————

/**
 * Retorna la URL del banner que corresponde al contexto actual.
 * - Si se ejecuta dentro de un sub-bot con banner propio → banner del sub-bot
 * - Si no → banner global del bot principal
 * @param {object|null} db - La base de datos (opcional, para leer el banner del subbot)
 * @returns {string} URL del banner activo
 */
global.getActiveBanner = (db = null) => {
    const subbotId = global._currentSubbotId
    if (subbotId && db?.subbots?.[subbotId]?.banner) {
        return db.subbots[subbotId].banner
    }
    return global.banner
}

/**
 * Descarga el banner activo y lo retorna como Buffer.
 * Usa getActiveBanner internamente para resolver el correcto.
 * @param {object|null} db - La base de datos (opcional)
 * @returns {Buffer|null}
 */
global.getBannerThumb = async (db = null) => {
    try {
        const url = global.getActiveBanner(db)
        const res = await fetch(url)
        return Buffer.from(await res.arrayBuffer())
    } catch {
        return null
    }
}

// ————————————————————————————————————————————————————————————————————
// FUNCIÓN GLOBAL PARA NEWSLETTER CONTEXT 🦋
// Úsala en cualquier plugin con: global.getNewsletterCtx(thumbnail, title, body)
// ————————————————————————————————————————————————————————————————————

global.getNewsletterCtx = (thumbnail = null, title = null, body = null) => {
    return {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: global.newsletterJid,
            serverMessageId: '',
            newsletterName: global.newsletterName
        },
        externalAdReply: {
            title: title || `🌸 ${global.botName}`,
            body: body || 'Nino Nakano Bot 🦋',
            mediaType: 1,
            mediaUrl: global.rcanal,
            sourceUrl: global.rcanal,
            thumbnail,
            showAdAttribution: false,
            containsAutoReply: true,
            renderLargerThumbnail: false
        }
    }
}

// ————————————————————————————————————————————————————————————————————
// MENSAJES DE SISTEMA (Estilo Tsundere 🦋)
// ————————————————————————————————————————————————————————————————————

global.mess = {
    wait: 'Un momento, no me apresures... ¿No ves que estoy ocupada? 🦋',
    success: '¡Listo! Qué fácil fue. Ni me des las gracias. ✨',
    error: 'Ugh, algo salió mal en el código. Arréglalo tú, tonto. 💢',
    owner: '¿Y tú quién eres? Este comando es exclusivo para Aarom. 😤',
    group: '¡Oye! Esto solo funciona en grupos. No seas raro. 🙄',
    admin: '¿Quién te crees? Solo los administradores tienen permiso para esto. 💅',
    botAdmin: 'Primero hazme administradora si quieres que haga el trabajo por ti. 😒',
    restrict: 'Esta función está bloqueada por ahora. No insistas. 🔒',
    notReg: 'No hablo con extraños. Regístrate con #reg si quieres mi atención. 📝'
}

// ————————————————————————————————————————————————————————————————————
// AUTO-RELOAD
// ————————————————————————————————————————————————————————————————————

const file = fileURLToPath(import.meta.url)

fs.watchFile(file, async () => {
    try {
        fs.unwatchFile(file)
        console.log(chalk.magentaBright('\n🦋 [SETTINGS]: Cambios guardados. Solo Aarom y Félix tienen el control ahora.'))
        await import(`${file}?update=${Date.now()}`)
    } catch (e) {
        console.error(chalk.red('[!] Error en auto-reload:'), e)
    }
})

export default global