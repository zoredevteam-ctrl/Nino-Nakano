import fs from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import path from 'path'

// ————————————————————————————————————————————————————————————————————
// CONFIGURACIÓN DE IDENTIDAD 🦋
// ————————————————————————————————————————————————————————————————————

global.botName = 'Nino Nakano'
global.ownerName = 'Z0RT SYSTEMS & Félix'
global.botVersion = '1.0.1'

// LISTA DE DUEÑOS AUTORIZADOS (Números sin @s.whatsapp.net)
// [ Número, Nombre, ¿Es Owner real? ]
global.owner = [
  ['573107400303', 'Aarom Owner', true],
  ['573508941325', 'Félix Colab', true]
]

// Compatibilidad con sistemas que usan arrays simples
global.owners = global.owner.map(v => v[0]) 

global.prefix = '#'

// ————————————————————————————————————————————————————————————————————
// ENLACES Y VISUALES 🎀
// ————————————————————————————————————————————————————————————————————

global.rcanal = 'https://whatsapp.com/channel/0029Vb6p68rF6smrH4Jeay3Y'
global.banner = 'https://evogb.win/Nakano_Menu' 

// ————————————————————————————————————————————————————————————————————
// MENSAJES DE SISTEMA (Estilo Tsundere 🦋)
// ————————————————————————————————————————————————————————————————————

global.mess = {
    wait: 'Un momento, no me apresures... 🦋',
    success: '¡Listo! Qué fácil fue. ✨',
    error: 'Ugh, algo salió mal en el código. Revísalo, tonto. 💢',
    owner: '¿Y tú quién eres? Este comando es solo para mi creador. 😤',
    group: '¡Oye! Esto solo funciona en grupos. 🙄',
    admin: '¿Quién te crees? Solo los administradores pueden hacer esto. 💅',
    botAdmin: 'Primero hazme administradora si quieres que haga el trabajo por ti. 😒',
    restrict: 'Esta función está desactivada por ahora. 🔒'
}

// ————————————————————————————————————————————————————————————————————
// AUTO-RELOAD (Actualización en tiempo real)
// ————————————————————————————————————————————————————————————————————

const __filename = fileURLToPath(import.meta.url)

fs.watchFile(__filename, async () => {
    try {
        console.log(chalk.magentaBright('\n🦋 ¡Detectado cambio en settings.js! Re-cargando...'))
        // El bot se actualizará solo sin necesidad de reiniciar Termux
    } catch (e) {
        console.error(chalk.red('[!] Error al recargar settings.js:'), e)
    }
})

export default global
