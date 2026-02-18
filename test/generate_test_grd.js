const fs = require('fs');
const gradientCount = parseInt(process.argv[2] || '500', 10);
const outputFile = process.argv[3] || 'test_large.grd';

const bufSize = gradientCount * 1024;
const buf = Buffer.alloc(bufSize);
let pos = 0;

function w4(name) { for(let i=0;i<4;i++) buf[pos++]=name.charCodeAt(i); }
function wu32(val) { buf.writeUInt32BE(val>>>0, pos); pos+=4; }
function wu16(val) { buf.writeUInt16BE(val&0xFFFF, pos); pos+=2; }
function wf64(val) { buf.writeDoubleBE(val, pos); pos+=8; }
function wstr(s) { wu32(s.length+1); for(let i=0;i<s.length;i++) wu16(s.charCodeAt(i)); wu16(0); }

w4('8BGR'); wu16(5); wu32(16);

for (let g = 0; g < gradientCount; g++) {
    const cc = 2 + (g % 5);
    w4('Grdn'); w4('Nm  '); w4('TEXT'); wstr('Test Gradient '+(g+1));
    w4('Clrs'); w4('VlLs'); wu32(cc);
    for (let c = 0; c < cc; c++) {
        w4('Clrt');
        for(let p=0;p<22;p++) buf[pos++]=0;
        w4('RGBC');
        w4('Rd  '); w4('doub'); wf64((c/Math.max(1,cc-1))*255);
        w4('Grn '); w4('doub'); wf64(((g%10)/10)*255);
        w4('Bl  '); w4('doub'); wf64((1-c/Math.max(1,cc-1))*255);
        w4('Lctn'); w4('long'); wu32(Math.round((c/Math.max(1,cc-1))*4096));
        w4('Mdpn'); w4('long'); wu32(50);
    }
    w4('Trns'); w4('VlLs'); wu32(2);
    for (let t = 0; t < 2; t++) {
        w4('TrnS');
        w4('Opct'); w4('UntF'); w4('#Prc'); wf64(100);
        w4('Lctn'); w4('long'); wu32(t*4096);
        w4('Mdpn'); w4('long'); wu32(50);
    }
}

fs.writeFileSync(outputFile, buf.slice(0, pos));
console.log('Generated '+outputFile+': '+gradientCount+' gradients, '+pos+' bytes');
