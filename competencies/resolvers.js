import Bugsnag from '@bugsnag/js'
import { UserInputError } from 'apollo-server'
import mongoose from 'mongoose'

import { cleanArray, cleanField, cleanString } from '../lib/utils.js'

// Clean up the optional args related to a competency.
function clean(args) {
  cleanArray(args, 'learningOutcomes', 'partners', 'tags')
  cleanField(args, 'public')
  cleanString(args, 'description')

  // Clean up learning outcomes.
  if (args.learningOutcomes) {
    for (const learningOutcome of args.learningOutcomes) {
      cleanField(learningOutcome, 'takes')
    }
  }
}

const resolvers = {
  CompetencyType: {
    PRACTICAL: 'practical',
    THEORETICAL: 'theoretical',
  },
  Competency: {
    // Retrieve whether this competency has learning outcomes.
    hasLearningOutcomes(competency, _args, _context, _info) {
      return competency.learningOutcomes?.length
    },
    // Retrieve whether this competency is archived.
    isArchived(competency, _args, _context, _info) {
      return !!competency.archived
    },
    // Retrieve whether this competency has been created by the connected user.
    isOwner(competency, _args, { user }, _info) {
      const creator = competency.user
      return (creator._id || creator).toString() === user.id
    },
    // Retrieve whether this competency is public.
    isPublic(competency, _args, _context, _info) {
      return !!competency.public
    },
    // Retrieve the detailed information about the partners.
    async partners(competency, _args, { models }, _info) {
      const { Partner } = models
      return await Partner.find({ _id: { $in: competency.partners } }).lean()
    },
    // Retrieve the detailed information about the user
    // who created this competency.
    async user(competency, _args, { models }, _info) {
      const { User } = models
      return await User.findOne({ _id: competency.user }).lean()
    },
  },
  Query: {
    // Retrieve all the competencies
    // that are available to the connected user.
    async competencies(_parent, args, { models, user }, _info) {
      const { Competency } = models

      // Basically, can only retrieve competencies that are:
      // - public.
      const filter = { $or: [{ public: true }] }

      // If a user is connected,
      // adjust the filter according to his/her roles.
      if (user) {
        const { roles } = user

        // Teachers can also access their own competencies
        // no matter whether they are public or not.
        if (roles.includes('teacher')) {
          filter.$or.push({ user: user.id })
        }

        // Admin can access to all the competencies.
        if (roles.includes('admin')) {
          delete filter.$or
        }
      }

      // Set up offset and limit.
      const skip = Math.max(0, args.offset ?? 0)
      const limit = args.limit ?? undefined

      // Retrieve all the competencies satisfying the conditions defined hereabove.
      return await Competency.find(filter, null, { skip, limit }).lean()
    },
    // Retrieve one given competency given its 'code'.
    async competency(_parent, args, { models, user }, _info) {
      const { Competency } = models

      const competency = await Competency.findOne({ code: args.code }).lean()
      if (!competency) {
        throw new UserInputError('COMPETENCY_NOT_FOUND')
      }

      // Basically, can only access own competencies and those which are public
      if (!(competency.user._id.toString() === user.id || competency.public)) {
        throw new UserInputError('COMPETENCY_NOT_FOUND')
      }

      return competency
    },
  },
  Mutation: {
    // Archive a competency.
    async archiveCompetency(_parent, args, { models, user }, _info) {
      const { Competency, Course } = models

      // Retrieve the competency to archive.
      const competency = await Competency.findOne({ code: args.code })
      if (!competency || competency.user.toString() !== user.id) {
        throw new UserInputError('COMPETENCY_NOT_FOUND')
      }
      if (competency.archived) {
        throw new UserInputError('COMPETENCY_ALREADY_ARCHIVED')
      }

      // Check that the competency is not used in a non archived course.
      const courses = await Course.find({
        'competencies.competency': competency._id,
        archived: { $exists: false },
      }).lean()
      if (courses.length) {
        throw new UserInputError('COMPETENCY_ARCHIVE_FAILED')
      }

      // Archive the competency.
      competency.archived = new Date()

      // Save the competency into the database.
      try {
        return await competency.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
    // Create a new competency from the specified parameters.
    async createCompetency(_parent, args, { models, user }, _info) {
      const { Competency, Partner } = models

      // Clean up the optional args.
      clean(args)

      // Create the competency mongoose object.
      const competency = new Competency(args)
      if (args.partners) {
        competency.partners = await Promise.all(
          args.partners.map(
            async (p) => (await Partner.exists({ code: p }).lean())?._id
          )
        )
      }
      competency.user = user.id

      // Save the competency into the database.
      try {
        return await competency.save()
      } catch (err) {
        const formErrors = {}

        switch (err.name) {
          case 'MongoServerError':
            switch (err.code) {
              case 11000:
                throw new UserInputError('EXISTING_CODE', {
                  formErrors: {
                    code: 'The specified code already exists',
                  },
                })
            }
            break

          case 'ValidationError':
            Object.keys(err.errors).forEach(
              (e) => (formErrors[e] = err.errors[e].properties.message)
            )
            throw new UserInputError('VALIDATION_ERROR', { formErrors })
        }

        return false
      }
    },
    // Edit an existing competency from the specified parameters.
    async editCompetency(_parent, args, { models, user }, _info) {
      const { Competency, Partner } = models

      // Retrieve the competency to edit.
      const competency = await Competency.findOne({ code: args.code })
      if (!competency || competency.user.toString() !== user.id) {
        throw new UserInputError('COMPETENCY_NOT_FOUND')
      }

      // Clean up the optional args.
      clean(args)

      // Edit the competency mongoose object.
      for (const field of [
        'description',
        'learningOutcomes',
        'name',
        'public',
        'tags',
        'type',
      ]) {
        competency[field] = args[field]
      }
      competency.partners = !args.partners
        ? undefined
        : await Promise.all(
            args.partners.map(
              async (p) => (await Partner.exists({ code: p }).lean())?._id
            )
          )

      // Save the competency into the database.
      try {
        return await competency.save()
      } catch (err) {
        const formErrors = {}

        switch (err.name) {
          case 'MongoServerError':
            switch (err.code) {
              case 11000:
                throw new UserInputError('EXISTING_CODE', {
                  formErrors: {
                    code: 'The specified code already exists',
                  },
                })
            }
            break

          case 'ValidationError':
            Object.keys(err.errors).forEach(
              (e) => (formErrors[e] = err.errors[e].properties.message)
            )
            throw new UserInputError('VALIDATION_ERROR', { formErrors })
        }

        return false
      }
    },
  },
}

export default resolvers
