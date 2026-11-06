/**
 * Normaliza y resuelve las URLs de imágenes (logos de equipos, fotos de deportistas).
 * Maneja rutas relativas (/uploads/...), data/blob URLs y previene fallos por 'http://localhost' en entornos Cloud.
 */
export function formatImageUrl(url) {
  if (!url) return ''
  const trimmed = String(url).trim()
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed

  // Si contiene /uploads/, extraer la ruta relativa limpia
  if (trimmed.includes('/uploads/')) {
    const idx = trimmed.indexOf('/uploads/')
    return trimmed.substring(idx)
  }

  return trimmed
}
