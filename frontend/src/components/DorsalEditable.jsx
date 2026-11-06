import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { tieneDorsal } from '../utils/jugador'

// Número de camiseta con edición en línea: clic → escribir → Enter (o salir del campo) guarda,
// Escape cancela. Vacío quita el dorsal. Si el número está ocupado, el backend responde quién lo usa.
export default function DorsalEditable({ jugador, puedeEditar, onCambio }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [recienGuardado, setRecienGuardado] = useState(false)
  const input = useRef(null)
  // Evita guardar dos veces: al desactivar el campo, el navegador dispara blur mientras se guarda
  const enCurso = useRef(false)

  useEffect(() => { if (editando) input.current?.select() }, [editando])

  const chip = (
    <span className={`dorsal-chip${tieneDorsal(jugador.dorsal) ? '' : ' vacio'}`}>
      {tieneDorsal(jugador.dorsal) ? jugador.dorsal : '–'}
    </span>
  )

  if (!puedeEditar) return chip

  const abrir = () => { setValor(tieneDorsal(jugador.dorsal) ? String(jugador.dorsal) : ''); setEditando(true) }

  const guardar = async () => {
    if (enCurso.current) return
    const limpio = valor.trim()
    const actual = tieneDorsal(jugador.dorsal) ? String(jugador.dorsal) : ''
    if (limpio === actual) { setEditando(false); return }
    if (limpio !== '' && !/^\d{1,2}$/.test(limpio)) {
      toast.error('El dorsal debe ser un número entre 0 y 99')
      input.current?.focus()
      return
    }
    enCurso.current = true
    setGuardando(true)
    let ok = false
    try {
      const { data } = await api.patch(`/jugadores/${jugador.id}/dorsal`, { dorsal: limpio === '' ? null : Number(limpio) })
      toast.success(data.dorsal === null ? `Dorsal quitado a ${jugador.nombre}` : `${jugador.nombre} ahora usa el ${data.dorsal}`)
      onCambio?.(data.dorsal)
      ok = true
      setEditando(false)
      setRecienGuardado(true)
      setTimeout(() => setRecienGuardado(false), 450)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setGuardando(false)
      enCurso.current = false
      // Si falló, el campo sigue abierto y recupera el foco para corregir el número
      if (!ok) setTimeout(() => input.current?.focus(), 0)
    }
  }

  if (editando) {
    return (
      <input
        ref={input}
        className="dorsal-input"
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={valor}
        disabled={guardando}
        aria-label={`Dorsal de ${jugador.nombre}`}
        onChange={e => setValor(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); guardar() }
          if (e.key === 'Escape') setEditando(false)
        }}
        onBlur={guardar}
      />
    )
  }

  return (
    <button type="button" className={`dorsal-chip dorsal-editable${tieneDorsal(jugador.dorsal) ? '' : ' vacio'}${recienGuardado ? ' guardado' : ''}`}
      onClick={abrir} title="Cambiar dorsal" aria-label={`Dorsal de ${jugador.nombre}: ${tieneDorsal(jugador.dorsal) ? jugador.dorsal : 'sin asignar'}. Cambiar`}>
      {tieneDorsal(jugador.dorsal) ? jugador.dorsal : '–'}
    </button>
  )
}
