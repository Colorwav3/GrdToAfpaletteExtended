// ================================================
// Photoshop Gradient (.grd) Writer — Version 5
// Produces files readable by this app's parser
// ================================================

function buildGrdBuffer(paletteData) {
    // Calculate rough buffer size
    var estimatedSize = 10; // header
    for (var p = 0; p < paletteData.Palettes.length; p++) {
        var pal = paletteData.Palettes[p];
        estimatedSize += 100 + pal.Name.length * 2;
        estimatedSize += pal.Colours.length * 120;
        estimatedSize += 200; // transparency stops
    }

    var buf = new Uint8Array(estimatedSize);
    var pos = 0;

    // --- Helper functions ---
    function w8(v) { buf[pos++] = v & 0xFF; }
    function w16be(v) { buf[pos++] = (v >> 8) & 0xFF; buf[pos++] = v & 0xFF; }
    function w32be(v) {
        v = v >>> 0;
        buf[pos++] = (v >> 24) & 0xFF;
        buf[pos++] = (v >> 16) & 0xFF;
        buf[pos++] = (v >> 8) & 0xFF;
        buf[pos++] = v & 0xFF;
    }
    function wTag(s) { for (var i = 0; i < 4; i++) buf[pos++] = s.charCodeAt(i); }
    function wf64be(val) {
        var ab = new ArrayBuffer(8);
        new DataView(ab).setFloat64(0, val, false); // big-endian
        var bytes = new Uint8Array(ab);
        for (var i = 0; i < 8; i++) buf[pos++] = bytes[i];
    }
    function wUnicodeStr(s) {
        w32be(s.length + 1); // character count incl. null
        for (var i = 0; i < s.length; i++) w16be(s.charCodeAt(i));
        w16be(0); // null terminator
    }
    function wZeros(n) { for (var i = 0; i < n; i++) buf[pos++] = 0; }

    // --- File header ---
    wTag('8BGR');
    w16be(5);       // version
    w32be(16);      // descriptor magic

    // --- Gradients ---
    for (var g = 0; g < paletteData.Palettes.length; g++) {
        var palette = paletteData.Palettes[g];
        var colours = palette.Colours;

        // Gradient header
        wTag('Grdn');
        wTag('Nm  ');           // name key
        wTag('TEXT');           // type
        wUnicodeStr(palette.Name);

        // --- Color stops ---
        wTag('Clrs');
        wTag('VlLs');
        w32be(colours.length);

        for (var c = 0; c < colours.length; c++) {
            wTag('Clrt');
            wZeros(26);         // descriptor metadata (skipped by parser)
            wTag('RGBC');
            wTag('Rd  '); wTag('doub'); wf64be(colours[c].Red * 255.0);
            wTag('Grn '); wTag('doub'); wf64be(colours[c].Green * 255.0);
            wTag('Bl  '); wTag('doub'); wf64be(colours[c].Blue * 255.0);
            wTag('Lctn'); wTag('long'); w32be(Math.round(colours[c].Position * 4096));
            // Midpoint: In Photoshop, it's percentage (0-100)
            var midpoint = colours[c].Midpoint !== undefined ? colours[c].Midpoint : 0.5;
            wTag('Mdpn'); wTag('long'); w32be(Math.round(midpoint * 100));
        }

        // --- Transparency stops ---
        // Build unique transparency stop positions from the colour track
        var transparencyStops = [];
        var seenPositions = {};
        for (var c = 0; c < colours.length; c++) {
            var posKey = colours[c].Position.toFixed(6);
            if (!seenPositions[posKey]) {
                seenPositions[posKey] = true;
                transparencyStops.push({
                    Position: colours[c].Position,
                    Alpha: colours[c].Alpha !== undefined ? colours[c].Alpha : 1.0,
                    Midpoint: colours[c].Midpoint !== undefined ? colours[c].Midpoint : 0.5
                });
            }
        }

        // Ensure we have at least start and end
        if (transparencyStops.length === 0) {
            transparencyStops = [
                { Position: 0, Alpha: 1.0, Midpoint: 0.5 },
                { Position: 1, Alpha: 1.0, Midpoint: 0.5 }
            ];
        }

        wTag('Trns');
        wTag('VlLs');
        w32be(transparencyStops.length);

        for (var t = 0; t < transparencyStops.length; t++) {
            wTag('TrnS');
            wTag('Opct'); wTag('UntF'); wTag('#Prc');
            wf64be(transparencyStops[t].Alpha * 100.0);
            wTag('Lctn'); wTag('long'); w32be(Math.round(transparencyStops[t].Position * 4096));
            var tMid = transparencyStops[t].Midpoint !== undefined ? transparencyStops[t].Midpoint : 0.5;
            wTag('Mdpn'); wTag('long'); w32be(Math.round(tMid * 100));
        }
    }

    return buf.slice(0, pos);
}

/**
 * Download all gradients as a single .grd file.
 */
function writePhotoshopGradient(paletteData) {
    var buffer = buildGrdBuffer(paletteData);
    var blob = new Blob([buffer], { type: "application/octet-stream" });
    var safeName = paletteData.Name.replace(/[<>:"\/\\|?*]/g, '_');
    saveFile(blob, safeName + ".grd");
}
