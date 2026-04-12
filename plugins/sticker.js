// Agregar metadata EXIF al webp (info del pack visible en WhatsApp) - VERSIÓN FINAL
const addExif = async (webpBuffer, packName, authorName) => {
    try {
        const json = JSON.stringify({
            'sticker-pack-id': 'nino_' + Date.now(),
            'sticker-pack-name': packName,
            'sticker-pack-publisher': authorName,
            'emojis': ['🦋']
        });

        // Usamos el buffer para medir bytes reales, ya que los emojis como '🦋' 
        // ocupan más de 1 byte en UTF-8
        const jsonBuf = Buffer.from(json, 'utf8');

        // Header EXIF de TIFF en Little Endian
        const exifHeader = Buffer.from([
            0x49, 0x49, 0x2A, 0x00,
            0x08, 0x00, 0x00, 0x00,
            0x01, 0x00,
            0x41, 0x57,
            0x07, 0x00
        ]);

        const countBuf = Buffer.alloc(4);
        countBuf.writeUInt32LE(jsonBuf.length, 0);

        const offsetBuf = Buffer.alloc(4);
        offsetBuf.writeUInt32LE(0x16, 0);

        let exifData = Buffer.concat([exifHeader, countBuf, offsetBuf, jsonBuf]);

        // Guardamos el tamaño ORIGINAL antes de aplicar cualquier padding
        const originalExifLength = exifData.length;

        // === FIX IMPORTANTE: padding correcto ===
        let chunkData = exifData;
        if (originalExifLength % 2 === 1) {
            // Se agrega el byte físicamente al buffer
            chunkData = Buffer.concat([chunkData, Buffer.from([0x00])]);
        }

        const exifChunkName = Buffer.from('EXIF');
        const exifChunkSize = Buffer.alloc(4);
        
        // CORRECCIÓN: Escribimos el tamaño original (sin padding) en el header del chunk
        exifChunkSize.writeUInt32LE(originalExifLength, 0); 

        const added = Buffer.concat([
            exifChunkName,
            exifChunkSize,
            chunkData
        ]);

        let result = Buffer.concat([webpBuffer, added]);

        // Actualizar tamaño global RIFF del archivo WebP
        // (La longitud total del buffer menos los 8 bytes iniciales de 'RIFF' y su propio size)
        result.writeUInt32LE(result.length - 8, 4);

        return result;
    } catch (e) {
        console.error('[EXIF ERROR]', e.message);
        return webpBuffer;
    }
}
