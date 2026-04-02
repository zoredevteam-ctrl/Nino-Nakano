const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    Browsers,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const chalk = require('chalk');
const readline = require('readline');
const handler = require('./handler');
require('./settings');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startNino() {
    const { state, saveCreds } = await useMultiFileAuthState('./session_nino');
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.clear();
    // ASCII ART REFORMADO (Ajustado para pantallas de Termux)
    console.log(chalk.hex('#FF69B4').bold(`
  _   _ _               _   _       _                      
 | \\ | (_)             | \\ | |     | |                     
 |  \\| |_ _ __   ___   |  \\| | __ _| | ____ _ _ __   ___  
 | . \` | | '_ \\ / _ \\  | . \` |/ _\` | |/ / _\` | '_ \\ / _ \\ 
 | |\\  | | | | | (_) | | |\\  | (_| |   < (_| | | | | (_) |
 |_| \\_|_|_| |_|\\___/  |_| \\_|\\__,_|_|\\_\\__,_|_| |_|\\___/ 
                                             
    ${chalk.white('---')} ${chalk.hex('#FF69B4')('B Y   A A R O M   |   Z 0 R T   S Y S T E M S')} ${chalk.white('---')}
    `));
    
    console.log(chalk.gray(`Motor: Baileys v${version.join('.')} ${isLatest ? '(Estable)' : ''}\n`));

    let method = 0;
    if (!state.creds.registered) {
        console.log(chalk.cyan('Selecciona el método:'));
        console.log(chalk.white('1. Código de vinculación'));
        console.log(chalk.white('2. Código QR'));
        method = await question(chalk.magenta('\nOpcion > '));
    }

    const nino = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: method === '2',
        auth: {
            creds: state.creds,
            // 🛡️ PARCHE 1: Cacheable Signal Store para evitar el Bad MAC
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: Browsers.ubuntu('Chrome'), 
        generateHighQualityLinkPreview: true,
        syncFullHistory: true, // 🛡️ PARCHE 2: Sincronizar historial ayuda a evitar errores de llave
        markOnlineOnConnect: true,
        // 🛡️ PARCHE 3: Reintentar envío si hay error de cifrado
        shouldIgnoreJid: (jid) => isLatest && jid?.endsWith('@newsletter'),
        getMessage: async (key) => {
            return { conversation: 'Nino Nakano está procesando...' };
        }
    });

    if (method === '1' && !nino.authState.creds.registered) {
        const phoneNumber = await question(chalk.cyan('\nIngresa tu número (ej: 573123456789):\n> '));
        const numeroLimpio = phoneNumber.replace(/[^0-9]/g, '');

        setTimeout(async () => {
            try {
                let code = await nino.requestPairingCode(numeroLimpio);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(chalk.white('\nTU CÓDIGO: ') + chalk.hex('#FF69B4').bold(code) + '\n');
            } catch (err) {
                console.log(chalk.red('\nError al generar código: '), err.message);
            }
        }, 3000); 
    }

    nino.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

            // 🛡️ PARCHE 4: Si el error es Bad MAC o Sesión inválida, borramos y reiniciamos
            if (reason === DisconnectReason.loggedOut || reason === 411) { 
                console.log(chalk.red.bold(`\n❌ Error crítico (Bad MAC). Limpiando sesión...`)); 
                fs.rmSync('./session_nino', { recursive: true, force: true });
                process.exit(0);
            } 
            else {
                console.log(chalk.yellow(`\n🔄 Reconectando...`));
                setTimeout(() => startNino(), 5000);
            }
        } else if (connection === 'open') {
            console.log(chalk.hex('#FF69B4').bold('\n🦋 ¡Nino Nakano está lista! Ya puedes enviar comandos. 🦋\n'));
        }
    });

    nino.ev.on('creds.update', saveCreds);

    nino.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m) return;
            // 🛡️ PARCHE 5: Si el mensaje no se puede descifrar, lo ignoramos para no tirar error
            if (m.messageStubType) return; 
            
            await handler(nino, chatUpdate);
        } catch (err) {
            console.error(chalk.red('Error en Handler:'), err.message);
        }
    });
}

startNino();
