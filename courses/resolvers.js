import { UserInputError } from 'apollo-server'
import { DateTime } from 'luxon'

function isCoordinator(course, context) {
  const userId = context.user?.id
  return (course.coordinator._id || course.coordinator).toString() === userId
}

function isTeacher(course, context) {
  const userId = context.user?.id
  return (
    course.teachers &&
    course.teachers.some((t) => (t._id || t).toString() === userId)
  )
}

function canEnroll(schedule, now) {
  if (schedule) {
    const isAfter = (dt) => dt > now
    const isSameOrBefore = (dt) => dt <= now

    const events = [
      {
        field: 'registrationsStart',
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
      },
    ]

    for (const event of events) {
      if (
        schedule[event.field] &&
        event.check(DateTime.fromISO(schedule[event.field]))
      ) {
        return false
      }
    }
  }

  return true
}

const resolvers = {
  CompetencyCategory: {
    ADVANCED: 'advanced',
    BASIC: 'basic',
  },
  CourseLoadType: {
    WEEKLY: 'weekly',
    THEO_PRAC: 'theo+prac',
  },
  CourseType: {
    PROJECT: 'project',
    TRAINING: 'training',
    UCOURSE: 'ucourse',
    UNIT: 'unit',
  },
  CourseView: {
    COORDINATOR: 'coordinator',
    STUDENT: 'student',
    TEACHER: 'teacher',
    USER: 'user',
  },
  RegistrationInvite: {
    REQUESTED: 'requested',
    SENT: 'sent',
  },
  Visibility: {
    PUBLIC: 'public',
    INVITE_ONLY: 'invite-only',
    PRIVATE: 'private',
  },
  Course: {
    async assessments(course, _args, { models }, _info) {
      const { Assessment } = models

      return await Assessment.find({ course: course._id })
    },
    async coordinator(course, _args, { models }, _info) {
      const { User } = models

      return await User.findOne({ _id: course.coordinator })
    },
    async hasRequestedInvite(course, _args, { models, user }, _info) {
      const { Registration } = models

      const registration = await Registration.findOne({
        course: course._id,
        user: user.id,
      })
      return registration?.invite === 'requested'
    },
    isArchived(course, _args, _context, _info) {
      return !!course.archived
    },
    isCoordinator(course, _args, { user }, _info) {
      const coordinator = course.coordinator
      return (coordinator?._id || coordinator)?.toString() === user.id
    },
    isPublished(course, _args, _context, _info) {
      return !!course.published
    },
    async isRegistered(course, _args, { models, user }, _info) {
      const { Registration } = models

      const registration = await Registration.findOne({
        course: course._id,
        user: user.id,
      })

      return !!registration && !registration.invite
    },
    isTeacher(course, _args, { user }, _info) {
      return !!course.teachers?.some((t) => (t._id || t).toString() === user.id)
    },
    async partners(course, _args, { models }, _info) {
      const { Partner } = models

      return await Partner.find({ _id: { $in: course.partners } })
    },
    async registration(course, _args, { models, user }, _info) {
      const { Registration } = models

      return await Registration.findOne({ course: course._id, user: user.id })
    },
    team(course, _args, _context, _info) {
      const team = []

      // Add all the teachers.
      const teachers = course.teachers
      if (teachers) {
        team.push(...teachers)
      }

      // Add the coordinator if he/she is not also a teacher.
      const coordinator = course.coordinator
      if (
        !team.find(
          (t) =>
            (t._id || t).toString() ===
            (coordinator._id || coordinator).toString()
        )
      ) {
        team.push(coordinator)
      }

      return team
    },
  },
  Query: {
    async courses(_parent, args, { models, user }, _info) {
      const { Course } = models

      // Basically, can only retrieve courses that are:
      // with the 'public' or invite-only' visibilities,
      // and with the 'published' status.
      const filter = {
        $or: [
          {
            $and: [
              { published: { $exists: true } },
              { archived: { $exists: false } },
              {
                $or: [{ visibility: 'public' }, { visibility: 'invite-only' }],
              },
            ],
          },
        ],
      }

      // If a user is connected, adjust the filter according to his/her roles.
      if (user) {
        const { roles } = user
        const { view } = args

        // Teachers can also access their own courses
        // no matter their status or visibility.
        if (roles.includes('teacher')) {
          switch (view) {
            case 'coordinator':
              filter.$or = [{ coordinator: user.id }]
              break

            case 'teacher':
              filter.$or = [
                {
                  $and: [
                    { published: { $exists: true } },
                    { $or: [{ coordinator: user.id }, { teachers: user.id }] },
                  ],
                },
              ]
              break

            default:
              filter.$or.push({ coordinator: user.id }, { teachers: user.id })
          }
        }
      }

      // Set up offset and limit.
      const skip = Math.max(0, args.offset ?? 0)
      const limit = args.limit ?? undefined

      // Retrieve all the courses satisfying the conditions defined hereabove.
      const courses = await Course.find(filter, null, { skip, limit })

      return courses
    },
    async course(_parent, args, { models, user }, _info) {
      const { Course } = models

      let course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('Course not found.')
      }

      // If no user is authenticated,
      // reject the request if the course has not been published or is archived
      if (
        !user &&
        (!course.published ||
          course.archived ||
          course.visibility === 'private')
      ) {
        throw new UserInputError('Course not found.')
      }

      course = await Course.populate(course, [
        {
          path: 'competencies.competency',
          select: 'code description name',
          model: 'Competency',
        },
        {
          path: 'coordinator',
          select: '_id displayName username',
          model: 'User',
        },
        { path: 'teachers', select: '_id displayName username', model: 'User' },
      ]).then((c) => c.toJSON())

      // Rename the 'id' field of the coordinator and teachers
      course.coordinator.id = course.coordinator._id.toString()
      if (course.teachers) {
        course.teachers.forEach((t) => (t.id = t._id.toString()))
      }

      // Restructure the format of the schedule
      if (course.schedule) {
        course.schedule = Object.entries(course.schedule).map(
          ([name, date]) => ({ name, date })
        )
      }

      return course
    },
  },
  Mutation: {
    async createCourse(_parent, args, { models, user }, _info) {
      const { Competency, Course } = models

      // Check that the constraints are satisfied.
      if (!args.competencies.some((c) => c.category === 'basic')) {
        throw new UserInputError('MISSING_BASIC_COMPETENCY')
      }

      const codes = new Set()
      if (args.competencies.some((c) => codes.size === codes.add(c.competency).size)) {
        throw new UserInputError('DUPLICATE_COMPETENCIES')
      }

      // Create the course Mongoose object.
      const course = new Course(args)
      course.competencies = await Promise.all(
        args.competencies.map(async (c) => ({
          ...c,
          competency: (await Competency.findOne({ code: c.competency }))?._id,
        }))
      )
      course.coordinator = user.id
      course.user = user.id

      // Save the course into the database.
      try {
        await course.save()
        return true
      } catch (err) {
        switch (err.name) {
          case 'MongoServerError': {
            switch (err.code) {
              case 11000: {
                throw new UserInputError('EXISTING_CODE', {
                  formErrors: {
                    code: 'The specified code already exists',
                  },
                })
              }
            }
            break
          }
        }
      }

      return false
    },
    async register(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models

      const course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('Course not found.')
      }

      // Can only register to a published course with 'public' visibility
      if (
        !course.published ||
        course.archived ||
        course.visibility !== 'public'
      ) {
        throw new UserInputError('REGISTRATION_FAILED')
      }

      // Coordinator and teacher cannot register to their own course
      if (isCoordinator(course, user) || isTeacher(course, user)) {
        throw new UserInputError('REGISTRATION_FAILED')
      }

      // Can only register if it agrees with the schedule of the course
      const now = DateTime.now()
      if (!canEnroll(course.schedule, now)) {
        throw new UserInputError('REGISTRATION_FAILED')
      }

      // Check whether there is not already a registration
      const userId = user.id
      const registration = await Registration.findOne({
        course: course._id,
        user: userId,
      })
      if (registration) {
        throw new UserInputError('REGISTRATION_FAILED')
      }

      // Create a new registration for the user
      try {
        const registration = new Registration({
          course: course._id,
          date: now,
          user: userId,
        })
        course.registration = await registration.save()

        return course
      } catch (err) {
        console.log(err)
      }

      throw new UserInputError('REGISTRATION_FAILED')
    },
    async requestInvite(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models

      const course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('Course not found.')
      }

      // Can only request an invite for a published course with 'invite-only' visibility
      if (
        !course.published ||
        course.archived ||
        course.visibility !== 'invite-only'
      ) {
        throw new UserInputError('INVITE_REQUEST_FAILED')
      }

      // Coordinator and teacher cannot request an invite for their own course
      if (isCoordinator(course, user) || isTeacher(course, user)) {
        throw new UserInputError('INVITE_REQUEST_FAILED')
      }

      // Can only request an invite if it agrees with the schedule of the course
      const now = DateTime.now()
      if (!canEnroll(course.schedule, now)) {
        throw new UserInputError('INVITE_REQUEST_FAILED')
      }

      // Check whether there is not already a registration
      const userId = user.id
      const registration = await Registration.findOne({
        course: course._id,
        user: userId,
      })
      if (registration) {
        throw new UserInputError('INVITE_REQUEST_FAILED')
      }

      // Create a new registration for the user, representing the invite request
      try {
        const registration = new Registration({
          course: course._id,
          date: now,
          invite: 'requested',
          user: userId,
        })
        course.registration = await registration.save()

        return course
      } catch (err) {
        console.log(err)
      }

      throw new UserInputError('INVITE_REQUEST_FAILED')
    },
  },
}

export default resolvers
