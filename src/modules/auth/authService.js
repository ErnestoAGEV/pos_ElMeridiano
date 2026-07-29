export async function iniciarSesionConPin(pin) {
  return window.api.auth.loginPin({ pin })
}

export async function cambiarPin({ userId, pinActual, pinNuevo }) {
  return window.api.auth.cambiarPin({ userId, pinActual, pinNuevo })
}
