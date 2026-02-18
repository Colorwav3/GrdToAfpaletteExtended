// Headless test: parse a GRD file and verify all gradients are found.
// Usage: node test_parser.js <file.grd>

const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('Usage: node test_parser.js <file.grd>'); process.exit(1); }

const data = fs.readFileSync(file);
const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
const dv = new DataView(ab);

const c_Grdn = 0x4772646E;
const c_Nm   = 0x4E6D2020;
const c_Clrs = 0x436c7273;
const c_Clrt = 0x436C7274;
const c_RGBC = 0x52474243;
const c_Rd   = 0x52642020;
const c_Grn  = 0x47726E20;
const c_Bl   = 0x426C2020;
const c_Lctn = 0x4C63746E;
const c_Mdpn = 0x4D64706E;
const c_Trns = 0x54726E73;
const c_TrnS = 0x54726E53;
const c_Opct = 0x4F706374;

function skip(current, val, end) {
    for (let i = current; i < end - 4; i++) {
        if (dv.getUint32(i, false) === val) return i + 4;
    }
    return end;
}

function findAll(val) {
    const offsets = [];
    for (let i = 0; i < dv.byteLength - 4; i++) {
        if (dv.getUint32(i, false) === val) offsets.push(i + 4);
    }
    return offsets;
}

// Verify header
const magic = dv.getUint32(0, false);
const version = dv.getUint16(4, false);
console.log('Magic: 0x' + magic.toString(16) + ', Version: ' + version);

const offsets = findAll(c_Grdn);
console.log('Found ' + offsets.length + ' Grdn chunks');

let parsed = 0;
let errors = 0;

for (let idx = 0; idx < offsets.length; idx++) {
    let i = offsets[idx];
    const end = idx + 1 < offsets.length ? offsets[idx + 1] - 4 : dv.byteLength;

    // Find name
    i = skip(i, c_Nm, end);
    if (i >= end) { errors++; continue; }
    i += 4; // TEXT
    const nameLen = dv.getUint32(i, false); i += 4;
    i += nameLen * 2; // skip unicode chars

    // Find Clrs
    i = skip(i, c_Clrs, end); i += 4;
    if (i >= end) { errors++; continue; }
    const cc = dv.getUint32(i, false); i += 4;

    let ok = true;
    for (let c = 0; c < cc; c++) {
        i = skip(i, c_Clrt, end);
        if (i >= end) { ok = false; break; }
        // skip 22 bytes + check format
        i += 22;
        const fmt = dv.getUint32(i, false);
        if (fmt === c_RGBC) {
            i = skip(i, c_Rd, end); i += 4; i += 8;
            i = skip(i, c_Grn, end); i += 4; i += 8;
            i = skip(i, c_Bl, end); i += 4; i += 8;
        }
        i = skip(i, c_Lctn, end); i += 4; i += 4;
        i = skip(i, c_Mdpn, end); i += 4; i += 4;
    }
    if (!ok) { errors++; continue; }

    // Trns
    const trnsPos = skip(i, c_Trns, end);
    if (trnsPos < end) {
        i = trnsPos + 4;
        const tc = dv.getUint32(i, false); i += 4;
        for (let t = 0; t < tc; t++) {
            i = skip(i, c_TrnS, end);
            i = skip(i, c_Opct, end); i += 8; i += 8;
            i = skip(i, c_Lctn, end); i += 4; i += 4;
            i = skip(i, c_Mdpn, end); i += 4; i += 4;
        }
    }

    parsed++;
}

console.log('Parsed: ' + parsed + '/' + offsets.length + ', Errors: ' + errors);

if (parsed === offsets.length && errors === 0) {
    console.log('PASS: All gradients parsed successfully.');
    process.exit(0);
} else {
    console.log('FAIL: Some gradients could not be parsed.');
    process.exit(1);
}
