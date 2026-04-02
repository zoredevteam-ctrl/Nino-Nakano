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

// Logs con estilo
const log = {
  info: msg => console.log(chalk.bgMagenta.white.bold(' INFO '), chalk.white(msg)),
  success: msg => console.log(chalk.bgAnsi256(201).white.bold(' SUCCESS '), chalk.magentaBright(msg)),
  error: msg => console.log(chalk.bgRed.white.bold(' ERROR '), chalk.redBright(msg))
}

const n2 = chalk.hex('#FF69B4'), n3 = chalk.hex('#DA70D6')

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
const plugins = {}
async function loadPlugins() {
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'))
    for (const file of files) {
        try {
            const plugin = await import(`./plugins/${file}?t=${Date.now()}`)
            plugins[file] = plugin.default || plugin
            log.success(`Plugin: ${file} [OK]`)
        } catch (e) { log.error(`Error en ${file}: ${e.message}`) }
    }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./Sessions/Owner')
    const { version } = await fetchLatestBaileysVersion()

    console.clear()
    console.log(ninoBanner)

    let opcion = ''
    let phoneNumber = ''

    if (!state.creds.registered) {
        console.log(chalk.bold.cyan('\n🦋 SELECCIONA TU MÉTODO DE VINCULACIÓN:'))
        console.log(chalk.magenta('   [1]') + chalk.white(' Código de 8 dígitos (Recomendado)'))
        console.log(chalk.magenta('   [2]') + chalk.white(' Código QR'))
        opcion = readlineSync.question(chalk.bold.yellow('\n--> Elije una opción (1 o 2): ')).trim()

        if (opcion === '1') {
            phoneNumber = readlineSync.question(chalk.magenta('\n🦋 Ingresa tu número (ej: 57310...): ')).replace(/\D/g, '')
        }
    }

    const conn = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: opcion === '2',
        browser: Browsers.ubuntu('Chrome'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        }
    })

    conn.ev.on('creds.update', saveCreds)

    if (opcion === '1' && !state.creds.registered) {
        setTimeout(async () => {
            let code = await conn.requestPairingCode(phoneNumber)
            console.log(chalk.black.bgMagenta.bold(`\n TÚ CÓDIGO DE VINCULACIÓN: `), chalk.white.bgBlack.bold(` ${code?.match(/.{1,4}/g)?.join('-') || code} `), `\n`)
        }, 3000)
    }

    conn.ev.on('connection.update', async (update) => {
        const { connection } = update
        if (connection === 'open') {
            log.success(`Conectado como: ${conn.user?.name || 'Nino Bot'}`)
        }
        if (connection === 'close') startBot()
    })

    conn.ev.on('messages.upsert', async ({ messages }) => {
        let m = messages[0]
        if (!m.message) return
        try {
            m = await smsg(conn, m)
            // IMPORTANTE: Pasamos los plugins al handler
            await handler(m, conn, plugins) 
        } catch (e) { console.error(e) }
    })
}

(async () => {
    await database.read()
    await loadPlugins()
    await startBot()
})()
