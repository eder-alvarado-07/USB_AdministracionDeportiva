// Equipo, hora y lugar de un entrenamiento o partido (v1.7: agenda por equipo).
// v2.0 (DEF-042): solo el administrador puede crear una actividad "General (todos los equipos)". El entrenador
// ve únicamente los equipos y categorías de su deporte (el servidor aplica la misma regla) y debe elegir uno.
import { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

// Solo lo usan quienes crean o editan la agenda (administrador y entrenador); los demás roles no consultan equipos
export function useEquiposAsignables(activo = true) {
  const { usuario } = useAuth()
  const [equipos, setEquipos] = useState([])
  useEffect(() => {
    if (!activo) return undefined
    let vivo = true
    // El servidor ya devuelve al entrenador solo los equipos de su deporte
    api.get('/equipos')
      .then(({ data }) => { if (vivo) setEquipos(data) })
      .catch(() => { /* sin equipos disponibles */ })
    return () => { vivo = false }
  }, [usuario?.rol, activo])
  return equipos
}

// Valores iniciales y valores desde una actividad existente
export const AGENDA_VACIA = { equipo_id: '', hora: '', lugar: '' }
export const agendaDe = (a) => ({ equipo_id: a.equipo_id ? String(a.equipo_id) : '', hora: a.hora || '', lugar: a.lugar || '' })

// Valor inicial del equipo: si el entrenador tiene un solo equipo, ya queda elegido
export function equipoInicial(equipos, rol) {
  return rol !== 'administrador' && equipos.length === 1 ? String(equipos[0].id) : ''
}

export default function CamposAgenda({ form, onChange, equipos, lugarEjemplo = 'Ej. Cancha sintética' }) {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'administrador'
  // Agrupados por deporte para el administrador, que ve todos
  const porDeporte = equipos.reduce((acc, e) => {
    const k = e.disciplina_nombre || 'Sin deporte'
    ;(acc[k] = acc[k] || []).push(e)
    return acc
  }, {})
  const opcion = (e) => (
    <option key={e.id} value={e.id}>{e.nombre}{(e.categoria_nombre || e.categoria) ? ` · ${e.categoria_nombre || e.categoria}` : ''}</option>
  )
  return (
    <>
      <div className="form-group">
        <label htmlFor="agenda-equipo">Equipo {esAdmin ? '' : '*'}</label>
        <select id="agenda-equipo" name="equipo_id" value={form.equipo_id} onChange={onChange} required={!esAdmin}>
          {esAdmin
            ? <option value="">General (todos los equipos)</option>
            : <option value="" disabled>{equipos.length ? 'Elige el equipo' : 'No tienes equipos asignados'}</option>}
          {esAdmin
            ? Object.entries(porDeporte).map(([dep, lista]) => <optgroup key={dep} label={dep}>{lista.map(opcion)}</optgroup>)
            : equipos.map(opcion)}
        </select>
        {!esAdmin && equipos.length === 0 && (
          <small className="ayuda-campo">Pide al administrador que cree un equipo de tu deporte.</small>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="agenda-hora">Hora</label>
        <input id="agenda-hora" name="hora" type="time" value={form.hora} onChange={onChange} />
      </div>
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="agenda-lugar">Lugar</label>
        <input id="agenda-lugar" name="lugar" value={form.lugar} onChange={onChange} placeholder={lugarEjemplo} />
      </div>
    </>
  )
}

// "Equipo · Lugar · 17:30" para mostrar debajo del nombre en tablas y listas
export const resumenAgenda = (a) => [a.equipo_nombre || (a.equipo_id ? null : 'General'), a.lugar, a.hora].filter(Boolean).join(' · ')
