const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { Boom } = require('@hapi/boom');
const handler = require('./handler');
require('./settings');

// Logger en nivel 'silent' para evitar spam en la terminal y mantener el consumo de CPU bajo
const logger = pino({ level: 'silent' });
const store = makeInMemoryStore({ logger });

async function startNinoNakano() {
    const { state, saveCreds } = await useMultiFileAuthState('./session_nino');
    const { version } = await fetchLatestBaileysVersion();

    const nino = makeWASocket({
        version,
        logger,
        printQRInTerminal: true,
        auth: state,
        browser: ['Nino Nakano Bot', 'Safari', '1.0.0'],
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return { conversation: 'Hola' };
        }
    });

    store.bind(nino.ev);

    // Prevención de errores de conexión y manejo de estado de sesión
    nino.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n🦋 Escanea el código QR para despertar a Nino...');
        }

        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            
            if (reason === DisconnectReason.badSession) {
                console.log('💢 Sesión corrupta. Borra la carpeta "session_nino" y reinicia.');
                nino.logout();
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log('🔌 Conexión cerrada. Reconectando...');
                startNinoNakano();
            } else if (reason === DisconnectReason.connectionLost) {
                console.log('📡 Conexión perdida al servidor. Reconectando...');
                startNinoNakano();
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log('⚠️ Conexión reemplazada. Otra sesión está abierta. Cerrando actual.');
                nino.logout();
            } else if (reason === DisconnectReason.loggedOut) {
                console.log('❌ Dispositivo desvinculado. Borra "session_nino" y escanea de nuevo.');
                process.exit(0);
            } else if (reason === DisconnectReason.restartRequired) {
                console.log('🔄 Reinicio requerido. Volviendo a conectar...');
                startNinoNakano();
            } else {
                console.log(`⚠️ Desconectado por motivo desconocido: ${reason}. Reconectando...`);
                startNinoNakano();
            }
        } else if (connection === 'open') {
            console.log('\n✨ Nino Nakano conectada exitosamente y lista para la acción. 💜\n');
        }
    });

    nino.ev.on('creds.update', saveCreds);

    // Delegación limpia al handler
    nino.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            await handler(nino, chatUpdate);
        } catch (err) {
            console.error('Error crítico en el handler:', err);
        }
    });
}

startNinoNakano();
