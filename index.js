import './settings.js'
import chalk from 'chalk'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import fs from 'fs'
import path from 'path'
import readlineSync from 'readline-sync'
import { fileURLToPath } from 'url'
import {
  Browsers,
  makeWASocket,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  jidDecode,
  DisconnectReason
} from '@whiskeysockets/baileys'
import { handler } from './handler.js'
import { reconnectAllSubBots } from './lib/subbot-manager.js'
import { database } from './lib/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginsDir = path.join(__dirname, 'plugins')
global.conns = []

// ─── LOGGER ───────────────────────────────────────────────────────────────────
const log = {
  info:    msg => console.log(chalk.bgMagenta.white.bold('  INFO  ') + ' ' + chalk.white(msg)),
  success: msg => console.log(chalk.bgAnsi256(201).white.bold(' SUCCESS') + ' ' + chalk.magentaBright(msg)),
  warn:    msg => console.log(chalk.bgYellow.black.bold('  WARN  ') + ' ' + chalk.yellow(msg)),
  error:   msg => console.log(chalk.bgRed.white.bold('  ERROR ') + ' ' + chalk.redBright(msg))
}

const n2 = chalk.hex('#FF69B4')
const n3 = chalk.hex('#DA70D6')

// ─── BANNER ──────────────────────────────────────────────────────────────────
const ninoBanner = `
${n3('🦋 ─────────────────────────────────────────────────────────────── 🦋')}

${n2(' ███╗  ██╗██╗███╗  ██╗ ██████╗    ███╗  ██╗ █████╗ ██╗ ██╗ █████╗ ███╗  ██╗ ██████╗')}
${n2(' ████╗ ██║██║████╗ ██║██╔══██╗    ████╗ ██║██╔══██╗██║██╔╝██╔══██╗████╗ ██║██╔═══██╗')}
${n2(' ██╔██╗██║██║██╔██╗██║██║  ██║    ██╔██╗██║███████║█████╔╝ ███████║██╔██╗██║██║   ██║')}
${n2(' ██║╚████║██║██║╚████║██║  ██║    ██║╚████║██╔══██║██╔═██╗ ██╔══██║██║╚████║██║   ██║')}
${n2(' ██║ ╚███║██║██║ ╚███║╚██████╔╝   ██║ ╚███║██║  ██║██║  ██╗██║  ██║██║ ╚███║╚██████╔╝')}
${n2(' ╚═╝  ╚══╝╚═╝╚═╝  ╚══╝ ╚═════╝   ╚═╝  ╚══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚══╝ ╚═════╝')}

${chalk.white.bold('             ✦  POWERED BY  𝓐𝓪𝓻𝓸𝓶  |  Z0RT SYSTEMS  ✦')}

${n3('🦋 ─────────────────────────────────────────────────────────────── 🦋')}
`

// ─── CARGA DE PLUGINS ─────────────────────────────────────────────────────────
const plugins = new Map()

async function loadPlugins() {
  if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true })
  const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'))
  for (const file of files) {
    try {
      const filePath = path.resolve(pluginsDir, file)
      const plugin = (await import(`file://${filePath}?t=${Date.now()}`)).default
      if (plugin) {
        plugins.set(file, plugin)
        log.success(`Cargado: ${file}`)
      }
    } catch (e) {
      log.error(`Error en ${file}: ${e.message}`)
    }
  }
}

// ─── SESIÓN ───────────────────────────────────────────────────────────────────
global.sessionName = './Sessions/Owner'
if (!fs.existsSync(global.sessionName)) fs.mkdirSync(global.sessionName, { recursive: true })

const methodCodeQR = process.argv.includes('--qr')
const methodCode   = process.argv.includes('--code')

let opcion = ''
let phoneNumber = ''

// ─── BOT ──────────────────────────────────────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
  const { version } = await fetchLatestBaileysVersion()

  // Selección de método (solo la primera vez)
  if (!methodCodeQR && !methodCode && !state.creds.registered && !opcion) {
    console.clear()
    console.log(ninoBanner)
    console.log(chalk.bold.cyan('🦋 SELECCIONA TU MÉTODO DE VINCULACIÓN:\n'))
    console.log(chalk.magenta('   [1]') + chalk.white(' Código QR'))
    console.log(chalk.magenta('   [2]') + chalk.white(' Código de 8 dígitos'))
    opcion = readlineSync.question(chalk.bold.yellow('\n--> Elige una opción (1 o 2): ')).trim()

    if (opcion === '2') {
      phoneNumber = readlineSync
        .question(chalk.magenta('\n🦋 Ingresa tu número (ej: 57310...): '))
        .replace(/\D/g, '')
    }
  }

  const conn = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    getMessage: async () => ({ conversation: 'Nino Nakano está aquí.' })
  })

  global.conn = conn

  conn.decodeJid = jid => {
    if (!jid) return jid
    const decode = jidDecode(jid) || {}
    return (decode.user && decode.server)
      ? `${decode.user}@${decode.server}`
      : jid
  }

  conn.ev.on('creds.update', saveCreds)

  // Vinculación por código numérico (opción 2)
  if ((opcion === '2' || methodCode) && !state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await conn.requestPairingCode(phoneNumber)
        const formatted = code?.match(/.{1,4}/g)?.join('-') || code
        console.log(
          chalk.bgMagenta.white.bold('\n 🦋 TU CÓDIGO: ') +
          chalk.bgBlack.white.bold(` ${formatted} `) +
          '\n'
        )
      } catch (e) {
        log.error(`No se pudo obtener el código: ${e.message}`)
      }
    }, 3000)
  }

  // Eventos de conexión
  conn.ev.on('connection.update', async update => {
    const { qr, connection, lastDisconnect } = update

    if (qr && (opcion === '1' || methodCodeQR)) {
      console.log(chalk.cyan('\nEscanea este código QR con tu WhatsApp:'))
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      log.success(`Online: ${conn.user?.name || 'Nino Bot'} ✓`)
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const reason     = lastDisconnect?.error?.message || 'Desconocido'

      if (statusCode !== DisconnectReason.loggedOut) {
        log.warn(`Reconectando... (razón: ${reason})`)
        startBot()
      } else {
        log.error('Sesión cerrada. Borra la carpeta Sessions para re-vincular.')
      }
    }
  })

  // ─── BIENVENIDA / DESPEDIDA EN GRUPOS ────────────────────────────────────────
  conn.ev.on('group-participants.update', async anu => {
    try {
      const metadata = await conn.groupMetadata(anu.id)

      for (const num of anu.participants) {
        let ppuser
        try {
          ppuser = await conn.profilePictureUrl(num, 'image')
        } catch {
          ppuser = global.banner || ''
        }

        if (anu.action === 'add') {
          // 💖 Bienvenida cariñosa estilo Nino Nakano
          const txt = [
            `💐 ¡Bienvenid@ a *${metadata.subject}*, @${num.split('@')[0]}! 🎀`,
            ``,
            `Soy Nino... y aunque no suelo decir esto fácilmente...`,
            `me alegra que estés aquí. 🌸`,
            ``,
            `Espero que te sientas cómodo/a, que respetes a todos`,
            `y que disfrutes mucho tu tiempo con nosotros. 💕`,
            ``,
            `*¡Bienvenid@ de verdad!* 🦋✨`
          ].join('\n')

          await conn.sendMessage(anu.id, {
            text: txt,
            contextInfo: {
              mentionedJid: [num],
              externalAdReply: {
                title: '🌸 ¡Nuevo integrante! 🌸',
                body: `Bienvenido/a a ${metadata.subject}`,
                thumbnailUrl: ppuser,
                sourceUrl: global.rcanal || '',
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
          })

        } else if (anu.action === 'remove') {
          // 🍂 Despedida amable (sin ser tan cruel)
          const txt = [
            `🍂 @${num.split('@')[0]} ha salido de *${metadata.subject}*.`,
            ``,
            `Fue bonito tenerte aquí mientras duró... 🌙`,
            `Cuídate mucho donde vayas. Quizás nos volvamos a ver. 💫`
          ].join('\n')

          await conn.sendMessage(anu.id, {
            text: txt,
            contextInfo: {
              mentionedJid: [num],
              externalAdReply: {
                title: '🍂 Hasta pronto...',
                body: `Se fue de ${metadata.subject}`,
                thumbnailUrl: ppuser,
                sourceUrl: global.rcanal || '',
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
          })
        }
      }
    } catch (err) {
      log.error(`group-participants.update: ${err.message}`)
    }
  })

  // Procesamiento de mensajes
  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const m = messages[0]
    if (!m?.message || m.key.remoteJid === 'status@broadcast') return
    try {
      await handler(m, conn, plugins)
    } catch (e) {
      log.error(`handler: ${e.message}`)
    }
  })
}

// ─── ARRANQUE ────────────────────────────────────────────────────────────────
;(async () => {
  // ✅ Cargar base de datos primero
  await database.read()

  // ✅ Restaurar prefijo y banner guardados si existen
  if (database.data?.settings?.prefix) global.prefix = database.data.settings.prefix
  if (database.data?.settings?.banner) global.banner = database.data.settings.banner

  await loadPlugins()
  global.plugins = plugins
  await startBot()

  // ✅ Reconectar sub-bots guardados al arrancar
  await reconnectAllSubBots(database.data)
})()