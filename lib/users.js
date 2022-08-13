function hasAnyRoles(user, roles) {
  return roles.some((role) => user?.roles.includes(role))
}

function hasRole(user, role) {
  return user?.roles.includes(role)
}

export { hasAnyRoles, hasRole }
