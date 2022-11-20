import Bugsnag from '@bugsnag/js'
import { UserInputError } from 'apollo-server'
import { DateTime } from 'luxon'

import {
  canEnroll,
  canUpdateGroup,
  isCoordinator,
  isTeacher,
} from '../lib/courses.js'
import { hasRole } from '../lib/users.js'

// Check if the registered user has the student role
// and add it to him/her if not.
async function updateStudentStatus(models, userId) {
  const { User } = models

  const user = await User.findOne({ _id: userId })
  if (!user.roles.includes('student')) {
    user.roles.push('student')
    await user.save()
  }
}

const resolvers = {
  RegistrationInvitation: {
    REQUESTED: 'requested',
    SENT: 'sent',
  },
  Registration: {
    // Retrieve the 'datetime' of this registration from the MongoDB 'date'.
    datetime(registration, _args, _context, _info) {
      return registration.invitation
        ? registration.invitationDate
        : registration.date
    },
    // Retrieve the 'id' of this registration from the MongoDB '_id'.
    id(registration, _args, _context, _info) {
      return registration._id.toString()
    },
    // Retrieve the progress of the user associated to this registration.
    async progress(registration, _args, { models }, _info) {
      const { Competency, Course, ProgressHistory } = models

      // Retrieve the course associated to this registration.
      const course = await Course.findOne(
        { _id: registration.course },
        'competencies'
      ).lean()
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Retrieve the progress histories for each competency.
      const competencies = await Promise.all(
        course.competencies.map(async (c) => ({
          category: c.category,
          competency: await Competency.findOne({ _id: c.competency }).lean(),
          history: await ProgressHistory.find(
            {
              competency: c.competency,
              user: registration.user,
            },
            'learningOutcomes stars'
          ).lean(),
          useLearningOutcomes: !!c.useLearningOutcomes,
        }))
      )

      // Computes the progress for each competency.
      competencies.forEach((competency) => {
        // If stars are used, compute the total number of acquired stars.
        if (!competency.useLearningOutcomes) {
          competency.stars = competency.history.reduce(
            (stars, c) => stars + c.stars,
            0
          )

          competency.innerProgress = Math.min(competency.stars, 5)
          competency.progress = competency.innerProgress
        }
        // If learning outcomes are used, compute the total number
        // of acquired learning outcomes, for each one of them
        else {
          competency.learningOutcomes = competency.history.reduce(
            (learningOutcomes, c) => {
              c.learningOutcomes.forEach((i) => (learningOutcomes[i] += 1))
              return learningOutcomes
            },
            Array.from(
              { length: competency.competency.learningOutcomes.length },
              () => 0
            )
          )

          const sumAcquired = competency.learningOutcomes.reduce(
            (acc, n) => acc + n,
            0
          )
          const totalToAcquire = competency.competency.learningOutcomes.reduce(
            (acc, lo) => acc + (lo.takes ?? 1),
            0
          )
          competency.innerProgress =
            (5 * Math.min(sumAcquired, totalToAcquire)) / totalToAcquire
          competency.progress = Math.trunc(20 * competency.innerProgress)
        }
      })

      const basic = competencies.filter((c) => c.category === 'basic')
      const advanced = competencies.filter((c) => c.category === 'advanced')

      return {
        advanced: advanced.length
          ? Math.trunc(
              (advanced.reduce((acc, c) => acc + c.innerProgress, 0) /
                (advanced.length * 5)) *
                100
            )
          : null,
        basic: Math.trunc(
          (basic.reduce((acc, c) => acc + c.innerProgress, 0) /
            (basic.length * 5)) *
            100
        ),
        competencies,
      }
    },
  },
  Query: {
    async registration(_parent, args, { models, user }, _info) {
      const { Course, Program, Registration, User } = models

      // By default, only consider registrations of the connected user.
      const filter = { user: user.id }

      // Retrieve the learner, if any.
      const learner = args.learner
        ? await User.exists({ username: args.learner })
        : null
      if (args.learner && !learner) {
        throw new UserInputError('LEARNER_NOT_FOUND')
      }

      // Retrieve the registration associated to a given course.
      if (args.code) {
        const course = await Course.findOne(
          { code: args.code },
          'coordinator teachers'
        ).lean()
        if (!course) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }

        filter.course = course._id

        if (
          learner &&
          (isCoordinator(course, user) || isTeacher(course, user))
        ) {
          filter.user = learner._id
        }
      }

      // Retrieve the registration associated to a given program.
      if (args.code && !filter.course) {
        const program = await Program.findOne(
          { code: args.code },
          'coordinator'
        ).lean()
        if (!program) {
          throw new UserInputError('PROGRAM_NOT_FOUND')
        }

        filter.program = program._id
      }

      return await Registration.findOne(filter).lean()
    },
    // Retrieve all the registrations
    // that are available to the connected user.
    async registrations(_parent, args, { models, user }, _info) {
      const { Course, Program, Registration } = models

      const filter = {}

      // Only 'admin' can access all the registrations
      // without specifying a course code.
      if (!args.courseCode === !args.programCode && !hasRole(user, 'admin')) {
        throw new UserInputError(
          'The courseCode/programCode param is required for non-admin users.'
        )
      }

      if (args.confirmed) {
        filter.invitation = { $exists: false }
      }

      if (args.courseCode) {
        const course = await Course.findOne(
          { code: args.courseCode },
          '_id coordinator groups teachers'
        ).lean()

        if (
          !course ||
          !(isCoordinator(course, user) || isTeacher(course, user))
        ) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }

        // Filter the registrations according to the provided course code.
        filter.course = course._id

        // If teaching groups are defined, a teacher can only access
        // to the learners from his/her teaching groups.
        if (!isCoordinator(course, user) && course.groups?.teaching?.length) {
          const groups = course.groups.teaching
            .map((g, i) => ({ ...g, i }))
            .filter((g) => g.supervisor.toString() === user.id)
            .map((g) => g.i)
          filter.$or = [
            { 'group.teaching': { $exists: false } },
            { 'group.teaching': { $in: groups } },
          ]
        }
      }

      if (args.programCode) {
        const program = await Program.findOne(
          { code: args.programCode },
          '_id coordinator'
        ).lean()

        if (!program || !isCoordinator(program, user)) {
          throw new UserInputError('PROGRAM_NOT_FOUND')
        }

        // Filter the registrations according to the provided program code.
        filter.program = program._id
      }

      return await Registration.find(filter).populate('user').lean()
    },
  },
  Mutation: {
    // Accept an invitation sent by a teacher for a given course, as a user.
    async acceptInvitation(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models

      const registration = await Registration.findOne(
        { _id: args.id },
        'course date invitation user'
      )
      if (!registration || registration.invitation !== 'sent') {
        throw new UserInputError('REGISTRATION_NOT_FOUND')
      }

      const course = await Course.findOne(
        { _id: registration.course },
        'archived coordinator published schedule visibility'
      ).lean()
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Only the invited user can accept the invitation
      // for a course with the 'published' status and 'private' visibility
      // and within the registration schedule, if any.
      const now = DateTime.now()
      if (
        user.id !== registration.user.toString() ||
        !course.published ||
        course.archived ||
        !(
          course.visibility === 'invite-only' || course.visibility === 'private'
        ) ||
        !canEnroll(course, now)
      ) {
        throw new UserInputError('INVITATION_ACCEPTANCE_FAILED')
      }

      // Accept the invitation.
      registration.date = now
      registration.invitation = undefined

      // Save the registration into the database.
      try {
        await updateStudentStatus(models, registration.user)
        return await registration.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
    // Accept an invitation request made by a user for a given course or program, as its coordinator.
    async acceptInvitationRequest(_parent, args, { models, user }, _info) {
      const { Course, Program, Registration } = models

      const registration = await Registration.findOne(
        { _id: args.id },
        'course date invitation program user'
      )
      if (!registration || registration.invitation !== 'requested') {
        throw new UserInputError('REGISTRATION_NOT_FOUND')
      }

      const now = DateTime.now()

      // Check whether it is possible to register to the course.
      if (registration.course) {
        const course = await Course.findOne(
          { _id: registration.course },
          'archived coordinator published schedule visibility'
        ).lean()
        if (!course) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }

        // Only the coordinator can accept an invitation request
        // for a course with the 'published' status and 'invite-only' visibility
        // and within the registration schedule, if any.
        if (
          !isCoordinator(course, user) ||
          !course.published ||
          course.archived ||
          course.visibility !== 'invite-only' ||
          !canEnroll(course, now)
        ) {
          throw new UserInputError('INVITATION_REQUEST_ACCEPTANCE_FAILED')
        }
      }

      // Check whether it is possible to register to the program.
      if (registration.program) {
        const program = await Program.findOne(
          { _id: registration.program },
          'archived coordinator courses published visibility'
        ).lean()
        if (!program) {
          throw new UserInputError('PROGRAM_NOT_FOUND')
        }

        // Only the coordinator can accept an invitation request
        // for a program with the 'published' status and 'invite-only' visibility
        // and within the registration schedule, if any.
        if (
          !isCoordinator(program, user) ||
          !program.published ||
          program.archived ||
          program.visibility !== 'invite-only'
        ) {
          throw new UserInputError('INVITATION_REQUEST_ACCEPTANCE_FAILED')
        }

        // Creates the registrations to all the courses of the program.
        const courses = await Program.populate(program, [
          {
            path: 'courses.course',
            select: '_id schedule',
            model: 'Course',
          },
        ]).then((p) => p.courses.map((c) => c.course))

        try {
          await Promise.all(
            courses.map(async (course) => {
              const date =
                course.schedule?.registrationsStart ??
                course.schedule?.start ??
                now

              const registered = await Registration.exists({
                course: course._id,
                user: user.id,
              })
              if (!registered) {
                const registration = new Registration({
                  course: course._id,
                  date,
                  user: user.id,
                })
                await registration.save()
              }
            })
          )
        } catch (err) {
          Bugsnag.notify(err)
        }
      }

      // Accept the invitation request.
      registration.date = now
      registration.invitation = undefined

      // Save the registration into the database.
      try {
        await updateStudentStatus(models, registration.user)
        return await registration.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
    // Delete a registration.
    async deleteRegistration(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models

      // Retrieve the registration to delete.
      const registration = await Registration.findOne(
        { _id: args.id },
        'course'
      )
      if (!registration) {
        throw new UserInputError('REGISTRATION_NOT_FOUND')
      }

      // Retrieve the course associated to the registration.
      const course = await Course.findOne(
        { _id: registration.course },
        'archived coordinator published'
      ).lean()
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Only the coordinator can delete a registration
      // for a course with the 'published' status.
      if (
        !isCoordinator(course, user) ||
        !course.published ||
        course.archived
      ) {
        throw new UserInputError('REGISTRATION_DELETE')
      }

      // If the registration is confirmed, need to delete all the information
      // associated to the learner and related to the registration
      if (!registration.invitation) {
        // TODO: delete everything related to the confirmed registration
        throw new UserInputError('UPCOMING_FEATURE')
      }

      try {
        await registration.delete()
        return true
      } catch (err) {
        Bugsnag.notify(err)
      }

      return false
    },
    // Register to a given course, as a user.
    async register(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models

      const course = await Course.findOne(
        { code: args.courseCode },
        '_id archived coordinator published schedule teachers visibility'
      ).lean()
      if (!course) {
        throw new UserInputError('Course not found.')
      }

      // Can only directly register to
      // a published course with 'public' visibility
      // and if the connected user is not the coordinator or a teacher of the course
      // and within the registration schedule, if any.
      const now = DateTime.now()
      if (
        !course.published ||
        course.archived ||
        course.visibility !== 'public' ||
        isCoordinator(course, user) ||
        isTeacher(course, user) ||
        !canEnroll(course, now)
      ) {
        throw new UserInputError('REGISTRATION_FAILED')
      }

      // Check whether there is not already a registration.
      const isRegistered = await Registration.exists({
        course: course._id,
        user: user.id,
      })
      if (isRegistered) {
        throw new UserInputError('ALREADY_REGISTERED')
      }

      const registration = new Registration({
        course: course._id,
        date: now,
        user: user.id,
      })

      // Create a new registration for the user.
      try {
        return await registration.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
    // Remove the teaching or working group associated to this registration
    // (only possible for course registrations).
    async removeGroup(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models

      const groupType = args.type.toLowerCase()

      // Retrieve the registration that must be a confirmed one
      // to allow a group change.
      const registration = await Registration.findOne(
        { _id: args.id },
        'course group invitation'
      )
      if (
        !registration ||
        !registration.course ||
        registration.invitation ||
        !(groupType in registration.group)
      ) {
        throw new UserInputError('REGISTRATION_NOT_FOUND')
      }

      // Retrieve the course associated to the registration.
      const course = await Course.findOne(
        { _id: registration.course },
        'coordinator groups schedule'
      ).lean()
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Only the coordinator can update the group of a student
      // for a course for which groups have been defined.
      const now = DateTime.now()
      if (
        !isCoordinator(course, user) ||
        !course.groups ||
        !course.groups[groupType]?.length ||
        !canUpdateGroup(course, now)
      ) {
        throw new UserInputError('GROUP_REMOVAL_FAILED')
      }

      // Update the group assignment of the student.
      registration.group[groupType] = undefined
      if (!Object.keys(registration.group).length) {
        registration.group = undefined
      }

      // Save the registration into the database.
      try {
        return await registration.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
    // Make a request to be invited for a given course, as a user.
    async requestInvitation(_parent, args, { models, user }, _info) {
      const { Course, Program, Registration } = models

      if (args.courseCode && args.programCode) {
        throw new UserInputError('Bad args')
      }

      if (args.courseCode) {
        const course = await Course.findOne(
          { code: args.courseCode },
          '_id archived coordinator published schedule teachers visibility'
        ).lean()
        if (!course) {
          throw new UserInputError('Course not found.')
        }

        // Can only request an invitation for
        // a published course with 'invite-only' visibility
        // and if the connected user is not the coordinator or a teacher of the course
        // and within the registration schedule, if any.
        const now = DateTime.now()
        if (
          !course.published ||
          course.archived ||
          course.visibility !== 'invite-only' ||
          isCoordinator(course, user) ||
          isTeacher(course, user) ||
          !canEnroll(course, now)
        ) {
          throw new UserInputError('INVITATION_REQUEST')
        }

        // Check whether there is not already a registration.
        const isRegistered = await Registration.exists({
          course: course._id,
          user: user.id,
        })
        if (isRegistered) {
          throw new UserInputError('ALREADY_REGISTERED')
        }

        // Create a new registration for the user,
        // representing the invitation request.
        const registration = new Registration({
          course: course._id,
          invitation: 'requested',
          invitationDate: now,
          user: user.id,
        })

        try {
          return await registration.save()
        } catch (err) {
          Bugsnag.notify(err)
        }
      }

      if (args.programCode) {
        const program = await Program.findOne(
          { code: args.programCode },
          '_id archived coordinator published schedule teachers visibility'
        ).lean()
        if (!program) {
          throw new UserInputError('PROGRAM_NOT_FOUND')
        }

        // Can only request an invitation for
        // a published program with 'invite-only' visibility
        // and if the connected user is not the coordinator of the program
        // or the coordinator or a teacher of one of its courses
        const now = DateTime.now()
        if (
          !program.published ||
          program.archived ||
          program.visibility !== 'invite-only'
          // isCoordinator(course, user) ||
          // isTeacher(course, user) ||
          // !canEnroll(course, now)
        ) {
          throw new UserInputError('INVITATION_REQUEST_FAILED')
        }

        // Check whether there is not already a registration.
        const isRegistered = await Registration.exists({
          program: program._id,
          user: user.id,
        })
        if (isRegistered) {
          throw new UserInputError('ALREADY_REGISTERED')
        }

        // Create a new registration for the user,
        // representing the invitation request.
        const registration = new Registration({
          program: program._id,
          invitation: 'requested',
          invitationDate: now,
          user: user.id,
        })

        try {
          return await registration.save()
        } catch (err) {
          Bugsnag.notify(err)
        }
      }

      return null
    },
    // Send an invitation to an existing user or just to an email address.
    async sendInvitation(
      _parent,
      args,
      { models, smtpTransport, user },
      _info
    ) {
      const { Course, Registration, User } = models

      const course = await Course.findOne(
        { code: args.courseCode },
        'archived code coordinator name published schedule teachers visibility'
      ).lean()
      if (!course) {
        throw new UserInputError('Course not found.')
      }

      // Check whether the user already exists on the platform.
      const invitedUser = await User.findOne(
        { email: args.email },
        '_id displayName email roles username'
      )

      // Only the coordinator can send an invitation
      // for a published course with 'invite-only' or 'private' visibility
      // and, if the user to invite exists, not to the coordinator or a teacher of the course
      // and within the registration schedule, if any.
      const now = DateTime.now()
      if (
        !isCoordinator(course, user) ||
        !course.published ||
        course.archived ||
        (course.visibility !== 'invite-only' &&
          course.visibility !== 'private') ||
        isCoordinator(course, invitedUser) ||
        isTeacher(course, invitedUser) ||
        !canEnroll(course, now)
      ) {
        throw new UserInputError('INVITATION_SENDING_FAILED')
      }

      // Check whether there is not already a registration.
      if (invitedUser) {
        const isRegistered = await Registration.exists({
          course: course._id,
          user: invitedUser._id,
        })
        if (isRegistered) {
          throw new UserInputError('ALREADY_REGISTERED_OR_INVITED')
        }
      }

      // Create a new registration for the user,
      // representing the invitation that has been sent.
      const fields = {
        course: course._id,
        invitation: 'sent',
        invitationDate: now,
        user: invitedUser,
      }
      if (!invitedUser) {
        fields.email = args.email

        // Send an invitation email to the user.
        await smtpTransport.sendMail({
          to: args.email,
          from: 'sebastien@combefis.be',
          subject: '[TLCA] Invitation to a course',
          html:
            '<p>Hello,</p>' +
            `<p>You have been invited to the <i>“${course.code} – ${course.name}”</i> by its coordinator.</p>` +
            `<p>To accept the invitation, create an account on the <a href="https://www.tlca.eu">TLCA platform</a> with the email address on which you received this invitation.</p>` +
            '<p>The TLCA team</p>',
        })
      }
      const registration = new Registration(fields)

      try {
        return await registration.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
    // Update the teaching or working group associated to this registration.
    async updateGroup(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models

      const groupType = args.type.toLowerCase()

      // Retrieve the registration that must be a confirmed one
      // to allow a group change.
      const registration = await Registration.findOne(
        { _id: args.id },
        'course group invitation'
      )
      if (!registration || registration.invitation) {
        throw new UserInputError('REGISTRATION_NOT_FOUND')
      }

      // Retrieve the course associated to the registration.
      const course = await Course.findOne(
        { _id: registration.course },
        'coordinator groups schedule'
      ).lean()
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Only the coordinator can update the group of a student
      // for a course for which groups have been defined.
      const now = DateTime.now()
      if (
        !isCoordinator(course, user) ||
        !course.groups ||
        !course.groups[groupType]?.length ||
        !(args.group >= 0 && args.group < course.groups[groupType].length) ||
        !canUpdateGroup(course, now)
      ) {
        throw new UserInputError('GROUP_ASSIGNMENT_FAILED')
      }

      // Update the group assignment of the student.
      if (!registration.group) {
        registration.group = {}
      }
      registration.group[groupType] = args.group

      // Save the registration into the database.
      try {
        return await registration.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
  },
}

export default resolvers
