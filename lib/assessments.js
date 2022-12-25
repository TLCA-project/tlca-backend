import { DateTime } from 'luxon'

// Check whether an evaluation can be created for this assessment.
function canTakeEvaluation(assessment, now) {
  const courseSchedule = assessment.course?.schedule

  const canEvaluate =
    !courseSchedule ||
    ((!courseSchedule.start ||
      DateTime.fromJSDate(courseSchedule.start) <= now) &&
      (!courseSchedule.end ||
        courseSchedule.evaluationsEnd ||
        DateTime.fromJSDate(courseSchedule.end) > now) &&
      (!courseSchedule.evaluationsEnd ||
        DateTime.fromJSDate(courseSchedule.evaluationsEnd) > now))

  const canTakeAssessment =
    (!assessment.start || DateTime.fromJSDate(assessment.start) <= now) &&
    (!assessment.end || DateTime.fromJSDate(assessment.end) > now)

  return canEvaluate && canTakeAssessment
}

// Check whether an evaluation can be requested for this assessment.
function canRequestEvaluation(assessment, now) {
  const courseSchedule = assessment.course?.schedule

  return (
    assessment.evaluationRequest &&
    (!courseSchedule ||
      !courseSchedule.evaluationRequestsEnd ||
      DateTime.fromJSDate(courseSchedule.evaluationRequestsEnd) > now) &&
    canTakeEvaluation(assessment, now)
  )
}

export { canRequestEvaluation, canTakeEvaluation }
