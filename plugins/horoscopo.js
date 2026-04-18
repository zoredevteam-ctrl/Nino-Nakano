/**
 * HORÓSCOPO & TAROT - NINO NAKANO
 * #horoscopo <signo> — horóscopo del día
 * #tarot — carta del tarot aleatoria
 * #prediccion — predicción random del día
 */

import { database } from '../lib/database.js'

const SIGNOS = {
    aries:       { emoji: '♈', fechas: '21 Mar - 19 Abr' },
    tauro:       { emoji: '♉', fechas: '20 Abr - 20 May' },
    geminis:     { emoji: '♊', fechas: '21 May - 20 Jun' },
    cancer:      { emoji: '♋', fechas: '21 Jun - 22 Jul' },
    leo:         { emoji: '♌', fechas: '23 Jul - 22 Ago' },
    virgo:       { emoji: '♍', fechas: '23 Ago - 22 Sep' },
    libra:       { emoji: '♎', fechas: '23 Sep - 22 Oct' },
    escorpio:    { emoji: '♏', fechas: '23 Oct - 21 Nov' },
    sagitario:   { emoji: '♐', fechas: '22 Nov - 21 Dic' },
    capricornio: { emoji: '♑', fechas: '22 Dic - 19 Ene' },
    acuario:     { emoji: '♒', fechas: '20 Ene - 18 Feb' },
    piscis:      { emoji: '♓', fechas: '19 Feb - 20 Mar' }
}

const ALIASES_SIGNOS = {
    'aries': 'aries', 'tauro': 'tauro', 'taurus': 'tauro',
    'geminis': 'geminis', 'géminis': 'geminis', 'gemini': 'geminis',
    'cancer': 'cancer', 'cáncer': 'cancer',
    'leo': 'leo', 'virgo': 'virgo',
    'libra': 'libra', 'escorpio': 'escorpio', 'scorpio': 'escorpio', 'escorpion': 'escorpio',
    'sagitario': 'sagitario', 'sagittarius': 'sagitario',
    'capricornio': 'capricornio', 'capricorn': 'capricornio',
    'acuario': 'acuario', 'aquarius': 'acuario',
    'piscis': 'piscis', 'pisces': 'piscis'
}

const HORÓSCOPOS = [
    'El universo conspira a tu favor hoy. Las decisiones que tomes resonarán por mucho tiempo.',
    'Alguien especial está pensando en ti en este momento. Ábrete a nuevas conexiones.',
    'Tu energía está en su punto más alto. Es el momento perfecto para emprender algo nuevo.',
    'Un obstáculo que parecía insuperable encontrará solución de forma inesperada hoy.',
    'La luna favorece tu intuición. Confía en tu instinto por encima de la lógica.',
    'Hoy es un día para reflexionar, no para actuar. La paciencia será tu mayor virtud.',
    'Una noticia inesperada cambiará tu perspectiva sobre algo importante en tu vida.',
    'Tu creatividad está desbordada. Aprovecha esta energía para expresarte libremente.',
    'Las relaciones personales merecen tu atención hoy. Un pequeño gesto puede cambiarlo todo.',
    'El dinero y la abundancia fluyen hacia ti. Mantén una mentalidad positiva.',
    'Alguien del pasado podría reaparecer. Decide con sabiduría si abres esa puerta.',
    'Tu intuición te guiará bien hoy. Un sueño reciente podría tener un mensaje importante.',
    'Es momento de soltar lo que ya no te sirve. La liberación trae nuevas oportunidades.',
    'Un desafío profesional te pondrá a prueba, pero saldrás fortalecido/a.',
    'La aventura te llama. Acepta una invitación que normalmente rechazarías.'
]

const CARTAS_TAROT = [
    { nombre: 'El Loco', emoji: '🃏', significado: 'Nuevos comienzos, aventura, libertad y espontaneidad. Es hora de dar un salto de fe.' },
    { nombre: 'El Mago', emoji: '🧙', significado: 'Tienes todos los recursos que necesitas. Manifestación, habilidad y poder personal.' },
    { nombre: 'La Sacerdotisa', emoji: '🌙', significado: 'Intuición, misterio y sabiduría interior. Escucha tu voz interior.' },
    { nombre: 'La Emperatriz', emoji: '👑', significado: 'Fertilidad, abundancia y creatividad. Naturaleza, maternidad y prosperidad.' },
    { nombre: 'El Emperador', emoji: '⚔️', significado: 'Autoridad, estructura y estabilidad. Liderazgo y poder mundano.' },
    { nombre: 'El Sumo Sacerdote', emoji: '📿', significado: 'Tradición, conformidad y espiritualidad. Busca consejo en la sabiduría establecida.' },
    { nombre: 'Los Enamorados', emoji: '💕', significado: 'Amor, armonía y relaciones. Una elección importante se aproxima.' },
    { nombre: 'El Carro', emoji: '🏆', significado: 'Control, determinación y victoria. Mantén el rumbo con disciplina.' },
    { nombre: 'La Justicia', emoji: '⚖️', significado: 'Verdad, equidad y ley. Las acciones tienen consecuencias justas.' },
    { nombre: 'El Ermitaño', emoji: '🕯️', significado: 'Introspección, búsqueda interior y soledad productiva. Busca tu luz interior.' },
    { nombre: 'La Rueda de la Fortuna', emoji: '🎡', significado: 'Cambio, ciclos y destino. La buena suerte llega cuando menos se espera.' },
    { nombre: 'La Fuerza', emoji: '🦁', significado: 'Coraje, persuasión y control. Tu fuerza interior es mayor de lo que crees.' },
    { nombre: 'El Colgado', emoji: '🌀', significado: 'Pausa, rendición y perspectiva nueva. A veces hay que detenerse para ver más claro.' },
    { nombre: 'La Muerte', emoji: '🌑', significado: 'Transformación, finales y cambio. Algo termina para dar paso a algo mejor.' },
    { nombre: 'La Templanza', emoji: '✨', significado: 'Equilibrio, moderación y paciencia. Encuentra el término medio en todo.' },
    { nombre: 'El Diablo', emoji: '🔗', significado: 'Atadura, materialismo y sombra. Cuestiona qué te tiene encadenado/a.' },
    { nombre: 'La Torre', emoji: '⚡', significado: 'Cambio repentino, caos y revelación. Una estructura obsoleta debe derrumbarse.' },
    { nombre: 'La Estrella', emoji: '⭐', significado: 'Esperanza, inspiración y serenidad. Un período de renovación y paz se acerca.' },
    { nombre: 'La Luna', emoji: '🌕', significado: 'Ilusión, miedo y el subconsciente. No todo es lo que parece. Confía en tu intuición.' },
    { nombre: 'El Sol', emoji: '☀️', significado: 'Felicidad, vitalidad y éxito. Un período brillante y positivo te espera.' },
    { nombre: 'El Juicio', emoji: '📯', significado: 'Reflexión, juicio y absolución. Es hora de escuchar un llamado superior.' },
    { nombre: 'El Mundo', emoji: '🌍', significado: 'Completitud, integración y logro. Has llegado al final de un ciclo importante.' }
]

const PREDICCIONES = [
    'Hoy recibirás noticias que cambiarán tu perspectiva sobre algo importante 🌟',
    'Una persona inesperada se convertirá en una figura clave en tu vida pronto 🦋',
    'Tu próxima decisión importante resultará ser la correcta. Confía en ti ⭐',
    'Un sueño que creías olvidado está a punto de materializarse 🌸',
    'Alguien que conocerás pronto tiene mucho que enseñarte 📚',
    'Un obstáculo actual desaparecerá de forma natural en los próximos días 🌈',
    'Tu situación económica mejorará pronto gracias a tu esfuerzo constante 💰',
    'Una conversación pendiente que has evitado resultará mejor de lo que imaginas 💬',
    'El universo tiene preparada una sorpresa agradable para ti esta semana ✨',
    'Una habilidad que has ignorado podría convertirse en tu mayor fortaleza 🎯',
    'Alguien especial notará algo en ti que tú mismo/a no ves 💕',
    'Un viaje o cambio de ambiente te renovará completamente 🌍',
    'La paciencia que has tenido será recompensada de forma inesperada 🏆',
    'Una puerta que creías cerrada volverá a abrirse pronto 🚪',
    'Tu intuición sobre algo importante está en lo correcto. Síguela 🌙'
]

// Seed para que el horóscopo sea consistente por día
const getDaySeed = (signo) => {
    const hoy = new Date()
    const seed = `${signo}-${hoy.getFullYear()}-${hoy.getMonth()}-${hoy.getDate()}`
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i)
        hash |= 0
    }
    return Math.abs(hash)
}

const getBannerBuffer = async () => {
    try {
        const src = global.banner || ''
        if (!src) return null
        if (src.startsWith('data:image')) return Buffer.from(src.split(',')[1], 'base64')
        const res = await fetch(src)
        return Buffer.from(await res.arrayBuffer())
    } catch { return null }
}

const sendNino = async (conn, m, text) => conn.sendMessage(m.chat, {
    text,
    contextInfo: {
        externalAdReply: {
            title: `🔮 ${global.botName || 'Nino Nakano'}`,
            body: 'Horóscopo & Tarot ✨',
            thumbnail: await getBannerBuffer(),
            sourceUrl: global.rcanal || '',
            mediaType: 1,
            renderLargerThumbnail: false
        }
    }
}, { quoted: m })

let handler = async (m, { conn, command, text }) => {
    const cmd = command.toLowerCase()

    // ── #horoscopo ────────────────────────────────────────────────────────────
    if (cmd === 'horoscopo' || cmd === 'horóscopo') {
        const signoInput = (text || '').toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

        if (!signoInput) {
            const lista = Object.entries(SIGNOS)
                .map(([s, d]) => `${d.emoji} *${s.charAt(0).toUpperCase() + s.slice(1)}* — ${d.fechas}`)
                .join('\n')
            return sendNino(conn, m,
                `🔮 *HORÓSCOPO DEL DÍA*\n\n` +
                `Escribe tu signo para ver tu horóscopo:\n\n${lista}\n\n` +
                `Ejemplo: *#horoscopo aries* 🦋`
            )
        }

        const signoKey = ALIASES_SIGNOS[signoInput]
        if (!signoKey) return sendNino(conn, m, `❌ Signo no reconocido. Escribe *#horoscopo* para ver la lista. 🦋`)

        const signo   = SIGNOS[signoKey]
        const seed    = getDaySeed(signoKey)
        const horo    = HORÓSCOPOS[seed % HORÓSCOPOS.length]
        const amor    = HORÓSCOPOS[(seed + 3) % HORÓSCOPOS.length]
        const trabajo = HORÓSCOPOS[(seed + 7) % HORÓSCOPOS.length]
        const suerte  = (seed % 9) + 1

        const fecha = new Date().toLocaleDateString('es-CO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'America/Bogota'
        })

        return sendNino(conn, m,
            `${signo.emoji} *HORÓSCOPO — ${signoKey.toUpperCase()}*\n` +
            `📅 ${fecha}\n\n` +
            `🌟 *General:*\n${horo}\n\n` +
            `💕 *Amor:*\n${amor}\n\n` +
            `💼 *Trabajo:*\n${trabajo}\n\n` +
            `🍀 *Número de la suerte:* ${suerte}\n\n` +
            `> _Recuerda: el destino está en tus manos_ 🦋`
        )
    }

    // ── #tarot ────────────────────────────────────────────────────────────────
    if (cmd === 'tarot') {
        const sender = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
        const user   = database.getUser(sender)
        const ahora  = Date.now()
        const hoy    = new Date().toDateString()

        if (user.lastTarot === hoy) {
            return sendNino(conn, m,
                `🃏 *TAROT*\n\n` +
                `Ya consultaste el tarot hoy, ${m.pushName || 'querido/a'}~\n\n` +
                `Las cartas solo revelan sus secretos una vez por día. 🌙\n` +
                `_Vuelve mañana para una nueva lectura_ 🦋`
            )
        }

        user.lastTarot = hoy

        const carta    = CARTAS_TAROT[Math.floor(Math.random() * CARTAS_TAROT.length)]
        const consejo  = PREDICCIONES[Math.floor(Math.random() * PREDICCIONES.length)]
        const invertida = Math.random() < 0.3 // 30% chance de estar invertida

        return sendNino(conn, m,
            `🃏 *LECTURA DE TAROT*\n\n` +
            `Tu carta del día es...\n\n` +
            `${carta.emoji} *${carta.nombre}*${invertida ? ' _(Invertida)_' : ''}\n\n` +
            `📖 *Significado:*\n${invertida ? `_(Invertida)_ El reverso de esta carta sugiere: resistencia interna, bloqueos o energía reprimida relacionada con...` : ''}${carta.significado}\n\n` +
            `💫 *Consejo del universo:*\n${consejo}\n\n` +
            `> _Las cartas iluminan el camino, tú decides si caminar_ 🦋`
        )
    }

    // ── #prediccion ───────────────────────────────────────────────────────────
    if (cmd === 'prediccion' || cmd === 'predicción') {
        const sender = (m.sender || '').split('@')[0].split(':')[0] + '@s.whatsapp.net'
        const user   = database.getUser(sender)
        const hoy    = new Date().toDateString()

        if (user.lastPrediccion === hoy) {
            return sendNino(conn, m,
                `🔮 *PREDICCIÓN*\n\n` +
                `Ya recibiste tu predicción de hoy~\n\n` +
                `_El oráculo solo habla una vez por día. Vuelve mañana_ 🌙🦋`
            )
        }

        user.lastPrediccion = hoy

        const prediccion = PREDICCIONES[Math.floor(Math.random() * PREDICCIONES.length)]

        return sendNino(conn, m,
            `🔮 *PREDICCIÓN DEL DÍA*\n\n` +
            `${m.pushName || 'Querido/a'}, el oráculo habla para ti...\n\n` +
            `✨ *${prediccion}*\n\n` +
            `> _Una predicción por día. El universo tiene sus tiempos_ 🦋`
        )
    }
}

handler.command = ['horoscopo', 'horóscopo', 'tarot', 'prediccion', 'predicción']
export default handler