import { useEffect, useState } from 'react'
import api from '../services/api'
import { Esqueleto, EstadoVacio, EstadoError } from '../components/EstadoVista'
import EncabezadoPagina from '../components/EncabezadoPagina'
import { iniciales } from '../config/navegacion'
import { perfilDeporte } from '../config/deportes'
import { formatImageUrl } from '../utils/image'
import { ordenarPorDorsal, tieneDorsal } from '../utils/jugador'

// Panel del Head Coach (v2.0): cada entrenador es una tarjeta que filtra la lista de deportistas,
// así se sabe qué deportistas tiene cada uno (antes la lista mezclaba a todos sin forma de separarlos).
export default function HeadCoach() {
  const [data, setData] = useState({ entrenadores: [], jugadores: [], total_equipos: 0, proximos_partidos: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [entrenador, setEntrenador] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const load = async () => {
    setLoading(true); setError(null)
    try { const { data } = await api.get('/head-coach/resumen'); setData(data) }
    catch (e) { setError(e.message || 'No fue posible cargar el panel') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const cabecera = (
    <EncabezadoPagina
      icono="fa-binoculars"
      antetitulo="Supervisión técnica"
      titulo="Panel del Head Coach"
      descripcion="Tus entrenadores y el plantel de cada uno. Toca un entrenador para ver solo sus deportistas."
      acciones={<button className="btn btn-secondary" onClick={load}><i className="fa-solid fa-rotate" aria-hidden="true"></i> Actualizar</button>}
    />
  )
  if (loading) return <div>{cabecera}<Esqueleto tipo="tarjetas" filas={4} etiqueta="Cargando el panel…" /></div>
  if (error) return <div>{cabecera}<div className="card"><EstadoError mensaje={error} onReintentar={load} /></div></div>

  const elegido = data.entrenadores.find(x => String(x.id) === String(entrenador))
  const jugadores = data.jugadores
    .filter(j => entrenador === 'todos' || String(j.entrenador_id) === String(entrenador))
    .filter(j => !busqueda || `${j.nombre} ${j.posicion || ''} ${j.dorsal ?? ''}`.toLowerCase().includes(busqueda.toLowerCase()))
    .sort(ordenarPorDorsal)

  return (
    <div>
      {cabecera}
      <div className="marcadores">
        <div className="marcador"><span>Entrenadores</span><b>{data.entrenadores.length}</b></div>
        <div className="marcador"><span>Equipos</span><b>{data.total_equipos}</b></div>
        <div className="marcador"><span>Deportistas</span><b>{data.jugadores.length}</b></div>
        <div className="marcador oro"><span>Próximos partidos</span><b>{data.proximos_partidos}</b></div>
      </div>

      <section aria-labelledby="t-ent" style={{ marginBottom: 24 }}>
        <h2 className="titulo-seccion" id="t-ent">Mis entrenadores</h2>
        {data.entrenadores.length === 0 ? (
          <div className="card"><EstadoVacio compacto icono="fa-clipboard-user" titulo="Todavía no tienes entrenadores asociados" descripcion="Un administrador debe asignarlos desde la gestión de usuarios." /></div>
        ) : (
          <div className="rejilla-entrenadores" role="group" aria-label="Filtrar deportistas por entrenador">
            <button type="button" className="tarjeta-entrenador" aria-pressed={entrenador === 'todos'} onClick={() => setEntrenador('todos')}>
              <span className="avatar grande"><i className="fa-solid fa-people-group" aria-hidden="true"></i></span>
              <span><b>Todos</b><small>Plantel completo</small></span>
              <strong>{data.jugadores.length}</strong>
            </button>
            {data.entrenadores.map(x => {
              const perfil = perfilDeporte(x.disciplina_nombre)
              return (
                <button key={x.id} type="button" className="tarjeta-entrenador" style={{ '--deporte': perfil.color }}
                  aria-pressed={String(entrenador) === String(x.id)} onClick={() => setEntrenador(String(x.id))}>
                  <span className="avatar grande rol-entrenador" aria-hidden="true">{iniciales(x.nombre)}</span>
                  <span>
                    <b>{x.nombre}</b>
                    <small>{x.disciplina_nombre ? <><i className={`fa-solid ${perfil.icono}`} aria-hidden="true"></i> {x.disciplina_nombre}</> : x.email}</small>
                  </span>
                  <strong title="Deportistas">{x.total_jugadores}</strong>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="t-dep" style={{ padding: 0 }}>
        <div className="card-title" id="t-dep" style={{ padding: '16px 20px', margin: 0 }}>
          <i className="fa-solid fa-people-group" aria-hidden="true"></i>
          {elegido ? `Deportistas de ${elegido.nombre}` : 'Deportistas de mis entrenadores'}
          <span className="contador">{jugadores.length}</span>
          <input className="buscador-mini" type="search" placeholder="Buscar" value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar deportista" />
        </div>
        {data.jugadores.length === 0 ? (
          <EstadoVacio compacto icono="fa-people-group" titulo="Tus entrenadores aún no tienen deportistas" descripcion="Cuando un entrenador tenga deportistas asignados, aparecerán aquí." />
        ) : jugadores.length === 0 ? (
          <EstadoVacio compacto icono="fa-magnifying-glass" titulo="Sin deportistas" descripcion={elegido ? `${elegido.nombre} todavía no tiene deportistas asignados.` : 'Ningún deportista coincide con la búsqueda.'} />
        ) : (
          <div className="table-wrapper" style={{ border: 0 }}>
            <table className="tabla-movil">
              <thead><tr><th>Deportista</th><th className="col-sec">Equipo</th><th className="col-sec">Entrenador</th><th className="col-sec col-ter">Posición</th><th className="col-sec col-ter">Edad</th></tr></thead>
              <tbody>{jugadores.map(x => (
                <tr key={x.id}>
                  <td>
                    <div className="celda-persona">
                      {x.foto_url
                        ? <img className="avatar" src={formatImageUrl(x.foto_url)} alt="" referrerPolicy="no-referrer" />
                        : <span className="avatar dorsal">{tieneDorsal(x.dorsal) ? x.dorsal : '–'}</span>}
                      <span><b>{x.nombre}</b>
                        <span className="sub-movil">{[x.posicion, x.entrenador_nombre].filter(Boolean).join(' · ')}</span></span>
                    </div>
                  </td>
                  <td className="col-sec">{x.equipo_nombre || 'Sin equipo'}</td>
                  <td className="col-sec"><button type="button" className="enlace-boton" onClick={() => setEntrenador(String(x.entrenador_id))}>{x.entrenador_nombre}</button></td>
                  <td className="col-sec col-ter">{x.posicion || '—'}</td>
                  <td className="col-sec col-ter">{x.edad ? `${x.edad} años` : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
