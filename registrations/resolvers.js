import { UserInputError } from 'apollo-server'

function isCoordinator(course, user) {
  const userId = user?.id
  return (course.coordinator._id || course.coordinator).toString() === userId
}

const resolvers = {
  RegistrationInvite: {
    REQUESTED: 'requested',
    SENT: 'sent',
  },
  Mutation: {
    async updateGroup(_parent, args, { models, user }, _info) {
      const { Course, Registration } = models

      const registration = await Registration.findOne({ _id: args.id })
      if (!registration) {
        throw new UserInputError('REGISTRATION_NOT_FOUND')
      }

      // Group can only be assigned for confirmed registrations.
      if (registration.invite) {
        throw new UserInputError('GROUP_ASSIGNMENT_FAILED')
      }

      const course = await Course.findOne({ _id: registration.course })
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Only the coordinator can update the group of a student
      // for a course for which groups have been defined.
      if (
        !isCoordinator(course, user) ||
        !course.groups?.length ||
        !(args.group >= 0 && args.group < course.groups.length)
      ) {
        throw new UserInputError('GROUP_ASSIGNMENT_FAILED')
      }

      // TODO: Can only update the group when the course is not finished.

      // Update the group assignment of the student.
      registration.group = args.group

      // Save the registration into the database.
      try {
        return await registration.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
  },
}

export default resolvers
