// Check whether a given user is the evaluator of the given evaluation.
function isEvaluator(evaluation, user) {
  const userId = user?.id
  const evaluator = evaluation.evaluator
  return evaluator && (evaluator._id || evaluator).toString() === userId
}

export { isEvaluator }
