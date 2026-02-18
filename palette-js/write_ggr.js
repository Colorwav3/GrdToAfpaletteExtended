// ================================================
// GIMP Gradient (.ggr) Writer
// Also used by Krita (.kgr) — same format
// ================================================

/**
 * Build a GIMP gradient text string from paletteData.
 * The GIMP Gradient format stores segments, each with:
 *   leftPos midPos rightPos  leftR leftG leftB leftA  rightR rightG rightB rightA  blendFunc colorType
 *
 * We convert our stop-based format to segments by pairing consecutive stops.
 */
function buildGgrText(paletteName, colours) {
    var lines = [];
    lines.push("GIMP Gradient");
    lines.push("Name: " + paletteName);

    // We need at least 2 stops to form segments
    if (colours.length < 2) {
        lines.push("1");
        var c = colours[0] || { Red: 0, Green: 0, Blue: 0, Alpha: 1, Position: 0 };
        lines.push(
            "0.000000 0.500000 1.000000 " +
            c.Red.toFixed(6) + " " + c.Green.toFixed(6) + " " + c.Blue.toFixed(6) + " " + c.Alpha.toFixed(6) + " " +
            c.Red.toFixed(6) + " " + c.Green.toFixed(6) + " " + c.Blue.toFixed(6) + " " + c.Alpha.toFixed(6) + " " +
            "0 0"
        );
        return lines.join("\n") + "\n";
    }

    var segmentCount = colours.length - 1;
    lines.push(String(segmentCount));

    for (var i = 0; i < segmentCount; i++) {
        var left = colours[i];
        var right = colours[i + 1];

        var leftPos = left.Position;
        var rightPos = right.Position;

        // Convert midpoint (0-1 relative within segment) to absolute position
        var midpoint = right.Midpoint !== undefined ? right.Midpoint : 0.5;
        var midPos = leftPos + midpoint * (rightPos - leftPos);

        // blendFunc: 0 = linear, colorType: 0 = RGB
        var line =
            leftPos.toFixed(6) + " " + midPos.toFixed(6) + " " + rightPos.toFixed(6) + " " +
            left.Red.toFixed(6) + " " + left.Green.toFixed(6) + " " + left.Blue.toFixed(6) + " " + left.Alpha.toFixed(6) + " " +
            right.Red.toFixed(6) + " " + right.Green.toFixed(6) + " " + right.Blue.toFixed(6) + " " + right.Alpha.toFixed(6) + " " +
            "0 0";

        lines.push(line);
    }

    return lines.join("\n") + "\n";
}

/**
 * Download a single gradient as a .ggr file.
 */
function writeGimpGradient(paletteName, colours, extension) {
    extension = extension || "ggr";
    var text = buildGgrText(paletteName, colours);
    var blob = new Blob([text], { type: "text/plain" });
    var safeName = paletteName.replace(/[<>:"\/\\|?*]/g, '_');
    saveFile(blob, safeName + "." + extension);
}

/**
 * Download all gradients as a ZIP of .ggr files.
 */
async function writeGgrZip(paletteData, extension) {
    extension = extension || "ggr";
    var zip = new JSZip();
    var folderName = paletteData.Name;
    var folder = zip.folder(folderName);

    for (var i = 0; i < paletteData.Palettes.length; i++) {
        var p = paletteData.Palettes[i];
        var safeName = p.Name.replace(/[<>:"\/\\|?*]/g, '_');
        var text = buildGgrText(p.Name, p.Colours);
        folder.file(safeName + "." + extension, text);
    }

    var content = await zip.generateAsync({ type: "blob" });
    saveFile(content, folderName + "_" + extension + ".zip");
}
