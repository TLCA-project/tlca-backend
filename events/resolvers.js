import { UserInputError } from 'apollo-server'

import { hasRole } from '../lib/users.js'

const resolvers = {
  Query: {
    // Retrieve one given event given its 'id'.
    async event(_parent, args, { models }, _info) {
      const { Event } = models

      const event = await Event.findOne({ _id: args.id }).lean()
      if (!event) {
        throw new UserInputError('EVENT_NOT_FOUND')
      }

      return event
    },
    // Retrieve all the events
    // that are available to the connected user.
    async events(_parent, args, { models, user }, _info) {
      const { Course, Event } = models

      const filter = {}

      filter.user = user.id

      // Only 'admin' can access all the events
      if (hasRole(user, 'admin')) {
        delete filter.user
      }

      // Filter the events to only keep those associated to the specified course.
      if (args.courseCode) {
        const course = await Course.exists({ code: args.courseCode })
        if (!course) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }

        filter.course = course._id
      }

      return await Event.find(filter).lean()
    },
  },
}

export default resolvers
