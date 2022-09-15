import { UserInputError } from 'apollo-server'

import { hasRole } from '../lib/users.js'

const resolvers = {
  EventType: {
    ASSESSMENT: 'assessment',
    LAB: 'lab',
    LECTURE: 'lecture',
  },
  Event: {
    // Retrieve the 'id' of the event from the MongoDB '_id'.
    id(event, _args, _context, _info) {
      return event._id.toString()
    },
  },
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

      // Filter the events to only keep those associated to the specified course.
      if (args.courseCode) {
        const course = await Course.exists({ code: args.courseCode })
        if (!course) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }

        filter.course = course._id
      } else {
        filter.user = user.id

        // Only 'admin' can access all the events
        if (hasRole(user, 'admin')) {
          delete filter.user
        }
      }

      return await Event.find(filter).lean()
    },
  },
  Mutation: {
    async createEvent(_parent, args, { models, user }, _info) {
      const { Course, Event } = models

      // Clean up the optional args.
      if (!args.description?.trim().length) {
        delete args.description
      }

      // Create the event Mongoose object.
      const event = new Event(args)
      event.user = user.id

      // Retrieve the course for which to create an event, if any.
      if (args.courseCode) {
        const course = await Course.exists({ code: args.courseCode })
        if (!course) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }

        event.course = course._id
      }

      // Save the event into the database.
      try {
        return await event.save()
      } catch (err) {
        const formErrors = {}

        switch (err.name) {
          case 'ValidationError':
            Object.keys(err.errors).forEach(
              (e) => (formErrors[e] = err.errors[e].properties.message)
            )
            throw new UserInputError('VALIDATION_ERROR', { formErrors })
        }
      }

      return null
    },
  },
}

export default resolvers
