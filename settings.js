import fs from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import path from 'path'

// ————————————————————————————————————————————————————————————————————
// CONFIGURACIÓN DE IDENTIDAD 🦋
// ————————————————————————————————————————————————————————————————————

global.botName = 'Nino Nakano'
global.ownerName = 'Z0RT SYSTEMS & Félix'
global.botVersion = '1.0.0'

// LISTA DE DUEÑOS AUTORIZADOS (Números sin @s.whatsapp.net)
global.owner = [
  ['573107400303', 'Aarom Owner', true],
  ['573508941325', 'Félix Colab', true]
]

// Nota: Mantengo esta para compatibilidad con tus plugins antiguos
global.owners = ['573107400303', '573508941325'] 

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
    botAdmin: 'Primero hazme administradora si quieres que haga el trabajo por ti. 😒'
}

// ————————————————————————————————————————————————————————————————————
// AUTO-RELOAD (Actualización en tiempo real)
// ————————————————————————————————————————————————————————————————————

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

fs.watchFile(__filename, () => {
    fs.unwatchFile(__filename)
    console.log(chalk.magentaBright('¡Actualizado settings.js! 🦋'))
})
