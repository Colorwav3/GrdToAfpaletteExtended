// ================================================
// SVG Gradient Writer
// Exports gradients as SVG <linearGradient> elements
// ================================================

/**
 * Build an SVG string containing all gradients as linearGradient definitions
 * with visual preview rectangles.
 */
function buildSvgGradients(paletteData) {
    var palettes = paletteData.Palettes;
    var barHeight = 40;
    var barWidth = 600;
    var gap = 8;
    var labelHeight = 16;
    var rowHeight = barHeight + labelHeight + gap;
    var svgHeight = palettes.length * rowHeight + gap;

    var lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + barWidth + '" height="' + svgHeight + '" viewBox="0 0 ' + barWidth + ' ' + svgHeight + '">');
    lines.push('  <defs>');

    for (var i = 0; i < palettes.length; i++) {
        var p = palettes[i];
        var id = 'gradient-' + i;
        lines.push('    <linearGradient id="' + escapeXml(id) + '" x1="0%" y1="0%" x2="100%" y2="0%">');

        for (var j = 0; j < p.Colours.length; j++) {
            var c = p.Colours[j];
            var r = Math.round(c.Red * 255);
            var g = Math.round(c.Green * 255);
            var b = Math.round(c.Blue * 255);
            var a = c.Alpha !== undefined ? c.Alpha : 1;
            var offset = (c.Position * 100).toFixed(2);

            lines.push('      <stop offset="' + offset + '%" stop-color="rgb(' + r + ',' + g + ',' + b + ')" stop-opacity="' + a.toFixed(3) + '"/>');
        }

        lines.push('    </linearGradient>');
    }

    lines.push('  </defs>');
    lines.push('');

    // Preview rectangles
    for (var i = 0; i < palettes.length; i++) {
        var y = i * rowHeight + gap;
        lines.push('  <text x="4" y="' + (y + labelHeight - 3) + '" font-family="sans-serif" font-size="11" fill="#333">' + escapeXml(palettes[i].Name) + '</text>');
        lines.push('  <rect x="0" y="' + (y + labelHeight) + '" width="' + barWidth + '" height="' + barHeight + '" fill="url(#gradient-' + i + ')" rx="4"/>');
    }

    lines.push('</svg>');
    return lines.join('\n');
}

/**
 * Build a minimal SVG string of gradient definitions only (no previews).
 */
function buildSvgDefsOnly(paletteData) {
    var palettes = paletteData.Palettes;
    var lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<svg xmlns="http://www.w3.org/2000/svg">');
    lines.push('  <defs>');

    for (var i = 0; i < palettes.length; i++) {
        var p = palettes[i];
        var safeId = p.Name.replace(/[^a-zA-Z0-9_-]/g, '_');
        lines.push('    <linearGradient id="' + escapeXml(safeId) + '" x1="0%" y1="0%" x2="100%" y2="0%">');

        for (var j = 0; j < p.Colours.length; j++) {
            var c = p.Colours[j];
            var r = Math.round(c.Red * 255);
            var g = Math.round(c.Green * 255);
            var b = Math.round(c.Blue * 255);
            var a = c.Alpha !== undefined ? c.Alpha : 1;
            var offset = (c.Position * 100).toFixed(2);
            lines.push('      <stop offset="' + offset + '%" stop-color="rgb(' + r + ',' + g + ',' + b + ')" stop-opacity="' + a.toFixed(3) + '"/>');
        }

        lines.push('    </linearGradient>');
    }

    lines.push('  </defs>');
    lines.push('</svg>');
    return lines.join('\n');
}

function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Download gradients as an SVG file.
 */
function writeSvgGradient(paletteData) {
    var text = buildSvgGradients(paletteData);
    var blob = new Blob([text], { type: "image/svg+xml" });
    var safeName = paletteData.Name.replace(/[<>:"\/\\|?*]/g, '_');
    saveFile(blob, safeName + ".svg");
}
