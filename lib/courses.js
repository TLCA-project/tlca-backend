function isCoordinator(courseOrProgram, user) {
  const userId = user?.id
  const coordinator = courseOrProgram.coordinator
  return (coordinator._id || coordinator).toString() === userId
}

function isEvaluator(evaluation, user) {
  const userId = user?.id
  const evaluator = evaluation.evaluator
  return (evaluator._id || evaluator).toString() === userId
}

function isTeacher(course, user) {
  const userId = user?.id
  return !!course.teachers?.some((t) => (t._id || t).toString() === userId)
}

export { isCoordinator, isEvaluator, isTeacher }
