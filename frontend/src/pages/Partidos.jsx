import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { Esqueleto, EstadoVacio, EstadoError, EstadoSinResultados } from '../components/EstadoVista'
import EncabezadoPagina from '../components/EncabezadoPagina'
import api from '../services/api'
import Convocatoria from '../components/Convocatoria'
import CamposAgenda, { AGENDA_VACIA, agendaDe, equipoInicial, useEquiposAsignables } from '../components/CamposAgenda'
import { useAuth } from '../context/AuthContext'
import { useFiltroDeporte } from '../context/DeporteContext'
import {
  perfilDeporte, tiposEvento, TEXTO_TIPO, leerResultado, escribirResultado, desenlace, TEXTO_DESENLACE, ayudaMarca,
} from '../config/deportes'
import { diaCorto, diasHasta, hoyISO, mesCorto, numeroDia } from '../utils/fechas'

const EMPTY = { fecha: '', rival: '', tipo: 'liga', ...AGENDA_VACIA }
const RES_VACIO = { propio: '', rival: '', marca: '', puesto: '' }

export default function Partidos() {
  const { usuario, tienePermiso } = useAuth()
  const puedeEditar = tienePermiso(['administrador', 'entrenador'])

  const [partidos, setPartidos] = useState([])
  const filtro = useFiltroDeporte()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [res, setRes] = useState(RES_VACIO)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [vista, setVista] = useState('proximos')
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, loading: false })
  const [convocatoriaDe, setConvocatoriaDe] = useState(null)
  const equipos = useEquiposAsignables(puedeEditar)
  const [params, setParams] = useSearchParams()

  const load = () => {
    setLoading(true)
    setError(null)
    api.get('/partidos')
      .then(r => setPartidos(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Un aviso lleva a /partidos?convocatoria=ID: se abre esa convocatoria cuando llegan los partidos
  useEffect(() => {
    const id = Number(params.get('convocatoria'))
    if (!id || !partidos.length) return
    const p = partidos.find(x => x.id === id)
    if (p) setConvocatoriaDe(p)
    params.delete('convocatoria')
    setParams(params, { replace: true })
  }, [params, partidos])

  // El deporte del equipo elegido define el tipo de resultado (marcador, sets, tiempo o marca)
  const equipoForm = equipos.find(e => String(e.id) === String(form.equipo_id))
  const perfilForm = perfilDeporte(equipoForm?.disciplina_nombre || (filtro.hay ? filtro.nombre : null))
  const tipos = tiposEvento(perfilForm)

  const openCreate = () => {
    const equipo_id = equipoInicial(equipos, usuario?.rol)
    const perfil = perfilDeporte(equipos.find(e => String(e.id) === equipo_id)?.disciplina_nombre)
    setForm({ ...EMPTY, fecha: hoyISO(), equipo_id, tipo: tiposEvento(perfil)[0].valor })
    setRes(RES_VACIO); setEditId(null); setModal(true)
  }
  const openEdit = (p) => {
    setForm({ fecha: p.fecha?.slice(0, 10) || '', rival: p.rival, tipo: p.tipo, ...agendaDe(p) })
    setRes(leerResultado(p.resultado, perfilDeporte(p.disciplina_nombre)))
    setEditId(p.id); setModal(true)
  }
  const closeModal = () => setModal(false)
  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => {
      const nuevo = { ...f, [name]: value }
      // Al cambiar de equipo (y de deporte) el tipo de evento se ajusta a los de ese deporte
      if (name === 'equipo_id') {
        const p = perfilDeporte(equipos.find(x => String(x.id) === value)?.disciplina_nombre)
        if (!tiposEvento(p).some(t => t.valor === f.tipo)) nuevo.tipo = tiposEvento(p)[0].valor
      }
      return nuevo
    })
  }
  const cambiarRes = (c) => (e) => setRes(r => ({ ...r, [c]: e.target.value }))

  const handleSubmit = async (ev) => {
    ev?.preventDefault()
    if (!form.fecha || !form.rival || !form.tipo) return toast.error('Fecha, rival y tipo son obligatorios')
    if (usuario?.rol !== 'administrador' && !form.equipo_id) return toast.error('Elige el equipo')
    const resultado = escribirResultado(res, perfilForm)
    setSaving(true)
    try {
      const cuerpo = { ...form, resultado }
      if (editId) {
        await api.put(`/partidos/${editId}`, cuerpo)
        toast.success(`${perfilForm.evento} actualizado`)
      } else {
        await api.post('/partidos', cuerpo)
        toast.success(`${perfilForm.evento} registrado`)
      }
      closeModal(); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await api.delete(`/partidos/${deleteModal.id}`)
      toast.success('Eliminado')
      setDeleteModal({ isOpen: false, id: null, loading: false })
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || e.message)
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  const visibles = partidos.filter(filtro.deActividad)
  const { proximos, jugados } = useMemo(() => {
    const hoy = hoyISO()
    return {
      proximos: visibles.filter(p => p.fecha >= hoy && !p.resultado).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      jugados: visibles.filter(p => p.fecha < hoy || p.resultado),
    }
  }, [visibles])
  const balance = useMemo(() => {
    const b = { victoria: 0, empate: 0, derrota: 0, podio: 0 }
    jugados.forEach(p => { const d = desenlace(p.resultado, perfilDeporte(p.disciplina_nombre)); if (d && d in b) b[d]++ })
    return b
  }, [jugados])
  const lista = vista === 'proximos' ? proximos : jugados

  return (
    <div>
      <EncabezadoPagina
        icono="fa-trophy"
        antetitulo={filtro.hay ? filtro.nombre : 'Calendario competitivo'}
        titulo="Partidos y competencias"
        descripcion="Fixture, resultados y convocatorias. El resultado se registra según el deporte: marcador, sets, tiempo o marca."
        acciones={puedeEditar && (
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="fa-solid fa-plus" aria-hidden="true"></i> Registrar evento
          </button>
        )}
      />

      {!loading && !error && partidos.length > 0 && (
        <div className="marcadores">
          <div className="marcador"><span>Próximos</span><b>{proximos.length}</b></div>
          <div className="marcador ok"><span>Victorias</span><b>{balance.victoria}</b></div>
          <div className="marcador"><span>Empates</span><b>{balance.empate}</b></div>
          <div className="marcador error"><span>Derrotas</span><b>{balance.derrota}</b></div>
          {balance.podio > 0 && <div className="marcador oro"><span>Podios</span><b>{balance.podio}</b></div>}
        </div>
      )}

      {loading ? <div className="card"><Esqueleto tipo="tabla" columnas={4} /></div> : error ? (
        <div className="card"><EstadoError mensaje={error} onReintentar={load} /></div>
      ) : partidos.length === 0 ? (
        <div className="card">
          <EstadoVacio
            icono="fa-trophy"
            titulo="Aún no hay partidos ni competencias"
            descripcion={puedeEditar
              ? 'Registra el próximo evento: el inicio mostrará la disponibilidad del plantel para ese día.'
              : 'Cuando un entrenador registre un evento, aparecerá aquí.'}
            accion={puedeEditar ? { texto: 'Registrar evento', icono: 'fa-plus', onClick: openCreate } : null}
          />
        </div>
      ) : visibles.length === 0 ? (
        <div className="card"><EstadoSinResultados descripcion={`No hay eventos de ${filtro.nombre}.`} onLimpiar={filtro.limpiar} textoLimpiar="Ver todos los deportes" /></div>
      ) : (
        <>
          <div className="segmentado" role="group" aria-label="Ver partidos">
            <button type="button" aria-pressed={vista === 'proximos'} onClick={() => setVista('proximos')}>
              Próximos <span>{proximos.length}</span>
            </button>
            <button type="button" aria-pressed={vista === 'jugados'} onClick={() => setVista('jugados')}>
              Resultados <span>{jugados.length}</span>
            </button>
          </div>
          {lista.length === 0 ? (
            <div className="card"><p className="texto-suave">{vista === 'proximos' ? 'No hay eventos programados.' : 'Todavía no hay resultados.'}</p></div>
          ) : (
            <ul className="fixture">
              {lista.map(p => (
                <Encuentro key={p.id} p={p} puedeEditar={puedeEditar}
                  onConvocatoria={() => setConvocatoriaDe(p)} onEditar={() => openEdit(p)}
                  onEliminar={() => setDeleteModal({ isOpen: true, id: p.id, loading: false })} />
              ))}
            </ul>
          )}
        </>
      )}

      {modal && (
        <Modal
          title={editId ? `Editar ${perfilForm.evento.toLowerCase()}` : `Registrar ${perfilForm.evento.toLowerCase()}`}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Guardando…' : editId ? 'Actualizar' : 'Registrar'}
              </button>
            </>
          }
        >
          <form className="form-grid" onSubmit={handleSubmit}>
            <CamposAgenda form={form} onChange={handleChange} equipos={equipos} lugarEjemplo="Ej. Estadio General Santander" />
            <div className="form-group">
              <label htmlFor="p-fecha">Fecha *</label>
              <input id="p-fecha" name="fecha" type="date" value={form.fecha} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="p-tipo">Tipo *</label>
              <select id="p-tipo" name="tipo" value={form.tipo} onChange={handleChange}>
                {tipos.map(t => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="p-rival">{['tiempo', 'marca'].includes(perfilForm.formato) ? 'Competencia o prueba *' : 'Rival *'}</label>
              <input id="p-rival" name="rival" value={form.rival} onChange={handleChange} maxLength={100}
                placeholder={['tiempo', 'marca'].includes(perfilForm.formato) ? 'Ej. Juegos ASCUN · 100 m libre' : 'Nombre del equipo rival'} />
            </div>

            <fieldset className="resultado-campos" style={{ gridColumn: '1 / -1' }}>
              <legend><i className={`fa-solid ${perfilForm.icono}`} aria-hidden="true"></i> Resultado {perfilForm.nombre !== 'Deporte' ? `· ${perfilForm.nombre}` : ''}
                <small>Déjalo vacío si aún no se ha jugado.</small></legend>
              {['marcador', 'sets'].includes(perfilForm.formato) ? (
                <div className="marcador-editor">
                  <label><span>Unisimón</span>
                    <input type="number" min="0" inputMode="numeric" value={res.propio} onChange={cambiarRes('propio')} aria-label={`${perfilForm.unidad} de Unisimón`} /></label>
                  <b aria-hidden="true">–</b>
                  <label><span>{form.rival || 'Rival'}</span>
                    <input type="number" min="0" inputMode="numeric" value={res.rival} onChange={cambiarRes('rival')} aria-label={`${perfilForm.unidad} del rival`} /></label>
                  <small className="ayuda-campo">En {perfilForm.unidad}.</small>
                </div>
              ) : (
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="p-marca">{perfilForm.nombre === 'Natación' ? 'Tiempo' : 'Tiempo o marca'}</label>
                    <input id="p-marca" value={res.marca} onChange={cambiarRes('marca')} maxLength={30} placeholder={ayudaMarca(perfilForm)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-puesto">Puesto</label>
                    <input id="p-puesto" type="number" min="1" inputMode="numeric" value={res.puesto} onChange={cambiarRes('puesto')} placeholder="Ej. 2" />
                  </div>
                </div>
              )}
            </fieldset>
          </form>
        </Modal>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar este evento?"
        message="Se eliminará del registro junto con su convocatoria. Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, loading: false })}
      />
      {convocatoriaDe && <Convocatoria partido={convocatoriaDe} onCerrar={() => setConvocatoriaDe(null)} />}
    </div>
  )
}

// Un encuentro como tarjeta de fixture: fecha, deporte, "Unisimón vs rival" y el marcador o la marca
function Encuentro({ p, puedeEditar, onConvocatoria, onEditar, onEliminar }) {
  const perfil = perfilDeporte(p.disciplina_nombre)
  const d = desenlace(p.resultado, perfil)
  const r = leerResultado(p.resultado, perfil)
  const dias = diasHasta(p.fecha)
  const porTiempo = ['tiempo', 'marca'].includes(perfil.formato)
  return (
    <li className={`encuentro ${d || ''}`} style={{ '--deporte': perfil.color }}>
      <div className="fecha-bloque">
        <small>{diaCorto(p.fecha)}</small><b>{numeroDia(p.fecha)}</b><small>{mesCorto(p.fecha)}</small>
      </div>
      <div className="encuentro-cuerpo">
        <p className="encuentro-meta">
          <span className="chip-deporte"><i className={`fa-solid ${perfil.icono}`} aria-hidden="true"></i> {p.disciplina_nombre || 'General'}</span>
          <span className="badge badge-neutro">{TEXTO_TIPO[p.tipo] || p.tipo}</span>
          {dias === 0 && !p.resultado && <span className="etiqueta-viva">Hoy</span>}
          {dias > 0 && dias <= 7 && !p.resultado && <span className="etiqueta-suave">En {dias} {dias === 1 ? 'día' : 'días'}</span>}
        </p>
        <p className="encuentro-titulo">
          {porTiempo ? p.rival : <>Unisimón <span>vs</span> {p.rival}</>}
        </p>
        <p className="encuentro-detalle">
          {[p.equipo_nombre, p.lugar, p.hora].filter(Boolean).join(' · ') || 'General'}
        </p>
      </div>
      <div className="encuentro-resultado">
        {!p.resultado ? (
          <span className="resultado-pendiente">{dias < 0 ? 'Sin resultado' : 'Por jugar'}</span>
        ) : porTiempo ? (
          <div className="resultado-marca">
            <b>{r.marca || '—'}</b>
            {r.puesto && <span className={Number(r.puesto) <= 3 ? `puesto puesto-${r.puesto}` : 'puesto'}>{r.puesto}.º</span>}
          </div>
        ) : (
          <div className="resultado-marcador" aria-label={`Resultado ${r.propio} a ${r.rival}`}>
            <b>{r.propio}</b><i aria-hidden="true">-</i><b>{r.rival}</b>
          </div>
        )}
        {d && <span className={`badge ${TEXTO_DESENLACE[d].clase}`}>{TEXTO_DESENLACE[d].texto}</span>}
      </div>
      <div className="encuentro-acciones">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onConvocatoria} aria-label={`Convocatoria: ${p.rival}`}>
          <i className="fa-solid fa-clipboard-list" aria-hidden="true"></i> <span className="texto-pc">Convocatoria</span>
        </button>
        {puedeEditar && (
          <>
            <button className="btn-icon" onClick={onEditar} aria-label={`Editar ${p.rival}`} title="Editar"><i className="fa-solid fa-pen" aria-hidden="true"></i></button>
            <button className="btn-icon btn-danger" onClick={onEliminar} aria-label={`Eliminar ${p.rival}`} title="Eliminar"><i className="fa-solid fa-trash-can" aria-hidden="true"></i></button>
          </>
        )}
      </div>
    </li>
  )
}
