// Agregar metadata EXIF al webp (info del pack visible en WhatsApp) - VERSIÓN CORREGIDA
const addExif = async (webpBuffer, packName, authorName) => {
    try {
        const json = JSON.stringify({
            'sticker-pack-id': 'nino_' + Date.now(),
            'sticker-pack-name': packName,
            'sticker-pack-publisher': authorName,
            'emojis': ['🦋']
        })

        const jsonBuf = Buffer.from(json, 'utf8')

        // Header EXIF correcto para WhatsApp (con offset 0x16)
        const exifHeader = Buffer.from([
            0x49, 0x49, 0x2A, 0x00, // TIFF little-endian
            0x08, 0x00, 0x00, 0x00,
            0x01, 0x00,
            0x41, 0x57,
            0x07, 0x00
        ])

        const countBuf = Buffer.alloc(4)
        countBuf.writeUInt32LE(jsonBuf.length, 0)

        const offsetBuf = Buffer.alloc(4)
        offsetBuf.writeUInt32LE(0x16, 0)   // ← Este era el dato que faltaba

        const exifData = Buffer.concat([exifHeader, countBuf, offsetBuf, jsonBuf])

        // Crear chunk EXIF
        const exifChunkName = Buffer.from('EXIF')
        const exifChunkSize = Buffer.alloc(4)
        exifChunkSize.writeUInt32LE(exifData.length, 0)

        let added = Buffer.concat([
            exifChunkName,
            exifChunkSize,
            exifData
        ])

        // Padding WebP (obligatorio si es impar)
        if (exifData.length % 2 === 1) {
            added = Buffer.concat([added, Buffer.from([0])])
        }

        let result = Buffer.concat([webpBuffer, added])

        // Actualizar tamaño RIFF
        result.writeUInt32LE(result.length - 8, 4)

        return result
    } catch (e) {
        console.error('[EXIF ERROR]', e.message)
        return webpBuffer
    }
}