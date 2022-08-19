function isCoordinator(courseOrProgram, user) {
  const userId = user?.id
  return (
    (
      courseOrProgram.coordinator._id || courseOrProgram.coordinator
    ).toString() === userId
  )
}

function isTeacher(course, user) {
  const userId = user?.id
  return !!course.teachers?.some((t) => (t._id || t).toString() === userId)
}

export { isCoordinator, isTeacher }
