
function saveFile(blob, filename) {
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    const a = document.createElement('a');
    document.body.appendChild(a);
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 0)
  }
}

function uint8ToBytes(n) {
    const buf = new Uint8Array(1);
    buf[0] = n;
    return buf;
}

function uint32ToBytes(n) {
    let buf = new ArrayBuffer(4);
    let view = new DataView(buf);
    view.setUint32(0, n, true);
    return new Uint8Array(buf);
}

function uint64ToBytes(n) {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    const value = typeof n === "bigint" ? n : BigInt(Math.floor(n));
    const low = Number(value & 0xFFFFFFFFn);
    const high = Number((value >> 32n) & 0xFFFFFFFFn);
    view.setUint32(0, low, true);
    view.setUint32(4, high, true);
    return new Uint8Array(buf);
}

function float32ToBytes(f) {
    const buf = new ArrayBuffer(4);
    var view = new DataView(buf);
    view.setFloat32(0, f, true);
    return new Uint8Array(buf);
}

function float64ToBytes(d) {
    const buf = new ArrayBuffer(8);
    var view = new DataView(buf);
    view.setFloat64(0, d, true);
    return new Uint8Array(buf);
}

function stringToBytes(s) {
    const utf8Encode = new TextEncoder();
    const stringBytes = utf8Encode.encode(s);
    const lengthBytes = uint32ToBytes(stringBytes.length);

    let buf = new Uint8Array(stringBytes.length + lengthBytes.length);
    let currentIndex = 0;

    for(let i=0; i < lengthBytes.length; i++) {
        buf[currentIndex++] = lengthBytes[i];
    }

    for(let i=0; i < stringBytes.length; i++) {
        buf[currentIndex++] = stringBytes[i];
    }

    return buf;
}

function hexToBytes(s) {
    return new Uint8Array(s.match(/.{2}/g).map(e => parseInt(e, 16)));
}

// CRC32 lookup table (standard polynomial 0xEDB88320)
const crc32Table = (function() {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            if (c & 1) {
                c = 0xEDB88320 ^ (c >>> 1);
            } else {
                c = c >>> 1;
            }
        }
        table[i] = c;
    }
    return table;
})();

function computeCRC32(data, offset, length) {
    let crc = 0xFFFFFFFF;
    const end = offset + length;
    for (let i = offset; i < end; i++) {
        crc = crc32Table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildAffinityPaletteBuffer(paletteData) {

    const buffers = [];
    const replaceWithFileSizeBuffers = [];
    const replaceWithFileSizeMinusFooterBuffers = [];
    const replaceWithBodySizeBuffers = [];

    const HEX_Grad = "64617247";     // 'darG'
    const HEX_Grad1 = "3164617247";  // '1darG'
    const HEX_Type = "2A65707954";   // '*epyT'
    const HEX_Fill = "6C6C6946"      // 'lliF'
    const HEX_FilG = "476C6946";     // 'GliF'
    const HEX_Posn = "6E736F50";     // 'nsoP'
    const HEX_Cols = "B1736C6F43";   // 0xB1 + 'sloC'
    const HEX_RGBA = "41424752";     // 'ABGR'
    const HEX_colD = "446C6F635F";   // 'Dloc_'
    const HEX_B1PalV = "B1566C6150"; // 0xB1 + 'VlaP'
    const HEX_PaNV = "564E6150";     // 'VNaP'
    const HEX_HashFT4  = "23465434"; // '#FT4'

    // Header constants
    const HEX_Magic = "00FF4B41";    // 00 FF 4B 41
    const HEX_Swth = "68747753";     // 'htwS'
    const HEX_HashInf = "23496E66";  // '#Inf'
    const HEX_Prot = "50726F74";     // 'Prot'
    const HEX_HashFil = "2346696C";  // '#Fil'
    const HEX_PalV = "566C6150";     // 'VlaP'
    const HEX_PlCN = "2B4E436C50";   // '+NClP'
    const c_version = 11;

    const c_headerSize = 80;
    const c_footerSize = 115;

    const HEX_DummyDatestamp = 'F8D14F64';
    const HEX_SwatchesDat = '53776174636865732E646174'; // 'Swatches.dat'

    // The header up to the end of the PlCN chunk id. After that is the palette name.
    buffers.push(hexToBytes(HEX_Magic));
    buffers.push(uint32ToBytes(c_version));
    buffers.push(hexToBytes(HEX_Swth));
    buffers.push(hexToBytes(HEX_HashInf));

    buffers.push(uint64ToBytes(0)); // (File size - footer size)
    replaceWithFileSizeMinusFooterBuffers.push(buffers.length-1);

    buffers.push(uint64ToBytes(0)); // File size
    replaceWithFileSizeBuffers.push(buffers.length-1);

    buffers.push(uint64ToBytes(0)); // Body size
    replaceWithBodySizeBuffers.push(buffers.length-1);

    buffers.push(uint64ToBytes(0));
    buffers.push(hexToBytes(HEX_DummyDatestamp));  // Unix datestamp
    buffers.push(uint32ToBytes(0));
    buffers.push(uint32ToBytes(2));
    buffers.push(uint32ToBytes(2));
    buffers.push(hexToBytes(HEX_Prot));
    buffers.push(uint32ToBytes(3));
    buffers.push(hexToBytes(HEX_HashFil));
    buffers.push(hexToBytes("00FF4B530200"));
    buffers.push(hexToBytes(HEX_PalV));
    buffers.push(hexToBytes("010014000000"));
    buffers.push(hexToBytes(HEX_PlCN));

    // Write the name of the file
    buffers.push(stringToBytes(paletteData.Name));
    // PalV
    buffers.push(hexToBytes(HEX_B1PalV));
    // Palette count
    buffers.push(uint32ToBytes(paletteData.Palettes.length));

    let firstRGBA = true;
    let firstPalette = true;
    let currentPaletteId = 0;

    for(let i=0 ; i < paletteData.Palettes.length; i++) {

        if(firstPalette) {
            //                   G  l  i  F              l  l  i  F                   *  e  p  y  T              1  d  a  r  G                    d  a  r  G
            // 01 00 00 00 00 00 47 6C 69 46 02 00 00 00 6C 6C 69 46 00 00 00 02      2A 65 70 79 54 00 00 00 00 31 64 61 72 47 01 01 00 00 00 00 64 61 72 47 01 00 00 02 A4
            buffers.push(uint8ToBytes(1));
            buffers.push(uint32ToBytes(currentPaletteId++));
            buffers.push(uint8ToBytes(0));  // Type 0 needs full FillG and Fill data
            buffers.push(hexToBytes(HEX_FilG + "02000000" + HEX_Fill + "00000002" + HEX_Type + "00000000" + HEX_Grad1 + "01"));
            buffers.push(uint32ToBytes(currentPaletteId++));
            buffers.push(uint8ToBytes(0));  // Grad type
            buffers.push(hexToBytes(HEX_Grad));
            buffers.push(hexToBytes("01000002"));   // Grad is type 0 so needs the extra "01 00 00 02" before the ending "A4"
            buffers.push(hexToBytes("A4"));
         } else {
            //                                                       G  l  i  F       *  e  p  y  T              1  d  a  r  G                    d  a  r  G
            //                            00 00 00 01 04 00 00 00 01 47 6C 69 46      2A 65 70 79 54 00 00 00 00 31 64 61 72 47 01 05 00 00 00 01 64 61 72 47 A4
            buffers.push(uint32ToBytes(16777216));
            buffers.push(uint32ToBytes(currentPaletteId++));
            buffers.push(uint8ToBytes(1));  // Type one is the compressed format without FilG and Fill values.
            buffers.push(hexToBytes(HEX_FilG + HEX_Type + "00000000" + HEX_Grad1 + "01"));
            buffers.push(uint32ToBytes(currentPaletteId++));
            buffers.push(uint8ToBytes(1));  // Grad type
            buffers.push(hexToBytes(HEX_Grad));   // Grad is type 0 so needs the extra "01 00 00 02" before the ending "A4"
            buffers.push(hexToBytes("A4"));
        }

        buffers.push(hexToBytes(HEX_Posn))  // Posn
        buffers.push(uint32ToBytes(paletteData.Palettes[i].Colours.length));

        for(let j=0 ; j < paletteData.Palettes[i].Colours.length; j++) {
            buffers.push(float64ToBytes(paletteData.Palettes[i].Colours[j].Position));

            // In Photoshop the first midpoint is ignored whereas in Affinity the last midpoint is ignored.
            // We need to bump the mid points up one to make it consistent.
            if(j == paletteData.Palettes[i].Colours.length-1) {
                buffers.push(float64ToBytes(0.5));
            } else {
                buffers.push(float64ToBytes(paletteData.Palettes[i].Colours[j+1].Midpoint));
            }
        }

        //    s  l  o  C
        // B1 73 6C 6F 43 02 00 00 00
        buffers.push(hexToBytes(HEX_Cols));
        buffers.push(uint32ToBytes(paletteData.Palettes[i].Colours.length));

        for(let j=0 ; j < paletteData.Palettes[i].Colours.length; j++) {

            // 01
            buffers.push(uint8ToBytes(1));

            if(firstRGBA) {
                //                A  G  B  R              D  l  o  c  _
                // 02 00 00 00 00 41 42 47 52 01 00 00 02 44 6C 6F 63 5F
                buffers.push(uint32ToBytes(currentPaletteId++));
                buffers.push(uint8ToBytes(0));  // Uncompressed
                buffers.push(hexToBytes(HEX_RGBA))   // AGBR
                buffers.push(hexToBytes("01000002"))   // ??
            } else {
                //                A  G  B  R  D  l  o  c  _
                // 03 00 00 00 01 41 42 47 52 44 6C 6F 63 5F
                buffers.push(uint32ToBytes(currentPaletteId++));
                buffers.push(uint8ToBytes(1));  // Compressed
                buffers.push(hexToBytes(HEX_RGBA))   // AGBR
            }

            buffers.push(hexToBytes(HEX_colD)) // Dloc_

            buffers.push(float32ToBytes(paletteData.Palettes[i].Colours[j].Red));
            buffers.push(float32ToBytes(paletteData.Palettes[i].Colours[j].Green));
            buffers.push(float32ToBytes(paletteData.Palettes[i].Colours[j].Blue));
            buffers.push(float32ToBytes(paletteData.Palettes[i].Colours[j].Alpha));

            // The last _colD entry doesn't have a 0 at the end?
            if(j != paletteData.Palettes[i].Colours.length-1) {
                buffers.push(uint8ToBytes(0));  // ??
            }

            firstRGBA = false;
        }

        firstPalette = false;
    }

    // Write 'PaNV' palette names block
    buffers.push(hexToBytes("000000AB"));   // ??
    buffers.push(hexToBytes(HEX_PaNV));

    const paletteNameByteArrays = [];

    // Create string buffers and calculate block size
    let nameBlockSize = 0;
    for(let i=0 ; i < paletteData.Palettes.length; i++) {
        const nameByteArray = stringToBytes(paletteData.Palettes[i].Name);
        paletteNameByteArrays.push(nameByteArray);
        nameBlockSize += nameByteArray.byteLength;
    }

    // Write out the block header
    buffers.push(uint32ToBytes(nameBlockSize));
    buffers.push(uint32ToBytes(paletteData.Palettes.length));

    // Write out the palette names
    for(let i=0 ; i < paletteNameByteArrays.length; i++) {
        buffers.push(paletteNameByteArrays[i]);
    }

    // End of data marker?
    buffers.push(hexToBytes("00FFFFFFFF"));

    // 115 byte footer
    buffers.push(hexToBytes(HEX_HashFT4));
    buffers.push(uint32ToBytes(0));
    buffers.push(uint32ToBytes(0));
    buffers.push(hexToBytes(HEX_DummyDatestamp));  // 32-bit Unix datestamp
    buffers.push(uint32ToBytes(0));

    buffers.push(uint64ToBytes(0)); // File Size
    replaceWithFileSizeBuffers.push(buffers.length-1);

    buffers.push(uint64ToBytes(0)); // Body size
    replaceWithBodySizeBuffers.push(buffers.length-1);

    buffers.push(uint32ToBytes(0));
    buffers.push(uint32ToBytes(0));
    buffers.push(uint32ToBytes(1));
    buffers.push(uint32ToBytes(0));
    buffers.push(uint32ToBytes(0x38));
    buffers.push(uint32ToBytes(16777216));
    buffers.push(uint32ToBytes(0));
    buffers.push(uint32ToBytes(0x48));
    buffers.push(uint32ToBytes(0));

    buffers.push(uint64ToBytes(0)); // Body size
    replaceWithBodySizeBuffers.push(buffers.length-1);

    buffers.push(uint64ToBytes(0)); // Body size
    replaceWithBodySizeBuffers.push(buffers.length-1);

    // CRC32 checksum placeholders - will be computed after merging
    const replaceWithChecksumBuffers = [];

    buffers.push(uint32ToBytes(0));  // Checksum slot 1
    replaceWithChecksumBuffers.push(buffers.length-1);
    buffers.push(hexToBytes("0014000000"));
    buffers.push(uint32ToBytes(0));  // Checksum slot 2
    replaceWithChecksumBuffers.push(buffers.length-1);
    buffers.push(hexToBytes("0C00"));
    buffers.push(hexToBytes(HEX_SwatchesDat));

    // Now that we have the file size we can fill in the references to it in the header and footer buffers

    let fileSize = 0;
    for(let i=0 ; i < buffers.length; i++) {
        fileSize += buffers[i].byteLength;
    }

    const fileSizeBuffer = uint64ToBytes(fileSize);
    const fileSizeMinusFooterBuffer = uint64ToBytes(fileSize - c_footerSize)
    const bodySizeBuffer = uint64ToBytes(fileSize - (c_footerSize + c_headerSize))

    for(let i=0 ; i < replaceWithFileSizeBuffers.length; i++) {
        buffers[replaceWithFileSizeBuffers[i]] = fileSizeBuffer;
    }

    for(let i=0 ; i < replaceWithFileSizeMinusFooterBuffers.length; i++) {
        buffers[replaceWithFileSizeMinusFooterBuffers[i]] = fileSizeMinusFooterBuffer;
    }

    for(let i=0 ; i < replaceWithBodySizeBuffers.length; i++) {
        buffers[replaceWithBodySizeBuffers[i]] = bodySizeBuffer;
    }

    var mergedBuffer = new Uint8Array(fileSize);
    let currentIndex = 0;

    for(let i=0 ; i < buffers.length; i++) {
        for(let j=0 ; j < buffers[i].byteLength; j++) {
            mergedBuffer[currentIndex++] = buffers[i][j];
        }
    }

    // Compute CRC32 checksum over bodySize bytes starting at offset (headerSize - 4)
    const bodySize = fileSize - (c_footerSize + c_headerSize);
    const crcOffset = c_headerSize - 4;  // 76
    const crc = computeCRC32(mergedBuffer, crcOffset, bodySize);
    const crcBytes = uint32ToBytes(crc);

    // Write CRC to both checksum positions in the footer
    const footerStart = fileSize - c_footerSize;
    // Checksum 1 at footer byte 88
    mergedBuffer[footerStart + 88] = crcBytes[0];
    mergedBuffer[footerStart + 89] = crcBytes[1];
    mergedBuffer[footerStart + 90] = crcBytes[2];
    mergedBuffer[footerStart + 91] = crcBytes[3];
    // Checksum 2 at footer byte 97
    mergedBuffer[footerStart + 97] = crcBytes[0];
    mergedBuffer[footerStart + 98] = crcBytes[1];
    mergedBuffer[footerStart + 99] = crcBytes[2];
    mergedBuffer[footerStart + 100] = crcBytes[3];

    return mergedBuffer;
}

function writeAffinityPalette(paletteData) {
    const buffer = buildAffinityPaletteBuffer(paletteData);
    const blob = new Blob([buffer], {type: "octet/stream"});
    saveFile(blob, paletteData.Name + ".afpalette");
}
