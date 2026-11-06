// Avisos del entrenador al equipo (v1.7): lo que antes se perdía en el grupo de WhatsApp queda en el inicio
// y llega a la campanita de cada deportista. Escriben el entrenador y el administrador; leen todos los destinatarios.
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'
import ConfirmModal from './ConfirmModal'
import { useEquiposAsignables } from './CamposAgenda'
import { fechaCorta } from '../utils/fechas'
import { useDeporte } from '../context/DeporteContext'

const VISIBLES = 3
const FORM_VACIO = { equipo_id: '', titulo: '', mensaje: '' }

// "hoy", "ayer" o "11 de octubre" (creado_en llega como fecha y hora en UTC)
const cuando = (ts) => {
  const f = new Date(ts); f.setHours(0, 0, 0, 0)
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const dias = Math.round((hoy - f) / 86400000)
  return dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `el ${fechaCorta(f)}`
}

export default function AvisosEquipo() {
  const { usuario } = useAuth()
  const puedeEscribir = usuario?.rol === 'entrenador' || usuario?.rol === 'administrador'
  const esAdmin = usuario?.rol === 'administrador'
  const equipos = useEquiposAsignables(puedeEscribir)
  const [lista, setLista] = useState(null)
  const [todos, setTodos] = useState(false)
  const [escribiendo, setEscribiendo] = useState(false)
  const [aBorrar, setABorrar] = useState(null)
  const [borrando, setBorrando] = useState(false)

  const cargar = useCallback(() => {
    api.get('/comunicados').then(({ data }) => setLista(data)).catch(() => setLista([]))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  if (lista === null) return null
  // Sin avisos, el panel solo se muestra a quien escribe y al deportista (para que sepa dónde llegan)
  if (!lista.length && !puedeEscribir && usuario?.rol !== 'jugador') return null

  const borrar = async () => {
    setBorrando(true)
    try {
      await api.delete(`/comunicados/${aBorrar.id}`)
      toast.success('Aviso eliminado')
      setABorrar(null)
      cargar()
    } catch (e) {
      toast.error(e.message || 'No se pudo eliminar el aviso')
    } finally {
      setBorrando(false)
    }
  }

  const mostrados = todos ? lista : lista.slice(0, VISIBLES)
  return (
    <section className="panel orden-3" aria-labelledby="t-com">
      <div className="panel-cabecera"><h2 id="t-com">Avisos del equipo</h2>{lista.length > 0 && <span className="panel-contador">{lista.length}</span>}</div>
      <div className="panel-cuerpo">
        {puedeEscribir && (
          <button type="button" className="btn btn-primary ini-com-escribir" onClick={() => setEscribiendo(true)}>
            <i className="fa-solid fa-bullhorn" aria-hidden="true"></i> Enviar aviso
          </button>
        )}
        {lista.length === 0 ? (
          <p className="ini-texto-suave">
            {puedeEscribir
              ? 'Escribe aquí los cambios de horario, de cancha o lo que el equipo deba saber. Cada deportista lo recibe en sus avisos.'
              : 'Cuando tu entrenador envíe un aviso al equipo, aparecerá aquí y en la campanita.'}
          </p>
        ) : (
          <ul className="ini-com">
            {mostrados.map(c => (
              <li key={c.id}>
                <div className="ini-com-cabeza">
                  <p className="ini-com-titulo">{c.titulo}</p>
                  {(c.propio || esAdmin) && (
                    <button type="button" className="btn-icon btn-danger" onClick={() => setABorrar(c)} aria-label={`Eliminar el aviso ${c.titulo}`}>
                      <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
                    </button>
                  )}
                </div>
                <p className="ini-com-mensaje">{c.mensaje}</p>
                <p className="ini-com-meta">
                  {[
                    `${c.propio ? 'Enviado por ti' : c.autor || 'Cuerpo técnico'} ${cuando(c.creado_en)}`,
                    c.equipo_nombre ? `para ${c.equipo_nombre}` : null,
                    c.propio || esAdmin ? `${c.destinatarios} ${c.destinatarios === 1 ? 'destinatario' : 'destinatarios'}` : null,
                  ].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
        {lista.length > VISIBLES && (
          <button type="button" className="ini-com-mas" onClick={() => setTodos(t => !t)} aria-expanded={todos}>
            {todos ? 'Ver menos' : `Ver los ${lista.length} avisos`}
          </button>
        )}
      </div>
      {escribiendo && <EscribirAviso equipos={equipos} esAdmin={esAdmin} onCerrar={() => setEscribiendo(false)} onEnviado={() => { setEscribiendo(false); cargar() }} />}
      <ConfirmModal
        isOpen={!!aBorrar}
        title="Eliminar aviso"
        message="El aviso desaparecerá del inicio de los deportistas. Los avisos que ya llegaron a la campanita se conservan."
        confirmText="Eliminar aviso"
        onConfirm={borrar}
        onCancel={() => setABorrar(null)}
        loading={borrando}
      />
    </section>
  )
}

function EscribirAviso({ equipos, esAdmin, onCerrar, onEnviado }) {
  // v2.0 (DEF-044): "Todos mis deportistas" llega solo a los deportistas del entrenador en su deporte
  const { deporteUnico } = useDeporte()
  const [form, setForm] = useState(FORM_VACIO)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const cambiar = (e) => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError('') }

  const enviar = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim() || !form.mensaje.trim()) return setError('Escribe el título y el mensaje del aviso.')
    setEnviando(true)
    try {
      const { data } = await api.post('/comunicados', { ...form, equipo_id: form.equipo_id || null })
      toast.success(data.destinatarios === 1 ? 'Aviso enviado a 1 persona' : `Aviso enviado a ${data.destinatarios} personas`)
      onEnviado()
    } catch (err) {
      setError(err.message || 'No se pudo enviar el aviso.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal title="Enviar aviso" onClose={onCerrar}>
      <form onSubmit={enviar} style={{ display: 'grid', gap: 14 }}>
        {error && <div className="alerta alerta-error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>{error}</span></div>}
        <div className="form-group">
          <label htmlFor="aviso-equipo">Para</label>
          <select id="aviso-equipo" name="equipo_id" value={form.equipo_id} onChange={cambiar}>
            <option value="">{esAdmin ? 'Todos los usuarios del sistema' : deporteUnico ? `Todos mis deportistas de ${deporteUnico.nombre}` : 'Todos mis deportistas'}</option>
            {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}{(eq.categoria_nombre || eq.categoria) ? ` · ${eq.categoria_nombre || eq.categoria}` : ''}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="aviso-titulo">Título</label>
          <input id="aviso-titulo" name="titulo" value={form.titulo} onChange={cambiar} maxLength={120} placeholder="Ej. Cambio de cancha" required />
        </div>
        <div className="form-group">
          <label htmlFor="aviso-mensaje">Mensaje</label>
          <textarea id="aviso-mensaje" name="mensaje" rows={4} value={form.mensaje} onChange={cambiar} required
            placeholder="Ej. Mañana entrenamos en la cancha sintética a las 5:30 p. m. Lleven guayos y canilleras." />
        </div>
        <p className="ini-texto-suave">Cada destinatario lo recibe en la campanita de avisos y lo ve en su inicio.</p>
        <div className="modal-footer" style={{ marginTop: 4 }}>
          <button type="button" className="btn btn-secondary" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar aviso'}</button>
        </div>
      </form>
    </Modal>
  )
}
