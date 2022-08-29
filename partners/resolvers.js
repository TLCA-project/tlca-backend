import { UserInputError } from 'apollo-server'

// Clean up the optional args related to a competency.
function clean(args) {
  for (const field of ['abbreviation', 'website']) {
    if (!args[field]?.trim().length) {
      delete args[field]
    }
  }
}

const resolvers = {
  Partner: {
    async courses(partner, _args, { models: { Course } }, _info) {
      const pipeline = []

      // Only retrieve the courses from this partner that are:
      // - public or invite-only
      // - published and not archived.
      pipeline.push({
        $match: {
          $and: [
            { $expr: { $in: [partner._id, { $ifNull: ['$partners', []] }] } },
            {
              $expr: {
                $or: [
                  { $eq: ['$visibility', 'public'] },
                  { $eq: ['$visibility', 'invite-only'] },
                ],
              },
            },
            { published: { $exists: true } },
            { archived: { $exists: false } },
          ],
        },
      })

      return await Course.aggregate(pipeline)
    },
  },
  Query: {
    async partners(_parent, args, { models }, _info) {
      const { Partner } = models

      // Set up offset and limit.
      const skip = Math.max(0, args.offset ?? 0)
      const limit = args.limit ?? undefined

      // Retrieve all the courses satisfying the conditions defined hereabove.
      const partners = await Partner.find({}, null, { skip, limit })

      return partners
    },
    async partner(_parent, args, { models }, _info) {
      const { Partner } = models

      const partner = await Partner.findOne({ code: args.code })
      if (!partner) {
        throw new UserInputError('Partner not found.')
      }

      return partner
    },
  },
  Mutation: {
    // Create a new partner from the specified parameters.
    async createPartner(_parent, args, { models, user }, _info) {
      const { Partner } = models

      // Clean up the optional args.
      clean(args)

      // Create the partner mongoose object.
      const partner = new Partner(args)
      partner.representative = user.id
      partner.user = user.id

      // Save the partner into the database.
      try {
        return await partner.save()
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
