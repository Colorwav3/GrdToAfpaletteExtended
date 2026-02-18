# GrdToAfpaletteExtended

A multi-format gradient converter — import from Photoshop `.grd`, GIMP `.ggr`, Krita `.kgr`, `.svg`, `.css`, and CPTCITY `.cpt`, then export to Affinity `.afpalette`, Photoshop `.grd`, GIMP `.ggr`, Krita `.kgr`, `.svg`, or `.css`.

Extended fork of [Balakov/GrdToAfpalette](https://github.com/Balakov/GrdToAfpalette).

> **Note:** This extended version was developed with the assistance of AI tools (GitHub Copilot / Claude).

## Features

### Import Formats
- Adobe Photoshop **`.grd`** (v5) — RGB, HSB, CMYK, Lab, Greyscale, Book Color
- GIMP **`.ggr`**
- Krita **`.kgr`**
- **SVG** (`<linearGradient>` / `<radialGradient>`)
- **CSS** (`linear-gradient()`)
- CPTCITY **`.cpt`**

### Export Formats
- Affinity **`.afpalette`** (Affinity Photo / Designer / Publisher 1 & 2)
- Adobe Photoshop **`.grd`** (v5)
- GIMP **`.ggr`**
- Krita **`.kgr`**
- **SVG** (defs with `<linearGradient>`)
- **CSS** (custom properties + utility classes)

### Color Space Support
- **RGB** and **HSV/HSB** — native
- **CMYK → RGB** conversion
- **CIE Lab → sRGB** conversion (D65 illuminant, gamma-corrected)
- **Greyscale → RGB** conversion
- **Book Color** fallback (reads embedded RGB or defaults to neutral gray)

### UI & Workflow
- Clean dark glassmorphism UI with gradient accents
- Scrollable preview grid with hover zoom
- Group detection from Photoshop `.grd` hierarchy — browsable via tabs
- One-click format selector to switch export target
- Download single file, individual group, or all groups as ZIP
- Client-side only — no files leave the browser

## Usage

1. Open the tool in a browser
2. Click **Choose File** and select any supported gradient file
3. Browse the gradient preview — use group tabs to filter if groups were detected
4. Select the target export format (afpalette, grd, ggr, kgr, svg, css)
5. Download:
   - **Single file** — all gradients in one file
   - **Single group** — select a group tab first
   - **ZIP archive** — one file per group in a folder

## Limitations

- Transparency is only partially supported. Adobe gradients have a separate transparency track independent from colours. The tool inserts interpolated colour stops to approximate transparency, which may not be a perfect match.
- CMYK/Lab conversion is device-independent (no ICC profiles) — colors may differ slightly from the original Photoshop rendering.

## Technical Details

### The .afpalette Format

The Affinity palette format is a chunk-based binary format with a header (80 bytes), body, and footer (115 bytes). A CRC32 checksum (polynomial `0xEDB88320`) is computed over the body and written to two positions in the footer. Without a valid checksum, Affinity 2 rejects the file.

### GRD Group Hierarchy

Photoshop `.grd` v5 files can contain a hierarchy section near the end of the file, preceded by `8BIMphry` and `hierarchy`. This section contains a `VlLs` (Value List) with `Objc` (Object) entries of three class types:

- **`Grup`** — group start (contains a `Nm` TEXT field with the group name)
- **`groupEnd`** — group end marker
- **`preset`** — gradient reference (maps 1:1 to gradients in the main data)

Groups can be nested. The parser tracks a stack of group names and assigns each preset to the innermost (leaf) group.

### Color Space Conversion

- **CMYK → RGB**: `R = (1-C)(1-K)`, `G = (1-M)(1-K)`, `B = (1-Y)(1-K)`
- **Lab → sRGB**: Lab → XYZ (D65 illuminant, CIE standard) → linear sRGB (3×3 matrix) → gamma-corrected sRGB
- **Greyscale → RGB**: `R = G = B = gray`
- **Book Color**: Attempts to read an embedded RGB fallback that Photoshop stores after the Book Color data; defaults to 50% gray if not found

### The Code

The `.grd` file loader uses a bounded chunk search approach (`GRDSkipToChunkInRange`, `GRDFindAllChunks`) to parse the binary format without requiring a full descriptor parser. After extracting gradient data, the code puts it into a simple JSON intermediate format that all export writers consume.

Export writers:
- `write_afpalette.js` — Affinity binary format with CRC32
- `write_grd.js` — Photoshop GRD v5 binary format
- `write_ggr.js` — GIMP/Krita text-based gradient format
- `write_svg.js` — SVG with `<linearGradient>` definitions
- `write_css.js` — CSS custom properties and utility classes

## Credits

- Original tool by [Mike Stimpson](https://mikestimpson.com) — [Balakov/GrdToAfpalette](https://github.com/Balakov/GrdToAfpalette)
- Extended version by [Colorwav3](https://github.com/Colorwav3) with AI assistance (GitHub Copilot / Claude)
- [JSZip](https://stuk.github.io/jszip/) for ZIP archive generation

## Useful Links

- [Description of .grd chunks](http://www.selapa.net/swatches/gradients/fileformats.php)
- [.grd file format description](https://github.com/tonton-pixel/json-photoshop-scripting/tree/master/Documentation/Photoshop-Gradients-File-Format#descriptor)
- [Official Adobe file formats](https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/#50577411_pgfId-1059252)
- [Adobe](https://www.adobe.com/)
- [Affinity](https://affinity.serif.com/)

## Disclaimer

This project is not affiliated with Adobe or Serif (Affinity). It is a community project provided under the MIT licence. Use at your own risk — no responsibility is taken for lost work due to crashes or malfunctions.

All trademarks and brand names are the property of their respective owners.
