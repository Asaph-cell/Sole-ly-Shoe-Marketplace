/**
 * Compresses an image file using the browser Canvas API.
 * Resizes large images and reduces quality to keep file sizes manageable
 * for upload, without noticeable quality loss for product photos.
 */

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const QUALITY = 0.8; // JPEG quality (0-1)
const MAX_FILE_SIZE_MB = 5;

export function isFileTooLarge(file: File): boolean {
    return file.size > MAX_FILE_SIZE_MB * 1024 * 1024;
}

export function getFileSizeMB(file: File): string {
    return (file.size / (1024 * 1024)).toFixed(1);
}

export async function compressImage(file: File): Promise<File> {
    // If it's not an image, return as-is
    if (!file.type.startsWith("image/")) return file;

    // If it's a GIF or SVG, skip compression (canvas can't handle these well)
    if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.onload = () => {
                try {
                    let { width, height } = img;

                    // Calculate new dimensions while maintaining aspect ratio
                    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    // Draw to canvas
                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                        resolve(file); // fallback to original
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to blob
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                resolve(file); // fallback to original
                                return;
                            }

                            // Only use compressed version if it's actually smaller
                            if (blob.size < file.size) {
                                const compressedFile = new File([blob], file.name, {
                                    type: "image/jpeg",
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                resolve(file);
                            }
                        },
                        "image/jpeg",
                        QUALITY
                    );
                } catch {
                    resolve(file); // fallback on any error
                }
            };

            img.onerror = () => resolve(file); // fallback
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(file);
    });
}

/**
 * Compresses multiple image files in parallel.
 */
export async function compressImages(files: File[]): Promise<File[]> {
    return Promise.all(files.map(compressImage));
}
