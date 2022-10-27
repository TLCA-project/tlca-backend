import { DateTime } from 'luxon'

function canTake(assessment, now) {
  return (
    (!assessment.start || DateTime.fromJSDate(assessment.start) <= now) &&
    (!assessment.end || DateTime.fromJSDate(assessment.end) > now)
  )
}

export { canTake }
