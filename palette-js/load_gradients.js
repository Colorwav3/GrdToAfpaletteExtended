var paletteFileInput = document.getElementById('paletteFile');

const errorElement = document.getElementById("errors");

const c_8BGR = 0x38424752;  // '8BGR'
const c_Clrs = 0x436c7273;  // 'Clrs'
const c_Clrt = 0x436C7274;  // 'Clrt'

// Gradient types
const c_RGBC = 0x52474243;  // 'RGBC'
const c_Rd   = 0x52642020;  // 'Rd  '
const c_Grn  = 0x47726E20;  // 'Grn '
const c_Bl   = 0x426C2020;  // 'Bl  '

const c_HSBC = 0x48534243;  // 'HSBC'
const c_Hue  = 0x48202020;  // 'H   '
const c_Strt = 0x53747274;  // 'Strt'
const c_Brgh = 0x42726768;  // 'Brgh'

// Unsupported gradient types
const c_BkCl = 0x426B436C;  // 'BkCl' Book Color
const c_CMYC = 0x434D5943;  // 'CMYC' CMYK
const c_Grsc = 0x47727363;  // 'Grsc' Greyscale
const c_LbCl = 0x4C62436C;  // 'LbCl' Lab

// CMYK channel keys
const c_Cyn  = 0x43796E20;  // 'Cyn '
const c_Mgnt = 0x4D676E74;  // 'Mgnt'
const c_Ylw  = 0x596C7720;  // 'Ylw '
const c_Blck = 0x426C636B;  // 'Blck'

// Greyscale channel key
const c_Gry  = 0x47727920;  // 'Gry '

// Lab channel keys
const c_Lmnc = 0x4C6D6E63;  // 'Lmnc'
const c_A_Ch = 0x41202020;  // 'A   '
const c_B_Ch = 0x42202020;  // 'B   '

const c_Lctn = 0x4C63746E;
const c_Mdpn = 0x4D64706E;
const c_Grdn = 0x4772646E;
const c_Nm   = 0x4E6D2020;
const c_Trns = 0x54726E73;
const c_TrnS = 0x54726E53;
const c_Opct = 0x4F706374;

// Group hierarchy markers
const c_Grup = 0x47727570;  // 'Grup'
const c_VlLs = 0x566C4C73;  // 'VlLs'
const c_Objc = 0x4F626A63;  // 'Objc'

function getFileExtension(filename) {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot < 0) {
        return "";
    }

    return filename.slice(lastDot + 1).toLowerCase();
}

function getFileNameWithoutExtension(filename) {
    const lastDot = filename.lastIndexOf(".");
    return filename.slice(0, lastDot < 0 ? filename.length : lastDot);
}

function handlePaletteFile(file) {
    const extension = getFileExtension(file.name);
    const filenameWithoutExtension = getFileNameWithoutExtension(file.name);

    clearErrors();

    if (extension === "grd") {
        const reader = new FileReader();
        reader.onload = function (e) {
            parseGrdArrayBuffer(e.target.result, filenameWithoutExtension);
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    if (extension === "ggr" || extension === "kgr") {
        const reader = new FileReader();
        reader.onload = function (e) {
            parseGgrText(e.target.result, filenameWithoutExtension);
        };
        reader.readAsText(file);
        return;
    }

    if (extension === "svg") {
        const reader = new FileReader();
        reader.onload = function (e) {
            parseSvgText(e.target.result, filenameWithoutExtension);
        };
        reader.readAsText(file);
        return;
    }

    if (extension === "css") {
        const reader = new FileReader();
        reader.onload = function (e) {
            parseCssText(e.target.result, filenameWithoutExtension);
        };
        reader.readAsText(file);
        return;
    }

    if (extension === "cpt") {
        const reader = new FileReader();
        reader.onload = function (e) {
            parseCptText(e.target.result, filenameWithoutExtension);
        };
        reader.readAsText(file);
        return;
    }

    showError("Unsupported file type. Supported: .grd, .ggr, .kgr, .svg, .css, .cpt");
}

function parseGrdArrayBuffer(buffer, filenameWithoutExtension) {
    let byteIndex = 0;
    let dataView;

    console.log("Loading file '" + filenameWithoutExtension + "'");

    dataView = new DataView(buffer);

    const magicNumber = dataView.getUint32(byteIndex, false); byteIndex += 4;

    if (magicNumber != c_8BGR) {
        showError("Sorry, I am not able to recognize this format.");
        console.log("Bad Magic. Got 0x" + magicNumber.toString(16));
        return;
    }

    const fileVersion = dataView.getUint16(byteIndex, false); byteIndex += 2;

    if(fileVersion != 5) {
        if(fileVersion == 3) {
            showError("Please use gradient files from Photoshop 6 or above as they are the only ones I can support at the moment. Thank you!");
        } else {
            showError("It looks like I'm not able to support this particular file version at the moment.");
        }

        console.log("Bad Version. Got " + fileVersion);
        return;
    }

    const descriptorMagic = dataView.getUint32(byteIndex, false); byteIndex += 4;
    if(descriptorMagic != 16) {
        showError("Sorry, I am not able to recognize this format.");
        return;
    }

    const palettes = {
        Name: filenameWithoutExtension,
        Palettes: [],
        Groups: []
    };

    // Parse group hierarchy (if present) before processing gradients
    const groupMap = GRDParseHierarchy(dataView);

    const gradientOffsets = GRDFindAllChunks(dataView, c_Grdn);

    for (let index = 0; index < gradientOffsets.length; index++) {
        let i = gradientOffsets[index];
        const gradientEnd = (index + 1 < gradientOffsets.length) ? gradientOffsets[index + 1] - 4 : dataView.byteLength;

        i = GRDSkipToChunkInRange(dataView, i, c_Nm, gradientEnd);
        if (i >= gradientEnd) {
            continue;
        }

        i += 4;   // Skip 'TEXT'

        const nameInfo = GRDReadUnicodeString(dataView, i, gradientEnd);
        i = nameInfo.newIndex;

        const paletteName = nameInfo.text || (filenameWithoutExtension + " " + (palettes.Palettes.length + 1));

        console.log("Found '" + paletteName + "'");

        const palette = {
            Name: paletteName,
            Colours: []
        };

        const colourTrack = [];
        const transparencyTrack = [];
        const positionsTrack = [];
        let shouldAbort = false;

        i = GRDSkipToChunkInRange(dataView, i, c_Clrs, gradientEnd); i += 4; // Skip VILs
        if (i >= gradientEnd) {
            continue;
        }

        const colourCount = dataView.getUint32(i, false); i += 4;
        console.log("    Found Clrs with " + colourCount + " stops");

        for(let j=0; j < colourCount; j++)
        {
            i = GRDSkipToChunkInRange(dataView, i, c_Clrt, gradientEnd); i += 26;
            if (i >= gradientEnd) {
                shouldAbort = true;
                break;
            }

            const format = dataView.getUint32(i, false);

            let red, green, blue;

            if(format == c_HSBC)
            {
                i = GRDSkipToChunkInRange(dataView, i, c_Hue, gradientEnd); i += 8; // Skip type and #Ang
                const hue = dataView.getFloat64(i, false) / 360.0;
                i = GRDSkipToChunkInRange(dataView, i, c_Strt, gradientEnd); i += 4; // Skip type
                const saturation = dataView.getFloat64(i, false) / 100.0;
                i = GRDSkipToChunkInRange(dataView, i, c_Brgh, gradientEnd); i += 4; // Skip type
                const brightness = dataView.getFloat64(i, false) / 100.0;

                console.log("        H:" + hue + " S:" + saturation + " B:" + brightness);

                const rgb = HSVtoRGB(hue, saturation, brightness);

                red = rgb.Red;
                green = rgb.Green;
                blue = rgb.Blue;
            }
            else if(format == c_RGBC)
            {
                i = GRDSkipToChunkInRange(dataView, i, c_Rd, gradientEnd); i += 4; // Skip type
                red = dataView.getFloat64(i, false) / 255.0;
                i = GRDSkipToChunkInRange(dataView, i, c_Grn, gradientEnd); i += 4; // Skip type
                green = dataView.getFloat64(i, false) / 255.0;
                i = GRDSkipToChunkInRange(dataView, i, c_Bl, gradientEnd); i += 4; // Skip type
                blue = dataView.getFloat64(i, false) / 255.0;
            }
            else if (format == c_BkCl)
            {
                // Book Color — try to read RGBC data that Photoshop sometimes embeds after it
                // If we can't find it, use a fallback gray
                console.log("        Book Color stop — attempting RGB fallback");
                var bookRd = GRDSkipToChunkInRange(dataView, i, c_Rd, Math.min(i + 300, gradientEnd));
                if (bookRd < gradientEnd && bookRd < i + 300) {
                    i = bookRd + 4;
                    red = dataView.getFloat64(i, false) / 255.0;
                    i = GRDSkipToChunkInRange(dataView, i, c_Grn, gradientEnd); i += 4;
                    green = dataView.getFloat64(i, false) / 255.0;
                    i = GRDSkipToChunkInRange(dataView, i, c_Bl, gradientEnd); i += 4;
                    blue = dataView.getFloat64(i, false) / 255.0;
                    console.log("        Book→RGB fallback: R:" + red + " G:" + green + " B:" + blue);
                } else {
                    // No RGB found — use neutral gray
                    red = 0.5; green = 0.5; blue = 0.5;
                    console.log("        Book Color: no RGB data found, using gray fallback");
                }
            }
            else if (format == c_CMYC)
            {
                i = GRDSkipToChunkInRange(dataView, i, c_Cyn, gradientEnd); i += 8; // Skip 'UntF' + '#Prc'
                var cyan = dataView.getFloat64(i, false) / 100.0;
                i = GRDSkipToChunkInRange(dataView, i, c_Mgnt, gradientEnd); i += 8;
                var magenta = dataView.getFloat64(i, false) / 100.0;
                i = GRDSkipToChunkInRange(dataView, i, c_Ylw, gradientEnd); i += 8;
                var yellow = dataView.getFloat64(i, false) / 100.0;
                i = GRDSkipToChunkInRange(dataView, i, c_Blck, gradientEnd); i += 8;
                var black = dataView.getFloat64(i, false) / 100.0;

                console.log("        CMYK C:" + cyan + " M:" + magenta + " Y:" + yellow + " K:" + black);

                var cmykRgb = CMYKtoRGB(cyan, magenta, yellow, black);
                red = cmykRgb.Red;
                green = cmykRgb.Green;
                blue = cmykRgb.Blue;
            }
            else if (format == c_Grsc)
            {
                i = GRDSkipToChunkInRange(dataView, i, c_Gry, gradientEnd); i += 8; // Skip 'UntF' + '#Prc'
                var gray = dataView.getFloat64(i, false) / 100.0;

                console.log("        Greyscale: " + gray);

                red = gray;
                green = gray;
                blue = gray;
            }
            else if (format == c_LbCl)
            {
                i = GRDSkipToChunkInRange(dataView, i, c_Lmnc, gradientEnd); i += 8; // Skip 'UntF' + '#Prc'
                var labL = dataView.getFloat64(i, false);
                i = GRDSkipToChunkInRange(dataView, i, c_A_Ch, gradientEnd); i += 4; // Skip 'doub'
                var labA = dataView.getFloat64(i, false);
                i = GRDSkipToChunkInRange(dataView, i, c_B_Ch, gradientEnd); i += 4; // Skip 'doub'
                var labB = dataView.getFloat64(i, false);

                console.log("        Lab L:" + labL + " a:" + labA + " b:" + labB);

                var labRgb = LabToRGB(labL, labA, labB);
                red = labRgb.Red;
                green = labRgb.Green;
                blue = labRgb.Blue;
            }
            else
            {
                showError("Sorry, I only support converting RGB and HSB gradients.");
                console.log("        Skipping unknown gradient format " + format);
                shouldAbort = true;
            }

            if(shouldAbort)
            {
                break;
            }
            else
            {
                i = GRDSkipToChunkInRange(dataView, i, c_Lctn, gradientEnd); i += 4; // Skip type
                const location = dataView.getUint32(i, false) * (1/4096.0);
                i = GRDSkipToChunkInRange(dataView, i, c_Mdpn, gradientEnd); i += 4; // Skip type
                const midpoint = dataView.getUint32(i, false) * 0.01;

                // Make sure we have an entry at location 0
                if(j == 0 && location != 0) {
                    // Duplicate first entry
                    colourTrack.push({Red:red, Green:green, Blue:blue, Alpha:1, Position:0, Midpoint:midpoint });
                    positionsTrack.push({Position:0, Midpoint:midpoint});
                }

                console.log("        R:" + red + " G:" + green + " B:" + blue + " L:" + location + " M:" + midpoint);

                colourTrack.push({Red:red, Green:green, Blue:blue, Alpha:1, Position:location, Midpoint:midpoint});
                positionsTrack.push({Position:location, Midpoint:midpoint});

                // Make sure we have an entry at 1 otherwise we'll crash Designer
                if(j == colourCount-1 && location != 1) {
                    // Duplicate last entry
                    colourTrack.push({Red:red, Green:green, Blue:blue, Alpha:1, Position:1, Midpoint:midpoint});
                    positionsTrack.push({Position:1, Midpoint:midpoint});
                }
            }
        }

        if (shouldAbort) {
            continue;
        }

        // Assign group from hierarchy (each gradient has 2 Grdn occurrences, so pair index = floor(index/2))
        const vlLsIndex = Math.floor(index / 2);
        if (groupMap.length > 0 && vlLsIndex < groupMap.length) {
            palette.Group = groupMap[vlLsIndex];
        }

        // Get the transparency stops
        if(colourTrack.length > 0)
        {
            const trnsPos = GRDSkipToChunkInRange(dataView, i, c_Trns, gradientEnd);

            if (trnsPos < gradientEnd) {
                i = trnsPos + 4; // Skip VILs

                const transparencyCount = dataView.getUint32(i, false); i += 4;

                console.log("    Found Trns with " + transparencyCount + " stops");

                for(let j=0; j < transparencyCount; j++) {
                    i = GRDSkipToChunkInRange(dataView, i, c_TrnS, gradientEnd);
                    i = GRDSkipToChunkInRange(dataView, i, c_Opct, gradientEnd); i += 8; // Skip 'UntF' and '#Prc'
                    const opacity = dataView.getFloat64(i, false) * 0.01;
                    i = GRDSkipToChunkInRange(dataView, i, c_Lctn, gradientEnd); i += 4;
                    const location = dataView.getUint32(i, false) * (1/4096.0);
                    i = GRDSkipToChunkInRange(dataView, i, c_Mdpn, gradientEnd); i += 4;
                    const midpoint = dataView.getUint32(i, false) * 0.01;

                    // Make sure we have an entry at location 0
                    if(j == 0 && location != 0) {
                        // Duplicate first entry
                        transparencyTrack.push({Red:0, Green:0, Blue:0, Alpha:opacity, Position:0, Midpoint:midpoint});
                        positionsTrack.push({Position:0, Midpoint:midpoint});
                    }

                    console.log("        Opacity:" + opacity + " L:" + location + " M:" + midpoint);

                    transparencyTrack.push({Red:0, Green:0, Blue:0, Alpha:opacity, Position:location, Midpoint:midpoint});
                    positionsTrack.push({Position:location, Midpoint:midpoint});

                    // Make sure we have an entry at 1 otherwise we'll crash Designer
                    if(j == transparencyCount-1 && location != 1) {
                        // Duplicate last entry
                        transparencyTrack.push({Red:0, Green:0, Blue:0, Alpha:opacity, Position:1, Midpoint:midpoint});
                        positionsTrack.push({Position:1, Midpoint:midpoint});
                    }
                }

                positionsTrack.sort(function(a, b){return a.Position - b.Position});

                let lastPosition = -1;

                for(let k=0; k < positionsTrack.length; k++)
                {
                    const t = positionsTrack[k].Position;
                    const midpoint = positionsTrack[k].Midpoint;

                    // Don't duplicate the stops if we have a colour and transparency stop at the same position
                    if(t == lastPosition) {
                        continue;
                    }

                    lastPosition = t;

                    const colour = gradientUtils.getColourFromGradient(colourTrack, t);
                    const transparency = gradientUtils.getColourFromGradient(transparencyTrack, t);

                    palette.Colours.push({Red:colour.Red, Green:colour.Green, Blue:colour.Blue, Alpha:transparency.Alpha, Position:t, Midpoint:midpoint });
                }
            } else {
                // No transparency data found - use colour track directly with alpha 1.0
                console.log("    No Trns found, using default alpha 1.0");
                for(let k=0; k < colourTrack.length; k++) {
                    palette.Colours.push(colourTrack[k]);
                }
            }

            palettes.Palettes.push(palette);
        }
    }

    // Build group summary from parsed palettes
    if (groupMap.length > 0) {
        const seenGroups = [];
        const groupCounts = {};
        for (let p = 0; p < palettes.Palettes.length; p++) {
            const g = palettes.Palettes[p].Group || '(Ungrouped)';
            if (!groupCounts[g]) {
                groupCounts[g] = 0;
                seenGroups.push(g);
            }
            groupCounts[g]++;
        }
        for (let g = 0; g < seenGroups.length; g++) {
            palettes.Groups.push({ name: seenGroups[g], count: groupCounts[seenGroups[g]] });
        }
        console.log("Found " + palettes.Groups.length + " groups: " + seenGroups.join(", "));
    }

    console.log("Found " + palettes.Palettes.length + " palettes");

    if(palettes.Palettes.length > 0)
    {
        previewPalette(palettes);
    }
}

function parseGgrText(text, filenameWithoutExtension) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");

    if (lines.length === 0 || lines[0].trim() !== "GIMP Gradient") {
        showError("Sorry, I could not recognize this GGR/KGR gradient format.");
        return;
    }

    let lineIndex = 1;
    let gradientName = filenameWithoutExtension;

    if (lines[lineIndex] && lines[lineIndex].trim().toLowerCase().startsWith("name:")) {
        gradientName = lines[lineIndex].split(":").slice(1).join(":").trim() || gradientName;
        lineIndex += 1;
    }

    if (!lines[lineIndex]) {
        showError("Sorry, this gradient file is missing its segment count.");
        return;
    }

    const segmentCount = parseInt(lines[lineIndex].trim(), 10);
    if (!Number.isFinite(segmentCount) || segmentCount <= 0) {
        showError("Sorry, this gradient file has an invalid segment count.");
        return;
    }

    lineIndex += 1;

    const colours = [];
    const epsilon = 0.000001;

    for (let segmentIndex = 0; segmentIndex < segmentCount && lineIndex < lines.length; segmentIndex++, lineIndex++) {
        const parts = lines[lineIndex].trim().split(/\s+/);
        if (parts.length < 13) {
            showError("Sorry, this gradient file has an invalid segment entry.");
            return;
        }

        const leftPos = clamp01(parseFloat(parts[0]));
        const middlePos = clamp01(parseFloat(parts[1]));
        const rightPos = clamp01(parseFloat(parts[2]));

        const colorType = parseInt(parts[12], 10);

        const leftColor = parseGgrColor(parts.slice(3, 7), colorType);
        const rightColor = parseGgrColor(parts.slice(7, 11), colorType);

        if (segmentIndex === 0 || Math.abs(colours[colours.length - 1].Position - leftPos) > epsilon) {
            colours.push({
                Red: leftColor.Red,
                Green: leftColor.Green,
                Blue: leftColor.Blue,
                Alpha: leftColor.Alpha,
                Position: leftPos,
                Midpoint: 0.5
            });
        }

        let midpoint = 0.5;
        if (rightPos > leftPos + epsilon) {
            midpoint = clamp01((middlePos - leftPos) / (rightPos - leftPos));
        }

        colours.push({
            Red: rightColor.Red,
            Green: rightColor.Green,
            Blue: rightColor.Blue,
            Alpha: rightColor.Alpha,
            Position: rightPos,
            Midpoint: midpoint
        });
    }

    if (colours.length === 0) {
        showError("Sorry, this gradient file did not contain any usable segments.");
        return;
    }

    if (colours[0].Position > 0) {
        const first = colours[0];
        colours.unshift({
            Red: first.Red,
            Green: first.Green,
            Blue: first.Blue,
            Alpha: first.Alpha,
            Position: 0,
            Midpoint: 0.5
        });
    }

    const last = colours[colours.length - 1];
    if (last.Position < 1) {
        colours.push({
            Red: last.Red,
            Green: last.Green,
            Blue: last.Blue,
            Alpha: last.Alpha,
            Position: 1,
            Midpoint: 0.5
        });
    }

    const palettes = {
        Name: filenameWithoutExtension,
        Palettes: [
            {
                Name: gradientName,
                Colours: colours
            }
        ]
    };

    previewPalette(palettes);
}

function parseGgrColor(values, colorType) {
    const a = clamp01(parseFloat(values[0]));
    const b = clamp01(parseFloat(values[1]));
    const c = clamp01(parseFloat(values[2]));
    const alpha = clamp01(parseFloat(values[3]));

    if (colorType === 1 || colorType === 2) {
        const rgb = HSVtoRGB(a, b, c);
        return { Red: rgb.Red, Green: rgb.Green, Blue: rgb.Blue, Alpha: alpha };
    }

    return { Red: a, Green: b, Blue: c, Alpha: alpha };
}

function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(1, Math.max(0, value));
}

// Parse the GRD hierarchy section to extract group assignments.
// Returns an array where groupMap[vlLsIndex] = "GroupName" for each gradient.
function GRDParseHierarchy(dataView) {
    const groupMap = [];

    // Search for the hierarchy VlLs section near the end of the file.
    // It is preceded by "8BIMphry" and "hierarchyVlLs".
    const hierMarker = [0x68, 0x69, 0x65, 0x72, 0x61, 0x72, 0x63, 0x68, 0x79]; // "hierarchy"
    let hierPos = -1;
    const searchStart = Math.max(0, dataView.byteLength - 100000);
    for (let i = searchStart; i < dataView.byteLength - 20; i++) {
        let match = true;
        for (let m = 0; m < hierMarker.length; m++) {
            if (dataView.getUint8(i + m) !== hierMarker[m]) { match = false; break; }
        }
        if (match) {
            // "hierarchy" found, VlLs should follow
            const vlLsOffset = i + hierMarker.length;
            if (dataView.getUint32(vlLsOffset, false) === c_VlLs) {
                hierPos = vlLsOffset;
            }
            break;
        }
    }

    if (hierPos < 0) {
        console.log("No group hierarchy found in GRD file.");
        return groupMap;
    }

    const hierItemCount = dataView.getUint32(hierPos + 4, false);
    console.log("Found hierarchy VlLs with " + hierItemCount + " items at offset " + hierPos);

    // Find all Objc positions in the hierarchy section
    const objcPositions = [];
    for (let i = hierPos + 8; i < dataView.byteLength - 8; i++) {
        if (dataView.getUint32(i, false) === c_Objc) {
            // Verify: next comes a unicode string length that's reasonable
            const testLen = dataView.getUint32(i + 4, false);
            if (testLen < 200) {
                objcPositions.push(i);
            }
        }
    }

    // Parse each Objc to extract classId and name
    const groupStack = [];
    let presetCount = 0;

    for (let idx = 0; idx < objcPositions.length; idx++) {
        let p = objcPositions[idx] + 4; // skip 'Objc'

        // Unicode descriptor name
        const nameLen = dataView.getUint32(p, false);
        p += 4 + nameLen * 2;

        // ClassID
        const keyLen = dataView.getUint32(p, false);
        const actualLen = keyLen === 0 ? 4 : keyLen;
        let classId = '';
        for (let c = 0; c < actualLen; c++) {
            classId += String.fromCharCode(dataView.getUint8(p + 4 + c));
        }
        classId = classId.trim();
        p += 4 + actualLen;

        if (classId === 'Grup') {
            // Read field count, then find Nm field
            const fieldCount = dataView.getUint32(p, false);
            p += 4;
            let grupName = '';
            for (let f = 0; f < fieldCount; f++) {
                // Field key
                const fkLen = dataView.getUint32(p, false);
                const fkActual = fkLen === 0 ? 4 : fkLen;
                let fk = '';
                for (let c = 0; c < fkActual; c++) fk += String.fromCharCode(dataView.getUint8(p + 4 + c));
                fk = fk.trim();
                p += 4 + fkActual;
                // Type tag
                const tt = String.fromCharCode(
                    dataView.getUint8(p), dataView.getUint8(p+1),
                    dataView.getUint8(p+2), dataView.getUint8(p+3));
                p += 4;
                if (tt === 'TEXT') {
                    const tLen = dataView.getUint32(p, false);
                    p += 4;
                    let tVal = '';
                    for (let c = 0; c < tLen; c++) {
                        const ch = dataView.getUint16(p + c * 2, false);
                        if (ch > 0) tVal += String.fromCharCode(ch);
                    }
                    p += tLen * 2;
                    if (fk === 'Nm') grupName = tVal;
                } else {
                    break; // Unknown field type, stop parsing this descriptor
                }
            }
            groupStack.push(grupName);

        } else if (classId === 'groupEnd') {
            if (groupStack.length > 0) groupStack.pop();

        } else if (classId === 'preset') {
            // This preset entry maps to the gradient at index presetCount
            const currentGroup = groupStack.length > 0 ? groupStack[groupStack.length - 1] : '';
            groupMap[presetCount] = currentGroup;
            presetCount++;
        }
    }

    console.log("Parsed " + presetCount + " preset entries in hierarchy.");
    return groupMap;
}

function GRDSkipToChunkInRange(dataView, current, val, endIndex) {
    for (let i=current; i < endIndex - 4; i++) {
        if (dataView.getUint32(i, false) == val) {
            return i + 4;
        }
    }

    return endIndex;
}

function GRDFindAllChunks(dataView, val) {
    const offsets = [];

    for (let i=0; i < dataView.byteLength-4; i++) {
        if (dataView.getUint32(i, false) == val) {
            offsets.push(i + 4);
        }
    }

    return offsets;
}

function GRDReadUnicodeString(dataView, current, endIndex) {
    if (current + 4 > endIndex) {
        return { text: "", newIndex: endIndex };
    }

    const characterCount = dataView.getUint32(current, false); current += 4;
    let s = "";
    for(let i=0; i < characterCount && current + 2 <= endIndex; i++) {
        const utf16 = dataView.getUint16(current, false); current += 2;
        if(utf16 == 0) {
            break;
        } else {
            s +=  String.fromCharCode(utf16);
        }
    }

    return { text: s, newIndex: current };
}

// https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
function HSVtoRGB(h, s, v)
{
    var r, g, b, i, f, p, q, t;

    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6)
    {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {
        Red: r,
        Green: g,
        Blue: b
    };
}

// ================================================
// CMYK → RGB conversion
// Input: C, M, Y, K each in 0..1
// Output: { Red, Green, Blue } each in 0..1
// ================================================
function CMYKtoRGB(c, m, y, k)
{
    var r = (1 - c) * (1 - k);
    var g = (1 - m) * (1 - k);
    var b = (1 - y) * (1 - k);

    return {
        Red:   Math.max(0, Math.min(1, r)),
        Green: Math.max(0, Math.min(1, g)),
        Blue:  Math.max(0, Math.min(1, b))
    };
}

// ================================================
// CIE Lab → RGB (sRGB) conversion
// L: 0..100, a: -128..127, b: -128..127
// Output: { Red, Green, Blue } each in 0..1
// Uses D65 illuminant (Observer = 2°)
// ================================================
function LabToRGB(L, a, b)
{
    // Step 1: Lab → XYZ
    var fy = (L + 16) / 116;
    var fx = a / 500 + fy;
    var fz = fy - b / 200;

    var epsilon = 0.008856;
    var kappa   = 903.3;

    var xr = (fx * fx * fx > epsilon) ? fx * fx * fx : (116 * fx - 16) / kappa;
    var yr = (L > kappa * epsilon)    ? fy * fy * fy : L / kappa;
    var zr = (fz * fz * fz > epsilon) ? fz * fz * fz : (116 * fz - 16) / kappa;

    // D65 reference white
    var X = xr * 0.95047;
    var Y = yr * 1.00000;
    var Z = zr * 1.08883;

    // Step 2: XYZ → linear sRGB
    var lr =  3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
    var lg = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
    var lb =  0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

    // Step 3: linear sRGB → sRGB (gamma correction)
    function gammaCorrect(c) {
        return c <= 0.0031308
            ? 12.92 * c
            : 1.055 * Math.pow(c, 1.0 / 2.4) - 0.055;
    }

    return {
        Red:   Math.max(0, Math.min(1, gammaCorrect(lr))),
        Green: Math.max(0, Math.min(1, gammaCorrect(lg))),
        Blue:  Math.max(0, Math.min(1, gammaCorrect(lb)))
    };
}

function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function clearErrors() {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
}

if (paletteFileInput) {
    paletteFileInput.onchange = function (e) {
        var file = this.files[0];
        if (!file) {
            return;
        }

        this.value = ''; // Reset so onchange fires again for same file.
        handlePaletteFile(file);
    };
}

// ================================================
// SVG Gradient Parser
// ================================================

function parseSvgText(text, filenameWithoutExtension) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(text, "image/svg+xml");

    var parseError = doc.querySelector('parsererror');
    if (parseError) {
        showError("Could not parse SVG file: invalid XML.");
        return;
    }

    var gradientElements = doc.querySelectorAll('linearGradient, radialGradient');
    if (gradientElements.length === 0) {
        showError("No gradient definitions found in the SVG file.");
        return;
    }

    var palettes = {
        Name: filenameWithoutExtension,
        Palettes: [],
        Groups: []
    };

    for (var g = 0; g < gradientElements.length; g++) {
        var gradEl = gradientElements[g];
        var stops = gradEl.querySelectorAll('stop');
        if (stops.length < 1) continue;

        var gradientName = gradEl.getAttribute('id') || (filenameWithoutExtension + ' ' + (g + 1));
        // Clean up ID-style names
        gradientName = gradientName.replace(/[_-]+/g, ' ').replace(/^\s+|\s+$/g, '');

        var colours = [];
        for (var s = 0; s < stops.length; s++) {
            var stop = stops[s];
            var offset = parseFloat(stop.getAttribute('offset') || '0');
            // Handle percentage vs. fraction
            if (stop.getAttribute('offset') && stop.getAttribute('offset').indexOf('%') !== -1) {
                offset /= 100;
            }
            offset = clamp01(offset);

            var stopColor = stop.getAttribute('stop-color') || '#000000';
            var stopOpacity = parseFloat(stop.getAttribute('stop-opacity'));
            if (isNaN(stopOpacity)) stopOpacity = 1;

            // Also check style attribute
            var style = stop.getAttribute('style') || '';
            var styleColorMatch = style.match(/stop-color\s*:\s*([^;]+)/);
            if (styleColorMatch) stopColor = styleColorMatch[1].trim();
            var styleOpacityMatch = style.match(/stop-opacity\s*:\s*([^;]+)/);
            if (styleOpacityMatch) stopOpacity = parseFloat(styleOpacityMatch[1]);

            var rgb = parseCssColor(stopColor);

            colours.push({
                Red: rgb.r / 255,
                Green: rgb.g / 255,
                Blue: rgb.b / 255,
                Alpha: clamp01(stopOpacity),
                Position: offset,
                Midpoint: 0.5
            });
        }

        if (colours.length > 0) {
            // Ensure start and end stops
            if (colours[0].Position > 0) {
                var first = colours[0];
                colours.unshift({ Red: first.Red, Green: first.Green, Blue: first.Blue, Alpha: first.Alpha, Position: 0, Midpoint: 0.5 });
            }
            if (colours[colours.length - 1].Position < 1) {
                var last = colours[colours.length - 1];
                colours.push({ Red: last.Red, Green: last.Green, Blue: last.Blue, Alpha: last.Alpha, Position: 1, Midpoint: 0.5 });
            }

            palettes.Palettes.push({
                Name: gradientName,
                Colours: colours
            });
        }
    }

    if (palettes.Palettes.length === 0) {
        showError("No usable gradients found in SVG file.");
        return;
    }

    console.log("Found " + palettes.Palettes.length + " SVG gradients");
    previewPalette(palettes);
}

// ================================================
// CSS Gradient Parser
// ================================================

function parseCssText(text, filenameWithoutExtension) {
    // Find all linear-gradient(...) and radial-gradient(...) values
    var gradientRegex = /(?:linear|radial)-gradient\s*\(([^;{}]*?)\)/gi;
    var matches = [];
    var match;

    while ((match = gradientRegex.exec(text)) !== null) {
        matches.push(match);
    }

    if (matches.length === 0) {
        showError("No CSS gradient definitions found in the file.");
        return;
    }

    var palettes = {
        Name: filenameWithoutExtension,
        Palettes: [],
        Groups: []
    };

    // Try to extract names from CSS custom properties or class names
    for (var i = 0; i < matches.length; i++) {
        var fullMatch = matches[i][0];
        var inner = matches[i][1];
        var gradientName = filenameWithoutExtension + ' ' + (i + 1);

        // Try to find a preceding CSS variable name or class name
        var before = text.substring(Math.max(0, matches[i].index - 200), matches[i].index);
        var varMatch = before.match(/--(\S+)\s*:\s*$/);
        var classMatch = before.match(/\.(\S+)\s*\{[^}]*$/);
        if (varMatch) {
            gradientName = varMatch[1].replace(/[_-]+/g, ' ');
        } else if (classMatch) {
            gradientName = classMatch[1].replace(/[_-]+/g, ' ');
        }

        var colours = parseCssGradientStops(inner);

        if (colours.length > 0) {
            // Ensure start and end
            if (colours[0].Position > 0) {
                var first = colours[0];
                colours.unshift({ Red: first.Red, Green: first.Green, Blue: first.Blue, Alpha: first.Alpha, Position: 0, Midpoint: 0.5 });
            }
            if (colours[colours.length - 1].Position < 1) {
                var last = colours[colours.length - 1];
                colours.push({ Red: last.Red, Green: last.Green, Blue: last.Blue, Alpha: last.Alpha, Position: 1, Midpoint: 0.5 });
            }

            palettes.Palettes.push({
                Name: gradientName,
                Colours: colours
            });
        }
    }

    if (palettes.Palettes.length === 0) {
        showError("No usable CSS gradients found.");
        return;
    }

    console.log("Found " + palettes.Palettes.length + " CSS gradients");
    previewPalette(palettes);
}

function parseCssGradientStops(inner) {
    // Remove angle/direction prefix (e.g. "90deg," or "to right,")
    inner = inner.replace(/^\s*(to\s+\w+|\d+deg|\d+\.\d+deg|\d+turn|\d+\.\d+turn|\d+rad|\d+\.\d+rad)\s*,\s*/, '');

    // Split by comma, but not commas inside parentheses (like rgba(...))
    var parts = [];
    var depth = 0;
    var current = '';
    for (var i = 0; i < inner.length; i++) {
        var ch = inner[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }
    if (current.trim()) parts.push(current.trim());

    var colours = [];
    var autoIndex = 0;

    for (var i = 0; i < parts.length; i++) {
        var part = parts[i].trim();
        if (!part) continue;

        // Match color + optional position: "rgb(255,0,0) 50%" or "#ff0000 50%"
        var colorAndPos = part.match(/^(.+?)\s+(\d+(?:\.\d+)?%?)\s*$/);
        var colorStr, posStr;

        if (colorAndPos) {
            colorStr = colorAndPos[1].trim();
            posStr = colorAndPos[2];
        } else {
            colorStr = part;
            posStr = null;
        }

        var rgb = parseCssColor(colorStr);
        if (rgb === null) continue;

        var position;
        if (posStr !== null) {
            position = parseFloat(posStr);
            if (posStr.indexOf('%') !== -1) position /= 100;
            position = clamp01(position);
        } else {
            // Auto-distribute
            if (parts.length <= 1) {
                position = 0;
            } else {
                position = autoIndex / (parts.length - 1);
            }
        }

        colours.push({
            Red: rgb.r / 255,
            Green: rgb.g / 255,
            Blue: rgb.b / 255,
            Alpha: rgb.a !== undefined ? rgb.a : 1,
            Position: position,
            Midpoint: 0.5
        });
        autoIndex++;
    }

    return colours;
}

// ================================================
// CPTCITY (.cpt) Gradient Parser
// Format: lines of "position R G B [A]" pairs
// ================================================

function parseCptText(text, filenameWithoutExtension) {
    var lines = text.replace(/\r\n/g, '\n').split('\n');
    var colours = [];
    var minPos = Infinity;
    var maxPos = -Infinity;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line[0] === '#') continue;
        // Skip special markers B, F, N (background, foreground, NaN)
        if (/^[BFN]\s/.test(line)) continue;

        // Try to parse: pos1 R1 G1 B1 pos2 R2 G2 B2
        // or:            pos1 colorname pos2 colorname
        // We handle the numeric RGB case
        var parts = line.split(/\s+/);
        if (parts.length >= 8) {
            var pos1 = parseFloat(parts[0]);
            var r1 = parseInt(parts[1]);
            var g1 = parseInt(parts[2]);
            var b1 = parseInt(parts[3]);
            var pos2 = parseFloat(parts[4]);
            var r2 = parseInt(parts[5]);
            var g2 = parseInt(parts[6]);
            var b2 = parseInt(parts[7]);

            if (isNaN(pos1) || isNaN(r1) || isNaN(g1) || isNaN(b1) ||
                isNaN(pos2) || isNaN(r2) || isNaN(g2) || isNaN(b2)) continue;

            minPos = Math.min(minPos, pos1, pos2);
            maxPos = Math.max(maxPos, pos1, pos2);

            // Add both stops; we'll normalize positions later
            colours.push({ rawPos: pos1, Red: r1 / 255, Green: g1 / 255, Blue: b1 / 255, Alpha: 1, Midpoint: 0.5 });
            colours.push({ rawPos: pos2, Red: r2 / 255, Green: g2 / 255, Blue: b2 / 255, Alpha: 1, Midpoint: 0.5 });
        } else if (parts.length >= 4) {
            // Simple: pos R G B
            var pos = parseFloat(parts[0]);
            var r = parseInt(parts[1]);
            var g = parseInt(parts[2]);
            var b = parseInt(parts[3]);

            if (isNaN(pos) || isNaN(r) || isNaN(g) || isNaN(b)) continue;

            minPos = Math.min(minPos, pos);
            maxPos = Math.max(maxPos, pos);

            colours.push({ rawPos: pos, Red: r / 255, Green: g / 255, Blue: b / 255, Alpha: 1, Midpoint: 0.5 });
        }
    }

    if (colours.length === 0) {
        showError("No usable gradient data found in CPT file.");
        return;
    }

    // Normalize positions to 0-1
    var range = maxPos - minPos;
    if (range <= 0) range = 1;
    for (var i = 0; i < colours.length; i++) {
        colours[i].Position = (colours[i].rawPos - minPos) / range;
        delete colours[i].rawPos;
    }

    // Remove duplicate positions with same color
    var deduped = [colours[0]];
    for (var i = 1; i < colours.length; i++) {
        var prev = deduped[deduped.length - 1];
        if (Math.abs(colours[i].Position - prev.Position) < 0.0001 &&
            Math.abs(colours[i].Red - prev.Red) < 0.004 &&
            Math.abs(colours[i].Green - prev.Green) < 0.004 &&
            Math.abs(colours[i].Blue - prev.Blue) < 0.004) {
            continue;
        }
        deduped.push(colours[i]);
    }

    var palettes = {
        Name: filenameWithoutExtension,
        Palettes: [{
            Name: filenameWithoutExtension,
            Colours: deduped
        }],
        Groups: []
    };

    console.log("Found CPT gradient with " + deduped.length + " stops");
    previewPalette(palettes);
}

// ================================================
// CSS Color Parser (shared utility)
// Parses hex, rgb(), rgba(), hsl(), hsla(), and named colors
// Returns { r, g, b, a } with r/g/b in 0-255 range
// ================================================

function parseCssColor(str) {
    str = str.trim().toLowerCase();

    // Named colors (common subset)
    var namedColors = {
        'black': [0,0,0], 'white': [255,255,255], 'red': [255,0,0], 'green': [0,128,0],
        'blue': [0,0,255], 'yellow': [255,255,0], 'cyan': [0,255,255], 'magenta': [255,0,255],
        'orange': [255,165,0], 'purple': [128,0,128], 'pink': [255,192,203],
        'gray': [128,128,128], 'grey': [128,128,128], 'lime': [0,255,0],
        'navy': [0,0,128], 'teal': [0,128,128], 'maroon': [128,0,0],
        'olive': [128,128,0], 'aqua': [0,255,255], 'fuchsia': [255,0,255],
        'silver': [192,192,192], 'transparent': [0,0,0]
    };

    if (namedColors[str]) {
        var nc = namedColors[str];
        return { r: nc[0], g: nc[1], b: nc[2], a: str === 'transparent' ? 0 : 1 };
    }

    // Hex: #RGB, #RRGGBB, #RRGGBBAA
    var hexMatch = str.match(/^#([0-9a-f]{3,8})$/);
    if (hexMatch) {
        var h = hexMatch[1];
        if (h.length === 3) {
            return { r: parseInt(h[0]+h[0],16), g: parseInt(h[1]+h[1],16), b: parseInt(h[2]+h[2],16), a: 1 };
        } else if (h.length === 4) {
            return { r: parseInt(h[0]+h[0],16), g: parseInt(h[1]+h[1],16), b: parseInt(h[2]+h[2],16), a: parseInt(h[3]+h[3],16)/255 };
        } else if (h.length === 6) {
            return { r: parseInt(h.substr(0,2),16), g: parseInt(h.substr(2,2),16), b: parseInt(h.substr(4,2),16), a: 1 };
        } else if (h.length === 8) {
            return { r: parseInt(h.substr(0,2),16), g: parseInt(h.substr(2,2),16), b: parseInt(h.substr(4,2),16), a: parseInt(h.substr(6,2),16)/255 };
        }
    }

    // rgb() / rgba()
    var rgbMatch = str.match(/^rgba?\s*\(\s*([\d.]+)\s*[,/\s]\s*([\d.]+)\s*[,/\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
    if (rgbMatch) {
        return {
            r: Math.round(parseFloat(rgbMatch[1])),
            g: Math.round(parseFloat(rgbMatch[2])),
            b: Math.round(parseFloat(rgbMatch[3])),
            a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1
        };
    }

    // hsl() / hsla()
    var hslMatch = str.match(/^hsla?\s*\(\s*([\d.]+)\s*[,/\s]\s*([\d.]+)%?\s*[,/\s]\s*([\d.]+)%?(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
    if (hslMatch) {
        var hue = parseFloat(hslMatch[1]) / 360;
        var sat = parseFloat(hslMatch[2]) / 100;
        var lig = parseFloat(hslMatch[3]) / 100;
        var alpha = hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1;
        var rgb = hslToRgb(hue, sat, lig);
        return { r: rgb[0], g: rgb[1], b: rgb[2], a: alpha };
    }

    return null; // could not parse
}

function hslToRgb(h, s, l) {
    var r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        var hue2rgb = function(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
