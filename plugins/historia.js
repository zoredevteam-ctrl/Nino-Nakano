/**
 * HISTORIA - NINO NAKANO
 * Historia interactiva de Kira con toma de decisiones
 * Comandos: #historia, #kira, #story
 * Sistema: Botones de Baileys con fallback a lista numerada
 *
 * Flujo:
 *  #historia          → Inicio de la historia
 *  #historia 1/2/3    → Elige una opción
 *  #historia reset    → Reinicia desde el principio
 */

// ─── HISTORIA: NODOS ──────────────────────────────────────────────────────────
// Cada nodo tiene: texto, opciones y a qué nodo lleva cada opción

const HISTORIA = {

    // ══════════════════ INICIO ══════════════════
    inicio: {
        titulo: '🌙 El Cuaderno de la Muerte',
        texto:
            'Un lunes cualquiera. Llueve sobre Tokio.\n\n' +
            'Eres *Light Yagami*, estudiante modelo, el mejor de tu generación.\n' +
            'Mientras caminas por el patio del instituto, ves caer algo del cielo.\n\n' +
            'Un cuaderno negro. En la portada dice:\n\n' +
            '> *"DEATH NOTE — el humano cuyo nombre sea escrito en este cuaderno... morirá."*\n\n' +
            'Lo recoges. Sientes su peso. Real. Frío.\n' +
            'Esa noche, en tu cuarto, lo abres.',
        opciones: [
            { texto: '✍️ Escribir un nombre criminal', siguiente: 'primer_uso' },
            { texto: '🔥 Quemarlo sin usarlo',         siguiente: 'quemar' },
            { texto: '🔍 Investigar su origen',        siguiente: 'investigar' }
        ]
    },

    // ══════════════════ RAMA: PRIMER USO ══════════════════
    primer_uso: {
        titulo: '💀 El Primer Nombre',
        texto:
            'Buscas en las noticias. Un asesino en serie. *Kurou Otoharada*.\n' +
            '40 rehenes en un jardín de infantes. La policía no puede hacer nada.\n\n' +
            'Escribes su nombre.\n' +
            'Cuarenta segundos después... paro cardíaco.\n\n' +
            'Lo viste en televisión en directo.\n' +
            'Funciona.\n\n' +
            'Ryuk aparece en tu habitación, sonriendo.\n' +
            '*"Interesante. ¿Y ahora qué harás, Light?"*\n\n' +
            'El poder es real. El mundo puede cambiar. *Tú* puedes cambiarlo.',
        opciones: [
            { texto: '👑 Convertirme en el dios del nuevo mundo', siguiente: 'kira_nace' },
            { texto: '😨 Detenerme. Fue un error.',               siguiente: 'arrepentimiento' },
            { texto: '🤝 Buscar aliados para hacer esto bien',    siguiente: 'buscar_aliados' }
        ]
    },

    // ══════════════════ RAMA: QUEMAR ══════════════════
    quemar: {
        titulo: '🔥 El Cuaderno Arde',
        texto:
            'Lo lanzas a la chimenea.\n' +
            'Las páginas arden lentamente. Negro sobre negro.\n\n' +
            'Crees que terminó.\n\n' +
            'Pero a las 3 AM, Ryuk aparece en tu habitación de todas formas.\n' +
            'Sentado en tu silla. Masticando manzanas.\n\n' +
            '*"El cuaderno no se destruye tan fácil, muchacho.\n' +
            'Además... ya lo tocaste. Ya me perteneces."*\n\n' +
            'En tu escritorio, intacto, el cuaderno.',
        opciones: [
            { texto: '😤 Enfrentarme a Ryuk',        siguiente: 'enfrentar_ryuk' },
            { texto: '📖 Aceptarlo y escuchar',       siguiente: 'escuchar_ryuk' },
            { texto: '🏃 Salir corriendo de la casa', siguiente: 'huir' }
        ]
    },

    // ══════════════════ RAMA: INVESTIGAR ══════════════════
    investigar: {
        titulo: '🔍 La Verdad del Cuaderno',
        texto:
            'No eres impulsivo. Primero, información.\n\n' +
            'Pasas tres días estudiando el cuaderno.\n' +
            'Las reglas son claras: nombre + rostro = muerte.\n' +
            'Sin nombre completo, no funciona.\n\n' +
            'Ryuk aparece al cuarto día.\n' +
            '*"Eres el primero en no usarlo de inmediato.\n' +
            'Curioso. ¿Qué esperas, Light?"*\n\n' +
            'Tu mente analítica ya calculó todo:\n' +
            'con esto podrías eliminar solo a los culpables.\n' +
            'Crear un mundo sin crimen.',
        opciones: [
            { texto: '⚖️ Usarlo solo con criminales probados', siguiente: 'kira_justo' },
            { texto: '🤝 Contactar a un detective para entregarlo', siguiente: 'contactar_l' },
            { texto: '🔒 Guardarlo como último recurso',           siguiente: 'guardar' }
        ]
    },

    // ══════════════════ KIRA NACE ══════════════════
    kira_nace: {
        titulo: '👑 Kira',
        texto:
            'Semanas después. El índice de criminalidad mundial cae un 70%.\n' +
            'Los criminales tienen miedo. El mundo tiene miedo.\n\n' +
            'En internet, millones te llaman *Kira*. Tu dios.\n\n' +
            'Pero en una oficina en Japón, un detective sin nombre\n' +
            'escribe tres letras en una pizarra:\n\n' +
            '*L*\n\n' +
            '_"Kira está en Japón. Es estudiante. Tiene acceso a información policial.\n' +
            'Y lo más importante... cree que hace el bien."_',
        opciones: [
            { texto: '🧠 Acepto el reto. Voy a eliminar a L.',     siguiente: 'vs_l' },
            { texto: '😰 L me asusta. Debo ser más cuidadoso.',    siguiente: 'prudencia' },
            { texto: '💭 ¿Y si L tiene razón sobre mí?',           siguiente: 'duda_moral' }
        ]
    },

    // ══════════════════ VS L ══════════════════
    vs_l: {
        titulo: '🎭 El Duelo',
        texto:
            'Meses de ajedrez mental.\n' +
            'L sospecha de ti. Tú lo sabes. Él sabe que lo sabes.\n\n' +
            'Un día, L te invita a unirte a su equipo de investigación.\n' +
            'Para tenerte cerca. Para observarte.\n\n' +
            'Te sientas frente a él por primera vez.\n' +
            'Descalzo. Un pedazo de azúcar en la boca. Ojos sin dormir.\n\n' +
            '*"Light Yagami. Probabilidad de ser Kira: 5%.\n' +
            'Pero eres el sospechoso más interesante que he tenido."*\n\n' +
            'Sonríes. Él sonríe.\n' +
            'El juego comienza.',
        opciones: [
            { texto: '🏆 Gané. L muere. Soy el dios del nuevo mundo.', siguiente: 'final_victoria' },
            { texto: '💔 Perdí. L me atrapa.',                          siguiente: 'final_derrota' },
            { texto: '🌅 Me rindo. Confieso todo.',                     siguiente: 'final_confesion' }
        ]
    },

    // ══════════════════ FINALES ══════════════════
    final_victoria: {
        titulo: '🌍 El Dios del Nuevo Mundo',
        texto:
            'L muere.\n' +
            'Su nombre, escrito en el cuaderno.\n' +
            'Sus últimas palabras fueron para ti.\n\n' +
            'El mundo que soñaste existe ahora.\n' +
            'El crimen es casi inexistente.\n' +
            'Los gobiernos te temen. Los pueblos te adoran.\n\n' +
            'Pero estás solo.\n' +
            'Ryuk te observa desde la esquina, aburrido.\n\n' +
            '*"¿Y ahora qué, Light?\n' +
            'Ya no hay nadie con quien jugar."*\n\n' +
            '〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n' +
            '🏁 *FIN — VICTORIA DE KIRA*\n' +
            '_¿Querías un mundo perfecto... o solo querías ganar?_\n' +
            '〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️',
        opciones: [
            { texto: '🔄 Jugar de nuevo', siguiente: 'inicio' }
        ]
    },

    final_derrota: {
        titulo: '⛓️ El Final de Kira',
        texto:
            'L lo tenía todo.\n' +
            'Solo esperaba el momento correcto.\n\n' +
            'Esposado. Bajo la lluvia. Rodeado de policías.\n' +
            'La máscara cae. Light Yagami llora.\n\n' +
            'No por miedo. Por rabia.\n' +
            '*"¡Yo tenía razón! ¡El mundo necesitaba a Kira!"*\n\n' +
            'Ryuk te mira por última vez.\n' +
            'Saca su cuaderno. Escribe algo.\n\n' +
            '*"Prometí escribir tu nombre al final, ¿recuerdas?"*\n\n' +
            '〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n' +
            '🏁 *FIN — KIRA CAE*\n' +
            '_La justicia sin límites se convierte en tiranía._\n' +
            '〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️',
        opciones: [
            { texto: '🔄 Jugar de nuevo', siguiente: 'inicio' }
        ]
    },

    final_confesion: {
        titulo: '🌅 La Redención',
        texto:
            'Dejas el cuaderno sobre la mesa de L.\n\n' +
            'Sin palabras. Sin excusas.\n\n' +
            'L te mira durante largo tiempo.\n' +
            '_"¿Sabes cuántas personas habrías salvado\n' +
            'si hubieras pedido ayuda desde el principio?"_\n\n' +
            'No tienes respuesta.\n\n' +
            'Ryuk recoge el cuaderno. Desaparece.\n' +
            'El mundo sigue girando.\n' +
            'Tú también.\n\n' +
            '〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n' +
            '🏁 *FIN — REDENCIÓN*\n' +
            '_El poder verdadero está en saber cuándo soltarlo._\n' +
            '〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️',
        opciones: [
            { texto: '🔄 Jugar de nuevo', siguiente: 'inicio' }
        ]
    },

    // ══════════════════ NODOS SECUNDARIOS ══════════════════
    arrepentimiento: {
        titulo: '😨 El Peso de la Culpa',
        texto:
            'Un hombre murió por tu mano.\n' +
            'Era un criminal. Pero igual murió por ti.\n\n' +
            'Ryuk ríe en el techo.\n' +
            '*"Demasiado tarde para arrepentirse, ¿no crees?\n' +
            'Ya lo usaste. Ya sabes que funciona."*\n\n' +
            'El cuaderno sigue ahí. Esperando.',
        opciones: [
            { texto: '👑 Está hecho. Seguir adelante como Kira.', siguiente: 'kira_nace' },
            { texto: '🌅 Entregarlo a la policía.',               siguiente: 'final_confesion' }
        ]
    },

    buscar_aliados: {
        titulo: '🤝 Los Aliados de Kira',
        texto:
            'Misa Amane.\n' +
            'Actriz. Fan incondicional de Kira.\n' +
            'Tiene su propio Death Note.\n\n' +
            'Te encuentra antes de que tú la encuentres.\n' +
            '*"Haré todo lo que digas, Light.\n' +
            'Todo."*\n\n' +
            'Con dos Death Notes y dos pares de ojos Shinigami,\n' +
            'el poder se duplica. Y el riesgo también.',
        opciones: [
            { texto: '🧠 Acepto el reto. Voy a eliminar a L.', siguiente: 'vs_l' },
            { texto: '😰 Demasiado peligroso. Actuar solo.',   siguiente: 'kira_nace' }
        ]
    },

    enfrentar_ryuk: {
        titulo: '😤 Frente al Shinigami',
        texto:
            'Te plansas frente a Ryuk.\n' +
            '*"¿Qué eres? ¿Qué quieres de mí?"*\n\n' +
            'Ryuk se encoge de hombros.\n' +
            '*"Yo solo vine a divertirme.\n' +
            'Los humanos con el Death Note son... entretenidos.\n' +
            'Nada más."*\n\n' +
            'No es tu enemigo. No es tu aliado.\n' +
            'Solo un espectador con palomitas.',
        opciones: [
            { texto: '📖 Aceptarlo y escuchar las reglas.', siguiente: 'escuchar_ryuk' },
            { texto: '✍️ Usar el cuaderno ya.',             siguiente: 'primer_uso' }
        ]
    },

    escuchar_ryuk: {
        titulo: '📖 Las Reglas del Shinigami',
        texto:
            'Ryuk te explica todo.\n\n' +
            '> El dueño del Death Note no puede ir al cielo ni al infierno.\n' +
            '> Si entregas el cuaderno, pierdes la memoria de todo.\n' +
            '> Al final, Ryuk escribirá tu nombre.\n\n' +
            '*"¿Seguirás usándolo?"*',
        opciones: [
            { texto: '👑 Sí. Voy a cambiar el mundo.',      siguiente: 'kira_nace' },
            { texto: '🌅 No. Entregarlo vale más.',         siguiente: 'final_confesion' }
        ]
    },

    huir: {
        titulo: '🏃 No Puedes Huir',
        texto:
            'Corres. La calle. El frío.\n\n' +
            'Ryuk aparece frente a ti en la esquina.\n' +
            '*"¿A dónde vas? El cuaderno viaja contigo.\n' +
            'Siempre."*\n\n' +
            'Te detienes. Llueve.\n' +
            'No hay salida fácil.',
        opciones: [
            { texto: '😤 Enfrentarlo de una vez.',         siguiente: 'enfrentar_ryuk' },
            { texto: '📖 Aceptar la situación.',           siguiente: 'escuchar_ryuk' }
        ]
    },

    kira_justo: {
        titulo: '⚖️ La Justicia Tiene Límites',
        texto:
            'Solo criminales confirmados. Solo los peores.\n' +
            'Tu código es estricto.\n\n' +
            'Pero L aparece de todas formas.\n' +
            'La justicia sin proceso sigue siendo ejecución.',
        opciones: [
            { texto: '🧠 Enfrentarme a L.', siguiente: 'vs_l' },
            { texto: '💭 Reconsiderar todo.', siguiente: 'duda_moral' }
        ]
    },

    contactar_l: {
        titulo: '🤝 El Detective',
        texto:
            'Contactas a L de forma anónima.\n' +
            'Le dices que tienes información sobre el Death Note.\n\n' +
            'L responde en segundos.\n' +
            '*"Interesante. Nos vemos."*\n\n' +
            'Ya es tarde para dar marcha atrás.',
        opciones: [
            { texto: '🌅 Entregarlo todo. Confesar.',     siguiente: 'final_confesion' },
            { texto: '🎭 Jugar su juego. Ver qué sabe.', siguiente: 'vs_l' }
        ]
    },

    guardar: {
        titulo: '🔒 El Cuaderno Espera',
        texto:
            'Lo guardas. Lo olvidas.\n' +
            'Meses después, un criminal mata a tu hermana.\n\n' +
            'El cuaderno sigue en el cajón.\n' +
            'Ryuk no dice nada. Solo espera.',
        opciones: [
            { texto: '✍️ Usarlo. Esta vez sí.',          siguiente: 'primer_uso' },
            { texto: '🔥 Destruirlo de una vez.',        siguiente: 'quemar' }
        ]
    },

    prudencia: {
        titulo: '😰 Las Sombras',
        texto:
            'Reduces la frecuencia. Cambias patrones.\n' +
            'L no puede probarlo.\n\n' +
            'Pero Near y Mello ya están en camino.\n' +
            'Más jóvenes. Más hambrientos.\n\n' +
            '*"Kira no puede esconderse para siempre."*',
        opciones: [
            { texto: '🏆 Eliminarlos antes de que lleguen.', siguiente: 'final_victoria' },
            { texto: '🌅 Rendirse. Ya fue suficiente.',      siguiente: 'final_confesion' }
        ]
    },

    duda_moral: {
        titulo: '💭 ¿Monstruo o Dios?',
        texto:
            'Por primera vez, dudas.\n\n' +
            'Ryuk te observa desde el techo.\n' +
            '*"Los humanos son raros. Tienen poder y aun así preguntan\n' +
            'si deben usarlo."*\n\n' +
            'Afuera, el mundo sigue siendo imperfecto.\n' +
            'Adentro, tú también.',
        opciones: [
            { texto: '👑 El fin justifica los medios. Seguir.',  siguiente: 'kira_nace' },
            { texto: '🌅 No soy dios. Terminar con esto.',       siguiente: 'final_confesion' },
            { texto: '⚖️ Buscar un sistema más justo.',          siguiente: 'contactar_l' }
        ]
    }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Intenta enviar botones de Baileys; si falla, envía lista numerada
const enviarNodo = async (conn, m, nodo, jid) => {
    const thumb = await global.getBannerThumb()
    const ctx   = global.getNewsletterCtx(thumb, '📖 ' + nodo.titulo, global.botName + ' Historia')

    const esFinal = nodo.opciones.length === 1 && nodo.opciones[0].siguiente === 'inicio'

    const textoCompleto =
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '📖 *' + nodo.titulo + '*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        nodo.texto + '\n\n' +
        (esFinal ? '' :
            '───────────────────\n' +
            '*¿Qué decides?*\n\n' +
            nodo.opciones.map((op, i) => `*${i + 1}.* ${op.texto}`).join('\n') + '\n\n' +
            '_Responde con el número de tu elección_\n' +
            '_Ej: *' + global.prefix + 'historia 1*_'
        )

    // Intentar botones primero
    try {
        const botones = nodo.opciones.map((op, i) => ({
            buttonId: 'historia_' + (i + 1),
            buttonText: { displayText: op.texto },
            type: 1
        }))

        await conn.sendMessage(jid, {
            text: textoCompleto,
            buttons: botones,
            headerType: 1,
            contextInfo: ctx
        }, { quoted: m })

    } catch {
        // Fallback: texto con lista numerada (compatible con todos los bots)
        await conn.sendMessage(jid, {
            text: textoCompleto,
            contextInfo: ctx
        }, { quoted: m })
    }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

let handler = async (m, { conn, text, args }) => {
    const jid      = m.chat
    const input    = (text || '').trim().toLowerCase()

    // Cargar estado del jugador (por JID de chat)
    if (!global._historiaState) global._historiaState = {}
    const estado = global._historiaState

    // Reset
    if (input === 'reset' || input === 'reiniciar') {
        delete estado[jid]
        await m.react('🔄')
        await enviarNodo(conn, m, HISTORIA['inicio'], jid)
        estado[jid] = 'inicio'
        return
    }

    // Sin estado previo o comando sin argumento → mostrar inicio
    if (!input || !estado[jid]) {
        await enviarNodo(conn, m, HISTORIA['inicio'], jid)
        estado[jid] = 'inicio'
        return
    }

    // El usuario eligió un número
    const opcion = parseInt(input)
    const nodoActual = HISTORIA[estado[jid]]

    if (!nodoActual) {
        delete estado[jid]
        await enviarNodo(conn, m, HISTORIA['inicio'], jid)
        estado[jid] = 'inicio'
        return
    }

    if (isNaN(opcion) || opcion < 1 || opcion > nodoActual.opciones.length) {
        const thumb = await global.getBannerThumb()
        const ctx   = global.getNewsletterCtx(thumb, '⚠️ Opción inválida', global.botName)
        return conn.sendMessage(jid, {
            text:
                '⚠️ Elige una opción válida:\n\n' +
                nodoActual.opciones.map((op, i) => `*${i + 1}.* ${op.texto}`).join('\n') + '\n\n' +
                '_Ejemplo: *' + global.prefix + 'historia 1*_',
            contextInfo: ctx
        }, { quoted: m })
    }

    // Avanzar al siguiente nodo
    const siguiente = nodoActual.opciones[opcion - 1].siguiente
    const nodoSig   = HISTORIA[siguiente]

    if (!nodoSig) {
        delete estado[jid]
        return
    }

    estado[jid] = siguiente

    // Si el siguiente es inicio (reset desde final), limpiar estado
    if (siguiente === 'inicio') {
        delete estado[jid]
    }

    await enviarNodo(conn, m, nodoSig, jid)
}

handler.command = ['historia', 'kira', 'story', 'deathnote']
export default handler
