import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const DeporteContext = createContext(null)

const STORAGE_KEY = 'dt_selected_sport_id'

export function DeporteProvider({ children }) {
  const { usuario, tienePermiso } = useAuth()
  // Los deportes de la universidad los crea y elimina solo el administrador (v1.9)
  const puedeGestionarDeportes = usuario?.rol === 'administrador'
  // Administrador y personal de salud ven todos los deportes; los demás roles, solo los suyos (el servidor ya los limita)
  const veTodosLosDeportes = ['administrador', 'personal_salud'].includes(usuario?.rol)

  const [disciplinas, setDisciplinas] = useState([])
  const [selectedSportId, setSelectedSportIdState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || ''
  })
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(true)
  const usuarioRol = useRef(usuario?.rol)
  usuarioRol.current = usuario?.rol

  const cargarDisciplinas = useCallback(async () => {
    try {
      setLoadingDisciplinas(true)
      const res = await api.get('/disciplinas')
      const lista = res.data || []
      setDisciplinas(lista)

      // Conserva el deporte elegido si sigue existiendo; si no hay ninguno, se muestran todos.
      // (Antes se elegía el primero de la lista y podía ocultar el plantel de un entrenador de otro deporte.)
      setSelectedSportIdState(prev => {
        // v2.0: quien tiene un solo deporte (el entrenador de rugby, sus deportistas) queda siempre en ese deporte
        if (!['administrador', 'personal_salud'].includes(usuarioRol.current) && lista.length === 1) {
          return String(lista[0].id)
        }
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'todos') return 'todos'
        if (stored && lista.some(d => String(d.id) === String(stored))) {
          return stored
        }
        if (prev && prev !== 'todos' && lista.some(d => String(d.id) === String(prev))) {
          return prev
        }
        localStorage.setItem(STORAGE_KEY, 'todos')
        return 'todos'
      })
    } catch (err) {
      console.error('Error al cargar deportes/disciplinas:', err)
    } finally {
      setLoadingDisciplinas(false)
    }
  }, [])

  useEffect(() => {
    if (usuario) {
      cargarDisciplinas()
    }
  }, [usuario, cargarDisciplinas])

  const setSelectedSportId = useCallback((id) => {
    const val = String(id || 'todos')
    setSelectedSportIdState(val)
    localStorage.setItem(STORAGE_KEY, val)
  }, [])

  // Deporte activo actualmente
  const selectedSport = useMemo(() => {
    if (!selectedSportId || selectedSportId === 'todos') {
      return { id: 'todos', nombre: 'Todos los deportes', esTodos: true }
    }
    const found = disciplinas.find(d => String(d.id) === String(selectedSportId))
    return found ? { ...found, esTodos: false } : { id: 'todos', nombre: 'Todos los deportes', esTodos: true }
  }, [disciplinas, selectedSportId])

  // Crear deporte
  const crearDisciplina = async (nombre) => {
    if (!nombre || !nombre.trim()) {
      toast.error('El nombre del deporte es obligatorio')
      return null
    }
    try {
      const res = await api.post('/disciplinas', { nombre: nombre.trim() })
      toast.success(`Deporte "${res.data.nombre}" creado exitosamente`)
      await cargarDisciplinas()
      setSelectedSportId(res.data.id)
      return res.data
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al crear deporte'
      toast.error(msg)
      throw err
    }
  }

  // Eliminar deporte
  const eliminarDisciplina = async (id, nombre = '') => {
    try {
      await api.delete(`/disciplinas/${id}`)
      toast.success(`Deporte ${nombre ? `"${nombre}" ` : ''}eliminado correctamente`)
      
      // Si el deporte eliminado era el seleccionado, cambiar al primer disponible o 'todos'
      if (String(selectedSportId) === String(id)) {
        const restantes = disciplinas.filter(d => String(d.id) !== String(id))
        if (restantes.length > 0) {
          setSelectedSportId(restantes[0].id)
        } else {
          setSelectedSportId('todos')
        }
      }
      await cargarDisciplinas()
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al eliminar deporte'
      toast.error(msg)
      throw err
    }
  }

  return (
    <DeporteContext.Provider
      value={{
        disciplinas,
        selectedSportId,
        selectedSport,
        setSelectedSportId,
        loadingDisciplinas,
        cargarDisciplinas,
        crearDisciplina,
        eliminarDisciplina,
        puedeGestionarDeportes,
        veTodosLosDeportes,
        // Un solo deporte posible: no tiene sentido mostrar un selector (v2.0)
        deporteUnico: !veTodosLosDeportes && disciplinas.length === 1 ? disciplinas[0] : null,
      }}
    >
      {children}
    </DeporteContext.Provider>
  )
}

export function useDeporte() {
  const ctx = useContext(DeporteContext)
  if (!ctx) {
    throw new Error('useDeporte debe usarse dentro de un DeporteProvider')
  }
  return ctx
}

// Filtro por el deporte elegido en la cabecera (v1.9). `deActividad` deja pasar las actividades generales (sin equipo).
export function useFiltroDeporte() {
  const { selectedSportId, selectedSport, setSelectedSportId } = useDeporte()
  const hay = !!selectedSportId && selectedSportId !== 'todos'
  const igual = (id) => String(id) === String(selectedSportId)
  return {
    hay,
    nombre: selectedSport?.nombre,
    deDisciplina: (id) => !hay || igual(id),
    deActividad: (a) => !hay || !a.equipo_id || igual(a.disciplina_id),
    deUsuario: (u) => !hay || (u.disciplinas || []).some(igual),
    limpiar: () => setSelectedSportId('todos'),
  }
}
