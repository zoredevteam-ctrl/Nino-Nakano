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
import { smsg } from './lib/simple.js'
import { database } from './lib/database.js'
import { handler } from './handler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginsDir = path.join(__dirname, 'plugins')
global.conns = []

// Logs con estilo Nino
const log = {
  info: msg => console.log(chalk.bgMagenta.white.bold(' INFO '), chalk.white(msg)),
  success: msg => console.log(chalk.bgAnsi256(201).white.bold(' SUCCESS '), chalk.magentaBright(msg)),
  warn: msg => console.log(chalk.bgYellow.red.bold(' WARNING '), chalk.yellow(msg)),
  error: msg => console.log(chalk.bgRed.white.bold(' ERROR '), chalk.redBright(msg))
}

const n2 = chalk.hex('#FF69B4'), n3 = chalk.hex('#DA70D6')

// --- BANNER GIGANTE NINO NAKANO ---
const ninoBanner = `
${n3('🦋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🦋')}
${n2('  ███╗   ██╗██╗███╗   ██╗ ██████╗     ███╗   ██╗ █████╗ ██╗  ██╗ █████╗ ███╗   ██╗ ██████╗  ')}
${n2('  ████╗  ██║██║████╗  ██║██╔═══██╗    ████╗  ██║██╔══██╗██║ ██╔╝██╔══██╗████╗  ██║██╔═══██╗ ')}
${n2('  ██╔██╗ ██║██║██╔██╗ ██║██║   ██║    ██╔██╗ ██║███████║█████╔╝ ███████║██╔██╗ ██║██║   ██║ ')}
${n2('  ██║╚██╗██║██║██║╚██╗██║██║   ██║    ██║╚██╗██║██╔══██║██╔═██╗ ██╔══██║██║╚██╗██║██║   ██║ ')}
${n2('  ██║ ╚████║██║██║ ╚████║╚██████╔╝    ██║ ╚████║██║  ██║██║  ██╗██║  ██║██║ ╚████║╚██████╔╝ ')}
${n2('  ╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝ ╚═════╝     ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ')}
${n3('🦋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🦋')}
${chalk.white.bold('                 POWER BY 𝓐𝓪𝓻𝓸𝓶 | Z0RT SYSTEMS')}
${n3('🦋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🦋')}
`

// --- CARGA DE PLUGINS ---
const plugins = new Map()
async function loadPlugins () {
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
    } catch (e) { log.error(`Error en ${file}: ${e.message}`) }
  }
}

global.sessionName = './Sessions/Owner'
if (!fs.existsSync(global.sessionName)) fs.mkdirSync(global.sessionName, { recursive: true })

const methodCodeQR = process.argv.includes('--qr')
const methodCode = process.argv.includes('--code')

let opcion = ''
let phoneNumber = ''

async function startBot () {
  const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
  const { version } = await fetchLatestBaileysVersion()

  // --- SELECCIÓN DE MÉTODO (LIMPIO Y SEPARADO) ---
  if (!methodCodeQR && !methodCode && !state.creds.registered && !opcion) {
    console.clear()
    console.log(ninoBanner)
    console.log(chalk.bold.cyan('\n🦋 SELECCIONA TU MÉTODO DE VINCULACIÓN:'))
    console.log(chalk.magenta('   [1]') + chalk.white(' Código QR'))
    console.log(chalk.magenta('   [2]') + chalk.white(' Código de 8 dígitos'))
    opcion = readlineSync.question(chalk.bold.yellow('\n--> Elije una opción (1 o 2): ')).trim()

    if (opcion === '2') {
      phoneNumber = readlineSync.question(chalk.magenta('\n🦋 Ingresa tu número (ej: 57310...): ')).replace(/\D/g, '')
    }
  }

  const conn = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false, // Lo manejamos manualmente con qrcode-terminal
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
    return decode.user && decode.server ? decode.user + '@' + decode.server : jid
  }

  conn.ev.on('creds.update', saveCreds)

  // Vinculación por código (Opción 2)
  if ((opcion === '2' || methodCode) && !state.creds.registered) {
    setTimeout(async () => {
      let code = await conn.requestPairingCode(phoneNumber)
      console.log(chalk.bgMagenta.white.bold(`\n 🦋 TÚ CÓDIGO: `) + chalk.bgBlack.white.bold(` ${code?.match(/.{1,4}/g)?.join('-') || code} `) + '\n')
    }, 3000)
  }

  // --- EVENTO DE CONEXIÓN ---
  conn.ev.on('connection.update', async update => {
    const { qr, connection, lastDisconnect } = update
    
    // Generar QR en consola si eligió la Opción 1
    if (qr && (opcion === '1' || methodCodeQR)) {
        console.log(chalk.cyan('\nEscanea este código QR con tu WhatsApp:'))
        qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.clear()
      console.log(ninoBanner)
      log.success(`Online: ${conn.user?.name || 'Nino Bot'}`)
    }

    if (connection === 'close') {
      const reason = new Error(lastDisconnect?.error)?.message
      if (reason !== DisconnectReason.loggedOut) startBot()
      else log.error('Sesión cerrada. Borra la carpeta Sessions para re-vincular.')
    }
  })

  // --- BIENVENIDA / DESPEDIDA ---
  conn.ev.on('group-participants.update', async (anu) => {
    try {
      const metadata = await conn.groupMetadata(anu.id)
      for (let num of anu.participants) {
        let ppuser;
        try { ppuser = await conn.profilePictureUrl(num, 'image') } catch { ppuser = global.banner }

        if (anu.action === 'add') {
          let txt = `¡Oye, @${num.split('@')[0]}! No creas que me alegra que te hayas unido, pero intenta no ser una molestia en *${metadata.subject}*. Bienvenid@, supongo... 🦋🙄`
          await conn.sendMessage(anu.id, { text: txt, contextInfo: { mentionedJid: [num], externalAdReply: { title: `NUEVO INTEGRANTE 🦋`, body: `Bienvenido a ${metadata.subject}`, thumbnailUrl: ppuser, sourceUrl: global.rcanal, mediaType: 1, renderLargerThumbnail: true }}})
        } else if (anu.action === 'remove') {
          let txt = `@${num.split('@')[0]} se fue del grupo. Ugh, una molestia menos. ¡Ni regreses! 💅💢`
          await conn.sendMessage(anu.id, { text: txt, contextInfo: { mentionedJid: [num], externalAdReply: { title: `USUARIO SALIENTE 🦋`, body: `Se fue de ${metadata.subject}`, thumbnailUrl: ppuser, sourceUrl: global.rcanal, mediaType: 1, renderLargerThumbnail: true }}})
        }
      }
    } catch (err) { console.log(err) }
  })

  // --- PROCESAMIENTO ---
  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    let m = messages[0]
    if (!m?.message || m.key.remoteJid === 'status@broadcast') return
    try {
      m = await smsg(conn, m)
      await handler(m, conn, plugins)
    } catch (e) { console.error(e) }
  })
}

// ARRANQUE
(async () => {
  await database.read()
  await loadPlugins()
  global.plugins = plugins
  await startBot()
})()
