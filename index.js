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
import { exec } from 'child_process'
import { smsg } from './lib/simple.js'
import { database } from './lib/database.js'
import { handler, loadEvents } from './handler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginsDir = path.join(__dirname, 'plugins')
const SUBBOTS_DIR = './Sessions/SubBots'
global.conns = []

// Logs con estilo Nino
const log = {
  info: msg => console.log(chalk.bgMagenta.white.bold(' INFO '), chalk.white(msg)),
  success: msg => console.log(chalk.bgAnsi256(201).white.bold(' SUCCESS '), chalk.magentaBright(msg)),
  warn: msg => console.log(chalk.bgYellow.red.bold(' WARNING '), chalk.yellow(msg)),
  error: msg => console.log(chalk.bgRed.white.bold(' ERROR '), chalk.redBright(msg))
}

const n1 = chalk.hex('#DDA0DD'), n2 = chalk.hex('#FF69B4'), n3 = chalk.hex('#DA70D6'), n4 = chalk.hex('#8B008B')

const ninoBanner = `
${n3('🦋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🦋')}
${n1('             .⢀⡤⠤⠒⠒⢲⡖⠢⢤⣀.             ')}
${n1('          ⢀⡠⠚⣁⠤⠤⠤⠤⢼⣷⠀⢀⡈⠓⢤.          ')}
${n1('    ⢷⣤⣪⢖⡥⠒⠊⠉⢉⠉⠺⣿⣇⡀⠱⡀⠀⠱⡄.       ')}
${n2('    ⢸⣿⡿⠋⠀⠀⠀⠀⠀⣧⢠⢠⠀⢣⠀⠹⡀⡀⠘⣆.      ')}
${n2('    ⡯⡿⠁⡄⠀⠀⢰⣄⠀⢹⡆⢎⣆⠀⢣⠀⢱⢹⣆⠘⡄.     ')}
${n2('   ⢸⠀⡗⡄⢡⠸⡀⠀⡞⡄⠘⣿⡸⣯⠳⡵⣄⠀⢇⡏⢆⠹⡄.    ')}
${n2('   ⢸⡀⢱⢇⠘⣆⢳⡀⢹⣇⠀⢻⡑⣸⣤⣬⣿⡀⢸⢸⡌⢦⠱⡀.   ')}
${n3('   ⠘⣧⠸⡜⣦⠹⡆⢳⣄⣿⡄⢺⢿⣽⣾⡈⠀⣧⠈⣾⣼⠄⢣⠹⡄.  ')}
${n3('    ⢿⠀⢣⠙⣧⣿⣾⡏⠉⠀⠀⠀⠙⠉⠀⠀⢸⠀⢹⣿⡄⠀⠳⡹⣦⡀. ')}
${n3('    ⠘⡇⠀⣿⣍⠙⠿⠁⠠⣄⠀⠀⠀⠀⠀⠀⢸⠀⢸⡏⢻⡄⠀⠘⢾⣗⢦.')}
${n3('🦋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🦋')}
${n2('      🦋  ')}${chalk.whiteBright.bold('N I N O  N A K A N O')}${n2('  🦋')}
${chalk.gray('         ꕦ power by Arom ꕦ')}  ${chalk.gray('v' + global.botVersion)}
${n3('🦋━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🦋')}
`

// --- CARGA DE PLUGINS ---
const plugins = new Map()
async function loadPlugins () {
  if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true })
  const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'))
  for (const file of files) {
    try {
      const filePath = path.join(pluginsDir, file)
      const plugin = (await import(`${filePath}?t=${Date.now()}`)).default
      if (plugin) { plugins.set(file, plugin); log.success(`Cargado: ${file}`) }
    } catch (e) { log.error(`Error en ${file}: ${e.message}`) }
  }
}

global.sessionName = global.sessionName || './Sessions/Owner'
try { fs.mkdirSync(global.sessionName, { recursive: true }) } catch (e) {}

const methodCodeQR = process.argv.includes('--qr')
const methodCode = process.argv.includes('--code')

let opcion = ''
let phoneNumber = ''

if (methodCodeQR) opcion = '1'
else if (methodCode) opcion = '2'
else if (!fs.existsSync(`${global.sessionName}/creds.json`)) {
  opcion = readlineSync.question(chalk.bold.white('\nSelecciona método:\n') + chalk.magenta('1. QR | 2. Código\n--> '))
  if (opcion === '2') {
    phoneNumber = readlineSync.question(chalk.magenta('Número (ej: 57310...): ')).replace(/\D/g, '')
  }
}

async function startBot () {
  const { state, saveCreds } = await useMultiFileAuthState(global.sessionName)
  const { version } = await fetchLatestBaileysVersion()

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
    return decode.user && decode.server ? decode.user + '@' + decode.server : jid
  }

  conn.ev.on('creds.update', saveCreds)

  // Vinculación por código
  if (opcion === '2' && !state.creds.registered) {
    setTimeout(async () => {
      let code = await conn.requestPairingCode(phoneNumber)
      console.log(chalk.magenta(`\n🦋 CÓDIGO: `) + chalk.white.bold(code?.match(/.{1,4}/g)?.join('-') || code) + '\n')
    }, 3000)
  }

  // --- EVENTO DE CONEXIÓN ---
  conn.ev.on('connection.update', async update => {
    const { qr, connection, lastDisconnect } = update
    if (qr && opcion === '1') qrcode.generate(qr, { small: true })
    if (connection === 'open') {
      console.log(ninoBanner)
      log.success(`Online: ${conn.user?.name}`)
      await loadEvents(conn)
    }
    if (connection === 'close') startBot()
  })

  // --- 🦋 SISTEMA DE BIENVENIDA Y DESPEDIDA (ESTILO NINO) 🦋 ---
  conn.ev.on('group-participants.update', async (anu) => {
    try {
      const metadata = await conn.groupMetadata(anu.id)
      const participants = anu.participants
      for (let num of participants) {
        let ppuser;
        try { ppuser = await conn.profilePictureUrl(num, 'image') } catch { ppuser = global.banner }

        if (anu.action === 'add') {
          let txt = `¡Oye, @${num.split('@')[0]}! No creas que me alegra que te hayas unido, pero intenta no ser una molestia en *${metadata.subject}*. Bienvenid@, supongo... 🦋🙄`
          await conn.sendMessage(anu.id, {
            text: txt,
            contextInfo: {
              mentionedJid: [num],
              externalAdReply: {
                title: `NUEVO INTEGRANTE 🦋`,
                body: `Bienvenido a ${metadata.subject}`,
                thumbnailUrl: ppuser,
                sourceUrl: global.rcanal,
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
          })
        } else if (anu.action === 'remove') {
          let txt = `@${num.split('@')[0]} se fue del grupo. Ugh, una molestia menos de la cual preocuparse. ¡Ni regreses! 💅💢`
          await conn.sendMessage(anu.id, {
            text: txt,
            contextInfo: {
              mentionedJid: [num],
              externalAdReply: {
                title: `USUARIO SALIENTE 🦋`,
                body: `Se fue de ${metadata.subject}`,
                thumbnailUrl: ppuser,
                sourceUrl: global.rcanal,
                mediaType: 1,
                renderLargerThumbnail: true
              }
            }
          })
        }
      }
    } catch (err) { log.error('Error en Welcome System: ' + err.message) }
  })

  // --- PROCESAMIENTO DE MENSAJES ---
  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    let m = messages[0]
    if (!m?.message || m.key.remoteJid === 'status@broadcast') return
    try {
      m = await smsg(conn, m)
      await handler(m, conn, plugins)
    } catch (e) { log.error(e.message) }
  })
}

(async () => {
  await database.read()
  await loadPlugins()
  global.plugins = plugins
  await startBot()
})()
