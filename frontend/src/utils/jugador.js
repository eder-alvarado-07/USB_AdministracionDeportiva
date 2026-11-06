// Formato común para mostrar a un jugador con su número de camiseta en todo el sistema.

export function tieneDorsal(dorsal) {
  return dorsal !== null && dorsal !== undefined && dorsal !== ''
}

// "#7 Andrés Contreras" o solo el nombre si no tiene dorsal
export function nombreConDorsal(nombre, dorsal) {
  return tieneDorsal(dorsal) ? `#${dorsal} ${nombre}` : (nombre || '')
}

// Atajo para objetos jugador ({ nombre, dorsal })
export function etiquetaJugador(j) {
  return j ? nombreConDorsal(j.nombre, j.dorsal) : ''
}

// Ordena por dorsal (sin dorsal al final) y luego por nombre
export function ordenarPorDorsal(a, b) {
  const da = tieneDorsal(a.dorsal) ? Number(a.dorsal) : 1000
  const db = tieneDorsal(b.dorsal) ? Number(b.dorsal) : 1000
  return da - db || String(a.nombre).localeCompare(String(b.nombre), 'es')
}
