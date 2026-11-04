# Image Metadata module

Browser-only image metadata inspection and lossless metadata block removal.

## Current support

- Metadata inspection: formats handled by `exifr` (including JPEG, PNG, HEIC/HEIF, AVIF and TIFF), plus custom WebP and GIF metadata readers.
- Lossless metadata block removal: JPEG, PNG, WebP and GIF.
- View-only: HEIC/HEIF, AVIF and TIFF. No re-encoding fallback is used.
- Files are read with the browser File API and never uploaded.

## Important removal semantics

The current UI selects metadata groups. JPEG APP segments, PNG chunks, WebP RIFF chunks and GIF extension blocks are removed while compressed image payloads are copied unchanged. ICC profiles are preserved unless selected.

GPS and embedded thumbnails are nested inside EXIF in common JPEG/PNG/WebP files. In this initial implementation, selecting GPS or Thumbnail without selecting EXIF removes the containing EXIF block. This also removes other EXIF fields (including Orientation); the UI warns about this. A future field-level TIFF/EXIF IFD editor is needed to preserve unrelated EXIF tags while deleting only GPS or thumbnail entries.

The implementation does not decode and re-encode pixels. That preserves compressed image data, but removing orientation or color-profile metadata can change how some viewers display the image. ICC removal is therefore opt-in.

## Dependency

- `exifr`: browser-side metadata reader.
