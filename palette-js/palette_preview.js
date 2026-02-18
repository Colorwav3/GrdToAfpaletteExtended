
let globalPaletteData;
let currentGroupFilter = null; // null = all, string = group name
let currentExportFormat = 'afpalette'; // default export format

const previewElement = document.getElementById("palette_preview");
const previewNameElement = document.getElementById("palette_preview_name");
const downloadElement = document.getElementById("download_card");
const uploadElement = document.getElementById("upload_card");

const PREVIEW_PAGE_SIZE = 100;
let currentPreviewPage = 0;

function getFilteredPalettes() {
    if (!globalPaletteData) return [];
    if (currentGroupFilter === null) return globalPaletteData.Palettes;
    return globalPaletteData.Palettes.filter(function(p) {
        return (p.Group || '(Ungrouped)') === currentGroupFilter;
    });
}

function previewPalette(paletteData) {
    globalPaletteData = paletteData;
    currentGroupFilter = null;
    currentPreviewPage = 0;

    const total = paletteData.Palettes.length;
    previewNameElement.textContent = paletteData.Name + " (" + total + " gradient" + (total !== 1 ? "s" : "") + ")";

    buildGroupTabs();
    renderPreviewPage();
    updateExportControls();

    uploadElement.classList.add('hidden');
    downloadElement.classList.remove('hidden');
}

function buildGroupTabs() {
    const container = document.getElementById("group_tabs");
    container.innerHTML = '';

    const hasGroups = globalPaletteData && globalPaletteData.Groups && globalPaletteData.Groups.length > 0;
    if (!hasGroups) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';

    // "All" tab
    var allTab = document.createElement("button");
    allTab.className = "group-tab active";
    allTab.textContent = "All (" + globalPaletteData.Palettes.length + ")";
    allTab.dataset.group = '__all__';
    allTab.onclick = function() { selectGroup(null); };
    container.appendChild(allTab);

    for (var i = 0; i < globalPaletteData.Groups.length; i++) {
        var g = globalPaletteData.Groups[i];
        var tab = document.createElement("button");
        tab.className = "group-tab";
        tab.textContent = g.name + " (" + g.count + ")";
        tab.dataset.group = g.name;
        tab.onclick = (function(name) {
            return function() { selectGroup(name); };
        })(g.name);
        container.appendChild(tab);
    }
}

function selectGroup(groupName) {
    currentGroupFilter = groupName;
    currentPreviewPage = 0;

    // Update active tab styling
    var tabs = document.getElementById("group_tabs").children;
    for (var i = 0; i < tabs.length; i++) {
        var tabGroup = tabs[i].dataset.group;
        if ((groupName === null && tabGroup === '__all__') || tabGroup === groupName) {
            tabs[i].classList.add('active');
        } else {
            tabs[i].classList.remove('active');
        }
    }

    // Update subtitle
    if (groupName !== null) {
        var filtered = getFilteredPalettes();
        previewNameElement.textContent = globalPaletteData.Name + " \u2014 " + groupName + " (" + filtered.length + " gradient" + (filtered.length !== 1 ? "s" : "") + ")";
    } else {
        var total = globalPaletteData.Palettes.length;
        previewNameElement.textContent = globalPaletteData.Name + " (" + total + " gradient" + (total !== 1 ? "s" : "") + ")";
    }

    renderPreviewPage();
    updateExportControls();
}

function renderPreviewPage() {
    var palettes = getFilteredPalettes();
    var total = palettes.length;
    var canvasSize = 48;

    previewElement.textContent = '';

    for (var i = 0; i < total; i++) {
        var canvasElement = document.createElement("canvas");
        canvasElement.width = canvasSize;
        canvasElement.height = canvasSize;

        var ctx = canvasElement.getContext("2d");

        // Checkerboard background
        var rowCount = 8;
        var columnCount = 8;
        var w = canvasSize / columnCount;
        var h = canvasSize / rowCount;

        for (var y = 0; y < rowCount; y++) {
            for (var x = 0; x < columnCount; x++) {
                if ((x % 2 == 0 && y % 2 == 0) || (x % 2 != 0 && y % 2 != 0)) {
                    ctx.fillStyle = "#a0a0a0";
                } else {
                    ctx.fillStyle = "#ffffff";
                }
                ctx.fillRect(x * w, y * h, w, h);
            }
        }

        ctx.translate(0.5, 0.5);

        for (var j = 0; j < canvasSize; j++) {
            var t = j / canvasSize;
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(canvasSize, j);

            var colour = gradientUtils.getColourFromGradient(palettes[i].Colours, t);
            var colourString = 'rgba(' + (colour.Red * 255.0).toFixed() + ',' + (colour.Green * 255.0).toFixed() + ',' + (colour.Blue * 255.0).toFixed() + ',' + colour.Alpha.toFixed(3) + ')';

            ctx.strokeStyle = colourString;
            ctx.stroke();
        }

        // Sample average color for glow effect
        var avgR = 0, avgG = 0, avgB = 0, samples = 5;
        for (var s = 0; s < samples; s++) {
            var st = (s + 0.5) / samples;
            var sc = gradientUtils.getColourFromGradient(palettes[i].Colours, st);
            avgR += sc.Red; avgG += sc.Green; avgB += sc.Blue;
        }
        avgR = Math.round((avgR / samples) * 255);
        avgG = Math.round((avgG / samples) * 255);
        avgB = Math.round((avgB / samples) * 255);

        var gradientElement = document.createElement("div");
        gradientElement.classList.add("gradient-preview");
        gradientElement.title = palettes[i].Name + (palettes[i].Group ? ' [' + palettes[i].Group + ']' : '');
        gradientElement.style.setProperty('--glow-r', avgR);
        gradientElement.style.setProperty('--glow-g', avgG);
        gradientElement.style.setProperty('--glow-b', avgB);
        gradientElement.appendChild(canvasElement);

        previewElement.appendChild(gradientElement);
    }
}

function updateExportControls() {
    var hasGroups = globalPaletteData && globalPaletteData.Groups && globalPaletteData.Groups.length > 0;
    var singleBtn = document.getElementById('export_single_btn');
    var groupBtn = document.getElementById('export_group_btn');
    var zipBtn = document.getElementById('export_zip_btn');
    var singleLabel = document.getElementById('export_single_label');
    var groupLabel = document.getElementById('export_group_label');
    var zipLabel = document.getElementById('export_zip_label');

    if (!hasGroups) {
        singleBtn.classList.remove('hidden');
        groupBtn.classList.add('hidden');
        zipBtn.classList.add('hidden');
        singleLabel.textContent = 'Download Palette';
    } else if (currentGroupFilter === null) {
        singleBtn.classList.remove('hidden');
        groupBtn.classList.add('hidden');
        zipBtn.classList.remove('hidden');
        singleLabel.textContent = 'Download All (' + globalPaletteData.Palettes.length + ')';
        zipLabel.textContent = 'All Groups as ZIP (' + globalPaletteData.Groups.length + ' files)';
    } else {
        var filtered = getFilteredPalettes();
        singleBtn.classList.add('hidden');
        groupBtn.classList.remove('hidden');
        zipBtn.classList.remove('hidden');
        groupLabel.textContent = 'Download "' + currentGroupFilter + '" (' + filtered.length + ')';
        zipLabel.textContent = 'All Groups as ZIP (' + globalPaletteData.Groups.length + ' files)';
    }
}

// Download all gradients in the selected format
function downloadAll() {
    exportInFormat(globalPaletteData);
}

// Download the currently selected group
function downloadCurrentGroup() {
    if (!currentGroupFilter) return;
    var filtered = getFilteredPalettes();
    var safeName = currentGroupFilter.replace(/[<>:"\/\\|?*]/g, '_');
    var partData = {
        Name: globalPaletteData.Name + " - " + safeName,
        Palettes: filtered
    };
    exportInFormat(partData);
}

function exportInFormat(data) {
    switch (currentExportFormat) {
        case 'afpalette':
            writeAffinityPalette(data);
            break;
        case 'grd':
            writePhotoshopGradient(data);
            break;
        case 'ggr':
            if (data.Palettes.length === 1) {
                writeGimpGradient(data.Palettes[0].Name, data.Palettes[0].Colours, 'ggr');
            } else {
                writeGgrZip(data, 'ggr');
            }
            break;
        case 'kgr':
            if (data.Palettes.length === 1) {
                writeGimpGradient(data.Palettes[0].Name, data.Palettes[0].Colours, 'kgr');
            } else {
                writeGgrZip(data, 'kgr');
            }
            break;
        case 'svg':
            writeSvgGradient(data);
            break;
        case 'css':
            writeCssGradient(data);
            break;
        default:
            writeAffinityPalette(data);
    }
}

function selectExportFormat(format) {
    currentExportFormat = format;

    // Update active button
    var btns = document.querySelectorAll('.format-btn');
    for (var i = 0; i < btns.length; i++) {
        if (btns[i].dataset.format === format) {
            btns[i].classList.add('active');
        } else {
            btns[i].classList.remove('active');
        }
    }

    // Update export button labels
    updateExportControls();
}

// Build file data for a single group in the selected export format
// Returns { data: ArrayBuffer|string|Blob, ext: string }
function buildExportForGroup(partData) {
    switch (currentExportFormat) {
        case 'afpalette':
            return { data: buildAffinityPaletteBuffer(partData), ext: '.afpalette' };
        case 'grd':
            return { data: buildGrdBuffer(partData), ext: '.grd' };
        case 'ggr':
            if (partData.Palettes.length === 1) {
                return { data: buildGgrText(partData.Palettes[0].Name, partData.Palettes[0].Colours), ext: '.ggr' };
            }
            var ggrParts = [];
            for (var gi = 0; gi < partData.Palettes.length; gi++) {
                ggrParts.push(buildGgrText(partData.Palettes[gi].Name, partData.Palettes[gi].Colours));
            }
            return { data: ggrParts.join('\n'), ext: '.ggr' };
        case 'kgr':
            if (partData.Palettes.length === 1) {
                return { data: buildGgrText(partData.Palettes[0].Name, partData.Palettes[0].Colours), ext: '.kgr' };
            }
            var kgrParts = [];
            for (var ki = 0; ki < partData.Palettes.length; ki++) {
                kgrParts.push(buildGgrText(partData.Palettes[ki].Name, partData.Palettes[ki].Colours));
            }
            return { data: kgrParts.join('\n'), ext: '.kgr' };
        case 'svg':
            return { data: buildSvgGradients(partData), ext: '.svg' };
        case 'css':
            return { data: buildCssGradients(partData), ext: '.css' };
        default:
            return { data: buildAffinityPaletteBuffer(partData), ext: '.afpalette' };
    }
}

// Download all groups as a ZIP archive with one file per group
async function downloadAllGroupsAsZip() {
    if (!globalPaletteData || !globalPaletteData.Groups || globalPaletteData.Groups.length === 0) return;

    var zipBtn = document.getElementById('export_zip_btn');
    var zipLabel = document.getElementById('export_zip_label');
    var originalText = zipLabel.textContent;
    zipBtn.disabled = true;
    zipLabel.textContent = 'Generating ZIP...';

    try {
        var zip = new JSZip();
        var folderName = globalPaletteData.Name;
        var folder = zip.folder(folderName);

        // Group palettes
        var groupedPalettes = {};
        var groupOrder = [];
        for (var i = 0; i < globalPaletteData.Palettes.length; i++) {
            var group = globalPaletteData.Palettes[i].Group || '(Ungrouped)';
            if (!groupedPalettes[group]) {
                groupedPalettes[group] = [];
                groupOrder.push(group);
            }
            groupedPalettes[group].push(globalPaletteData.Palettes[i]);
        }

        for (var g = 0; g < groupOrder.length; g++) {
            var groupName = groupOrder[g];
            var safeName = groupName.replace(/[<>:"\/\\|?*]/g, '_');
            var partData = {
                Name: folderName + " - " + safeName,
                Palettes: groupedPalettes[groupName]
            };
            var result = buildExportForGroup(partData);
            folder.file(safeName + result.ext, result.data);
        }

        var content = await zip.generateAsync({ type: "blob" });
        saveFile(content, folderName + ".zip");
    } finally {
        zipBtn.disabled = false;
        zipLabel.textContent = originalText;
    }
}

function convertAnotherPalette() {
    uploadElement.classList.remove('hidden');
    downloadElement.classList.add('hidden');
}
