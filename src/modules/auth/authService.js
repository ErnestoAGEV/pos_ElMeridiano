export async function iniciarSesion({ email, password }) {
  return window.api.auth.login({ email, password })
}

export async function cambiarPassword({ userId, currentPassword, newPassword }) {
  return window.api.auth.cambiarPassword({ userId, currentPassword, newPassword })
}
