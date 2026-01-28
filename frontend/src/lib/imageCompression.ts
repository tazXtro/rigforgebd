import imageCompression from "browser-image-compression"

/**
 * Options for image compression
 */
export interface ImageCompressionOptions {
    /** Maximum width or height in pixels (default: 1920) */
    maxDimension?: number
    /** Maximum file size in MB (default: 0.5 = 500KB) */
    maxSizeMB?: number
    /** Quality 0-1 for lossy formats (default: 0.8) */
    quality?: number
    /** Output file type (default: same as input, or webp for better compression) */
    fileType?: "image/jpeg" | "image/png" | "image/webp"
}

/**
 * Default compression options optimized for build images
 * - Max 1920px (good for display, not too large)
 * - Max 500KB file size
 * - 80% quality (good balance of quality vs size)
 * - WebP format for best compression
 */
const defaultOptions: Required<ImageCompressionOptions> = {
    maxDimension: 1920,
    maxSizeMB: 0.5, // 500KB
    quality: 0.8,
    fileType: "image/webp",
}

/**
 * Compress an image file for optimal storage
 * 
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise with compressed file and base64 data URL
 */
export async function compressImage(
    file: File,
    options: ImageCompressionOptions = {}
): Promise<{ file: File; dataUrl: string; originalSize: number; compressedSize: number }> {
    const opts = { ...defaultOptions, ...options }
    
    const originalSize = file.size
    
    // Compression options for browser-image-compression
    const compressionOptions = {
        maxSizeMB: opts.maxSizeMB,
        maxWidthOrHeight: opts.maxDimension,
        useWebWorker: true,
        fileType: opts.fileType,
        initialQuality: opts.quality,
        // Preserve EXIF data for orientation
        preserveExif: false,
    }
    
    try {
        // Compress the image
        const compressedFile = await imageCompression(file, compressionOptions)
        
        // Convert to base64 data URL
        const dataUrl = await fileToDataUrl(compressedFile)
        
        return {
            file: compressedFile,
            dataUrl,
            originalSize,
            compressedSize: compressedFile.size,
        }
    } catch (error) {
        console.error("Image compression failed:", error)
        throw new Error("Failed to compress image. Please try a different image.")
    }
}

/**
 * Convert a File to base64 data URL
 */
function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Calculate compression percentage
 */
export function getCompressionRatio(originalSize: number, compressedSize: number): number {
    return Math.round((1 - compressedSize / originalSize) * 100)
}
