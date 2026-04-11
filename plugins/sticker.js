// Agregar metadata EXIF al webp (info del pack visible en WhatsApp) - VERSIÓN FINAL
const addExif = async (webpBuffer, packName, authorName) => {
    try {
        const json = JSON.stringify({
            'sticker-pack-id': 'nino_' + Date.now(),
            'sticker-pack-name': packName,
            'sticker-pack-publisher': authorName,
            'emojis': ['🦋']
        })

        const jsonBuf = Buffer.from(json, 'utf8')

        // Header EXIF correcto para WhatsApp
        const exifHeader = Buffer.from([
            0x49, 0x49, 0x2A, 0x00,
            0x08, 0x00, 0x00, 0x00,
            0x01, 0x00,
            0x41, 0x57,
            0x07, 0x00
        ])

        const countBuf = Buffer.alloc(4)
        countBuf.writeUInt32LE(jsonBuf.length, 0)

        const offsetBuf = Buffer.alloc(4)
        offsetBuf.writeUInt32LE(0x16, 0)

        let exifData = Buffer.concat([exifHeader, countBuf, offsetBuf, jsonBuf])

        // === FIX IMPORTANTE: padding correcto (WebP requiere longitud par) ===
        let chunkData = exifData
        if (chunkData.length % 2 === 1) {
            chunkData = Buffer.concat([chunkData, Buffer.from([0x00])])
        }

        const exifChunkName = Buffer.from('EXIF')
        const exifChunkSize = Buffer.alloc(4)
        exifChunkSize.writeUInt32LE(chunkData.length, 0)   // tamaño con padding incluido

        const added = Buffer.concat([
            exifChunkName,
            exifChunkSize,
            chunkData
        ])

        let result = Buffer.concat([webpBuffer, added])

        // Actualizar tamaño RIFF del archivo WebP
        result.writeUInt32LE(result.length - 8, 4)

        return result
    } catch (e) {
        console.error('[EXIF ERROR]', e.message)
        return webpBuffer
    }
}