// Campo de contraseña con el botón del ojo para mostrarla u ocultarla (v1.9, observación del tester).
// Recibe las mismas propiedades que un <input>; el tipo lo controla el botón.
import { useState } from 'react'

export default function CampoClave(props) {
  const [ver, setVer] = useState(false)
  return (
    <div className="campo-clave">
      <input {...props} type={ver ? 'text' : 'password'} />
      <button type="button" onClick={() => setVer(v => !v)} aria-pressed={ver}
        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        <i className={ver ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} aria-hidden="true"></i>
      </button>
    </div>
  )
}
