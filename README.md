# GrdToAfpaletteExtended

An extended fork of [Balakov/GrdToAfpalette](https://github.com/Balakov/GrdToAfpalette) — convert Adobe Photoshop `.grd`, GIMP `.ggr`, and Krita `.kgr` gradient files to Affinity `.afpalette` files.

> **Note:** This extended version was developed with the assistance of AI tools (GitHub Copilot / Claude).

## Features

- **Multi-format support**: Adobe `.grd` (v5), GIMP `.ggr`, and Krita `.kgr` gradient files
- **Affinity 2 / Unified Affinity compatible**: Correct CRC32 checksums for full compatibility
- **Group detection**: Automatically detects gradient groups from Photoshop `.grd` files
- **Group-based browsing**: Navigate through individual groups via clickable tabs in the preview
- **Flexible export**:
  - Download all gradients as a single `.afpalette` file
  - Download individual groups as separate `.afpalette` files
  - Download all groups as a `.zip` archive (one `.afpalette` per group, organized in a folder)
- **Large file support**: Handles GRD files with hundreds or thousands of gradients
- **Paginated preview**: Browse gradients 100 at a time for smooth performance
- **Client-side only**: No files are uploaded to a server — all processing happens in the browser

## Usage

1. Open the tool in a browser
2. Click "Convert Gradient File..." and select your `.grd`, `.ggr`, or `.kgr` file
3. Browse the gradient preview — if groups are detected, use the tabs to filter by group
4. Download options:
   - **Single file**: Click "Download All" to get everything in one `.afpalette`
   - **Single group**: Select a group tab, then click the download button for just that group
   - **ZIP archive**: Click "Download All Groups as ZIP" to get a `.zip` file containing one `.afpalette` per group in a folder

## Limitations

- Only RGB and HSV/HSB gradients are supported. CMYK, LAB, Greyscale, and Book Color gradients are skipped during conversion.
- Transparency is only partially supported. Adobe gradients have a separate transparency track independent from colours. The tool inserts interpolated colour stops to approximate transparency, which may not be a perfect match.

## Technical Details

### The .afpalette Format

The Affinity palette format is a chunk-based binary format with a header (80 bytes), body, and footer (115 bytes). A CRC32 checksum (polynomial `0xEDB88320`) is computed over the body and written to two positions in the footer. Without a valid checksum, Affinity 2 rejects the file.

### GRD Group Hierarchy

Photoshop `.grd` v5 files can contain a hierarchy section near the end of the file, preceded by `8BIMphry` and `hierarchy`. This section contains a `VlLs` (Value List) with `Objc` (Object) entries of three class types:

- **`Grup`** — group start (contains a `Nm` TEXT field with the group name)
- **`groupEnd`** — group end marker
- **`preset`** — gradient reference (maps 1:1 to gradients in the main data)

Groups can be nested. The parser tracks a stack of group names and assigns each preset to the innermost (leaf) group.

### The Code

The `.grd` file loader uses a bounded chunk search approach (`GRDSkipToChunkInRange`, `GRDFindAllChunks`) to parse the binary format without requiring a full descriptor parser. After extracting gradient data, the code puts it into a simple JSON intermediate format before passing it to the `.afpalette` writer.

The `.afpalette` writer (`buildAffinityPaletteBuffer`) produces a `Uint8Array` buffer, which can either be saved directly or bundled into a ZIP archive using JSZip.

## Credits

- Original tool by [Mike Stimpson](https://mikestimpson.com) — [Balakov/GrdToAfpalette](https://github.com/Balakov/GrdToAfpalette)
- Extended version by [Colorwav3](https://github.com/Colorwav3) with AI assistance (GitHub Copilot / Claude)
- [JSZip](https://stuk.github.io/jszip/) for ZIP archive generation
- [Bootstrap 5](https://getbootstrap.com/) for the UI

## Useful Links

- [Description of .grd chunks](http://www.selapa.net/swatches/gradients/fileformats.php)
- [.grd file format description](https://github.com/tonton-pixel/json-photoshop-scripting/tree/master/Documentation/Photoshop-Gradients-File-Format#descriptor)
- [Official Adobe file formats](https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/#50577411_pgfId-1059252)
- [Adobe](https://www.adobe.com/)
- [Affinity](https://affinity.serif.com/)

## Disclaimer

This project is not affiliated with Adobe or Serif (Affinity). It is a community project provided under the MIT licence. Use at your own risk — no responsibility is taken for lost work due to crashes or malfunctions.

All trademarks and brand names are the property of their respective owners.
