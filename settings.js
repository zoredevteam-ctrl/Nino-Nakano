import fs from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import path from 'path'

// ————————————————————————————————————————————————————————————————————
// CONFIGURACIÓN DE IDENTIDAD 🦋
// ————————————————————————————————————————————————————————————————————

global.botName = 'Nino Nakano'
global.ownerName = '𝓐𝓪𝓻𝓸𝓶 𝓞𝔀𝓷𝓮𝓻 🦋' // Todo el crédito para ti
global.botVersion = '1.0.5'

/**
 * LISTA DE DUEÑOS AUTORIZADOS 👑
 * Solo tú y Félix. Nadie más tiene permiso para tocar mis archivos.
 */
global.owner = [
  ['573107400303', 'Aarom 🦋', true],
  ['573508941325', 'Félix ⚡', true]
]

// Generación automática de arrays para el sistema
global.owners = global.owner.map(v => v[0]) 
global.mods = [] 
global.prems = [] 

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

const __filename = fileURLToPath(import.meta.url)

fs.watchFile(__filename, async () => {
    try {
        console.log(chalk.magentaBright('\n🦋 [SETTINGS]: Cambios guardados. Solo Aarom y Félix tienen el control ahora.'))
    } catch (e) {
        console.error(chalk.red('[!] Error en auto-reload:'), e)
    }
})

export default global
