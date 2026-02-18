
let globalPaletteData;

const previewElement = document.getElementById("palette_preview");
const previewNameElement = document.getElementById("palette_preview_name");
const downloadElement = document.getElementById("download_card");
const uploadElement = document.getElementById("upload_card");

const PREVIEW_PAGE_SIZE = 100;
let currentPreviewPage = 0;

function previewPalette(paletteData) {

    previewElement.textContent = '';
    currentPreviewPage = 0;

    const total = paletteData.Palettes.length;
    previewNameElement.textContent = paletteData.Name + " (" + total + " gradient" + (total !== 1 ? "s" : "") + ")";

    renderPreviewPage(paletteData);

    globalPaletteData = paletteData;

    // Configure split controls based on available groups
    const hasGroups = paletteData.Groups && paletteData.Groups.length > 0;
    const splitModeSelect = document.getElementById('splitMode');
    const splitSizeGroup = document.getElementById('split_size_group');
    const splitGroupInfo = document.getElementById('split_group_info');
    const splitCheckbox = document.getElementById('splitEnabled');

    // Reset state
    splitCheckbox.checked = false;
    splitSizeGroup.style.display = 'none';
    splitGroupInfo.style.display = 'none';

    if (hasGroups) {
        // Show group option in selector
        splitModeSelect.innerHTML = '<option value="groups">By groups (' + paletteData.Groups.length + ' groups)</option>'
            + '<option value="count">By count</option>';
    } else {
        splitModeSelect.innerHTML = '<option value="count">By count</option>';
    }

    uploadElement.style.display = 'none';
    downloadElement.style.display = 'block';
    updateDownloadLabel();
}

function renderPreviewPage(paletteData) {
    // Remove any existing pagination controls
    const existingControls = document.getElementById("preview_pagination");
    if (existingControls) {
        existingControls.remove();
    }

    const total = paletteData.Palettes.length;
    const start = currentPreviewPage * PREVIEW_PAGE_SIZE;
    const end = Math.min(start + PREVIEW_PAGE_SIZE, total);
    const canvasSize = 48;

    // Clear preview area
    previewElement.textContent = '';

    for (let i = start; i < end; i++) {
        const canvasElement = document.createElement("canvas");
        canvasElement.width = canvasSize;
        canvasElement.height = canvasSize;

        const ctx = canvasElement.getContext("2d");

        // Checkerboard background
        const rowCount = 8;
        const columnCount = 8;
        const w = canvasSize / columnCount;
        const h = canvasSize / rowCount;

        for (let y = 0; y < rowCount; y++) {
            for (let x = 0; x < columnCount; x++) {
                if ((x % 2 == 0 && y % 2 == 0) || (x % 2 != 0 && y % 2 != 0)) {
                    ctx.fillStyle = "#a0a0a0";
                } else {
                    ctx.fillStyle = "#ffffff";
                }

                ctx.fillRect(x * w, y * h, w, h);
            }
        }

        ctx.translate(0.5, 0.5);

        for (let j = 0; j < canvasSize; j++) {
            const t = j / canvasSize;
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(canvasSize, j);

            const colour = gradientUtils.getColourFromGradient(paletteData.Palettes[i].Colours, t);
            const colourString = 'rgba(' + (colour.Red * 255.0).toFixed() + ',' + (colour.Green * 255.0).toFixed() + ',' + (colour.Blue * 255.0).toFixed() + ',' + colour.Alpha.toFixed(3) + ')';

            ctx.strokeStyle = colourString;
            ctx.stroke();
        }

        const gradientElement = document.createElement("div");
        gradientElement.classList.add("gradient-preview");
        gradientElement.title = paletteData.Palettes[i].Name;
        gradientElement.appendChild(canvasElement);

        previewElement.appendChild(gradientElement);
    }

    // Add pagination controls if needed
    if (total > PREVIEW_PAGE_SIZE) {
        const totalPages = Math.ceil(total / PREVIEW_PAGE_SIZE);
        const controls = document.createElement("div");
        controls.id = "preview_pagination";
        controls.className = "d-flex justify-content-center align-items-center gap-3 mt-3 w-100";

        const prevBtn = document.createElement("button");
        prevBtn.className = "btn btn-sm btn-outline-light";
        prevBtn.textContent = "\u25C0 Previous";
        prevBtn.disabled = currentPreviewPage === 0;
        prevBtn.onclick = function () {
            currentPreviewPage--;
            renderPreviewPage(paletteData);
        };

        const info = document.createElement("span");
        info.className = "text-light";
        info.textContent = "Page " + (currentPreviewPage + 1) + " of " + totalPages + " (" + (start + 1) + "\u2013" + end + " of " + total + ")";

        const nextBtn = document.createElement("button");
        nextBtn.className = "btn btn-sm btn-outline-light";
        nextBtn.textContent = "Next \u25B6";
        nextBtn.disabled = currentPreviewPage >= totalPages - 1;
        nextBtn.onclick = function () {
            currentPreviewPage++;
            renderPreviewPage(paletteData);
        };

        controls.appendChild(prevBtn);
        controls.appendChild(info);
        controls.appendChild(nextBtn);

        // Insert pagination after the preview, inside the card
        previewElement.parentElement.appendChild(controls);
    }
}

function toggleSplitControls() {
    const enabled = document.getElementById('splitEnabled').checked;
    const splitOptions = document.getElementById('split_options');
    splitOptions.style.display = enabled ? 'flex' : 'none';
    onSplitModeChange();
}

function onSplitModeChange() {
    const mode = document.getElementById('splitMode').value;
    const splitSizeGroup = document.getElementById('split_size_group');
    const splitGroupInfo = document.getElementById('split_group_info');

    splitSizeGroup.style.display = mode === 'count' ? 'flex' : 'none';

    if (mode === 'groups' && globalPaletteData && globalPaletteData.Groups) {
        const lines = globalPaletteData.Groups.map(function(g) {
            return g.name + ' (' + g.count + ')';
        });
        splitGroupInfo.textContent = lines.join(', ');
        splitGroupInfo.style.display = 'block';
    } else {
        splitGroupInfo.style.display = 'none';
    }

    updateDownloadLabel();
}

function updateDownloadLabel() {
    const label = document.getElementById('download_label');
    if (!globalPaletteData) return;

    const splitEnabled = document.getElementById('splitEnabled').checked;
    if (!splitEnabled) {
        label.textContent = "Download Affinity Palette";
        return;
    }

    const mode = document.getElementById('splitMode').value;
    if (mode === 'groups' && globalPaletteData.Groups && globalPaletteData.Groups.length > 0) {
        const fileCount = globalPaletteData.Groups.length;
        label.textContent = "Download " + fileCount + " Affinity Palette" + (fileCount !== 1 ? "s" : "");
    } else {
        const splitSize = Math.max(1, parseInt(document.getElementById('splitSize').value) || 50);
        const total = globalPaletteData.Palettes.length;
        const fileCount = Math.ceil(total / splitSize);
        label.textContent = "Download " + fileCount + " Affinity Palette" + (fileCount !== 1 ? "s" : "");
    }
}

function downloadPreviewedPalette() {
    const splitEnabled = document.getElementById('splitEnabled').checked;

    if (!splitEnabled) {
        writeAffinityPalette(globalPaletteData);
        return;
    }

    const mode = document.getElementById('splitMode').value;

    if (mode === 'groups' && globalPaletteData.Groups && globalPaletteData.Groups.length > 0) {
        // Split by groups: each group becomes a separate file
        const groupedPalettes = {};
        const groupOrder = [];

        for (let i = 0; i < globalPaletteData.Palettes.length; i++) {
            const group = globalPaletteData.Palettes[i].Group || '(Ungrouped)';
            if (!groupedPalettes[group]) {
                groupedPalettes[group] = [];
                groupOrder.push(group);
            }
            groupedPalettes[group].push(globalPaletteData.Palettes[i]);
        }

        for (let part = 0; part < groupOrder.length; part++) {
            const groupName = groupOrder[part];
            const safeName = groupName.replace(/[<>:"/\\|?*]/g, '_');
            const partData = {
                Name: globalPaletteData.Name + " - " + safeName,
                Palettes: groupedPalettes[groupName]
            };

            setTimeout(function() {
                writeAffinityPalette(partData);
            }, part * 500);
        }
    } else {
        // Split by count
        const splitSize = Math.max(1, parseInt(document.getElementById('splitSize').value) || 50);
        const total = globalPaletteData.Palettes.length;
        const fileCount = Math.ceil(total / splitSize);

        for (let part = 0; part < fileCount; part++) {
            const start = part * splitSize;
            const end = Math.min(start + splitSize, total);
            const partData = {
                Name: globalPaletteData.Name + "_Part" + (part + 1),
                Palettes: globalPaletteData.Palettes.slice(start, end)
            };

            setTimeout(function() {
                writeAffinityPalette(partData);
            }, part * 500);
        }
    }
}

function convertAnotherPalette() {
    uploadElement.style.display = 'block';
    downloadElement.style.display = 'none';
}
