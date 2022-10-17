import { DateTime } from 'luxon'

function canEnroll(course, now) {
  const events = []
  const schedule = course.schedule

  if (schedule) {
    const isAfter = (dt) => dt > now
    const isSameOrBefore = (dt) => dt <= now

    events.push(
      {
        field: 'registrationsStart',
        check: isAfter,
      },
      {
        field: 'start',
        check: isAfter,
      },
      {
        field: 'registrationsEnd',
        check: isSameOrBefore,
      },
      {
        field: 'evaluationsEnd',
        check: isSameOrBefore,
      },
      {
        field: 'end',
        check: isSameOrBefore,
      }
    )
  }

  return !events.some(
    (e) => schedule[e.field] && e.check(DateTime.fromISO(schedule[e.field]))
  )
}

function canUpdateGroup(course, now) {
  const events = []
  const schedule = course.schedule

  if (schedule) {
    const isSameOrBefore = (dt) => dt <= now

    events.push(
      {
        field: 'evaluationsEnd',
        check: isSameOrBefore,
      },
      {
        field: 'end',
        check: isSameOrBefore,
      }
    )
  }

  return !events.some(
    (e) => schedule[e.field] && e.check(DateTime.fromISO(schedule[e.field]))
  )
}

function isCoordinator(courseOrProgram, user) {
  const userId = user?.id
  const coordinator = courseOrProgram.coordinator
  return (coordinator._id || coordinator).toString() === userId
}

function isEvaluator(evaluation, user) {
  const userId = user?.id
  const evaluator = evaluation.evaluator
  return evaluator && (evaluator._id || evaluator).toString() === userId
}

function isTeacher(course, user) {
  const userId = user?.id
  return !!course.teachers?.some((t) => (t._id || t).toString() === userId)
}

export { canEnroll, canUpdateGroup, isCoordinator, isEvaluator, isTeacher }
