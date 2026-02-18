
let globalPaletteData;
let currentGroupFilter = null; // null = all, string = group name

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

    uploadElement.style.display = 'none';
    downloadElement.style.display = 'block';
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
    allTab.className = "btn btn-sm btn-outline-light rounded-pill active";
    allTab.textContent = "All (" + globalPaletteData.Palettes.length + ")";
    allTab.dataset.group = '__all__';
    allTab.onclick = function() { selectGroup(null); };
    container.appendChild(allTab);

    for (var i = 0; i < globalPaletteData.Groups.length; i++) {
        var g = globalPaletteData.Groups[i];
        var tab = document.createElement("button");
        tab.className = "btn btn-sm btn-outline-light rounded-pill";
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
    // Remove existing pagination
    var existingControls = document.getElementById("preview_pagination");
    if (existingControls) existingControls.remove();

    var palettes = getFilteredPalettes();
    var total = palettes.length;
    var start = currentPreviewPage * PREVIEW_PAGE_SIZE;
    var end = Math.min(start + PREVIEW_PAGE_SIZE, total);
    var canvasSize = 48;

    previewElement.textContent = '';

    for (var i = start; i < end; i++) {
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

        var gradientElement = document.createElement("div");
        gradientElement.classList.add("gradient-preview");
        gradientElement.title = palettes[i].Name + (palettes[i].Group ? ' [' + palettes[i].Group + ']' : '');
        gradientElement.appendChild(canvasElement);

        previewElement.appendChild(gradientElement);
    }

    // Add pagination controls if needed
    if (total > PREVIEW_PAGE_SIZE) {
        var totalPages = Math.ceil(total / PREVIEW_PAGE_SIZE);
        var controls = document.createElement("div");
        controls.id = "preview_pagination";
        controls.className = "d-flex justify-content-center align-items-center gap-3 mt-3 w-100";

        var prevBtn = document.createElement("button");
        prevBtn.className = "btn btn-sm btn-outline-light";
        prevBtn.textContent = "\u25C0 Previous";
        prevBtn.disabled = currentPreviewPage === 0;
        prevBtn.onclick = function() {
            currentPreviewPage--;
            renderPreviewPage();
        };

        var info = document.createElement("span");
        info.className = "text-light";
        info.textContent = "Page " + (currentPreviewPage + 1) + " of " + totalPages + " (" + (start + 1) + "\u2013" + end + " of " + total + ")";

        var nextBtn = document.createElement("button");
        nextBtn.className = "btn btn-sm btn-outline-light";
        nextBtn.textContent = "Next \u25B6";
        nextBtn.disabled = currentPreviewPage >= totalPages - 1;
        nextBtn.onclick = function() {
            currentPreviewPage++;
            renderPreviewPage();
        };

        controls.appendChild(prevBtn);
        controls.appendChild(info);
        controls.appendChild(nextBtn);

        previewElement.parentElement.appendChild(controls);
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
        // No groups — simple single-file export
        singleBtn.style.display = '';
        groupBtn.style.display = 'none';
        zipBtn.style.display = 'none';
        singleLabel.textContent = 'Download Affinity Palette';
    } else if (currentGroupFilter === null) {
        // "All" view — download everything + ZIP option
        singleBtn.style.display = '';
        groupBtn.style.display = 'none';
        zipBtn.style.display = '';
        singleLabel.textContent = 'Download All (' + globalPaletteData.Palettes.length + ' gradients)';
        zipLabel.textContent = 'Download All Groups as ZIP (' + globalPaletteData.Groups.length + ' files)';
    } else {
        // Specific group — download this group + ZIP option
        var filtered = getFilteredPalettes();
        singleBtn.style.display = 'none';
        groupBtn.style.display = '';
        zipBtn.style.display = '';
        groupLabel.textContent = 'Download "' + currentGroupFilter + '" (' + filtered.length + ' gradients)';
        zipLabel.textContent = 'Download All Groups as ZIP (' + globalPaletteData.Groups.length + ' files)';
    }
}

// Download all gradients as a single .afpalette file
function downloadAll() {
    writeAffinityPalette(globalPaletteData);
}

// Download the currently selected group as a single .afpalette file
function downloadCurrentGroup() {
    if (!currentGroupFilter) return;
    var filtered = getFilteredPalettes();
    var safeName = currentGroupFilter.replace(/[<>:"\/\\|?*]/g, '_');
    var partData = {
        Name: globalPaletteData.Name + " - " + safeName,
        Palettes: filtered
    };
    writeAffinityPalette(partData);
}

// Download all groups as a ZIP archive with one .afpalette per group inside a folder
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
            var buffer = buildAffinityPaletteBuffer(partData);
            folder.file(safeName + ".afpalette", buffer);
        }

        var content = await zip.generateAsync({ type: "blob" });
        saveFile(content, folderName + ".zip");
    } finally {
        zipBtn.disabled = false;
        zipLabel.textContent = originalText;
    }
}

function convertAnotherPalette() {
    uploadElement.style.display = 'block';
    downloadElement.style.display = 'none';
}
