import { UserInputError } from 'apollo-server'

const resolvers = {
  CompetencyType: {
    PRACTICAL: 'practical',
    THEORETICAL: 'theoretical',
  },
  Competency: {
    async partners(competency, _args, { models }, _info) {
      const { Partner } = models

      return await Partner.find({ _id: { $in: competency.partners } })
    },
    async user(competency, _args, { models }, _info) {
      const { User } = models

      if (competency.user) {
        return await User.findOne({ _id: competency.user._id })
      }

      return null
    },
  },
  Query: {
    async competencies(_parent, args, { models, user }, _info) {
      const { Competency } = models

      // Basically, can only access own competencies and those which are public.
      const filter = { $or: [{ user: user.id }, { public: true }] }

      // Set up offset and limit.
      const skip = Math.max(0, args.offset ?? 0)
      const limit = args.limit ?? undefined

      // Retrieve all the competencies satisfying the conditions defined hereabove
      // of all the competencies if the connected user has the admin role.
      const competencies = await Competency.find(
        user.roles.includes('admin') ? {} : filter,
        null,
        { skip, limit }
      )

      // Populate the returned competencies with derived fields.
      return competencies.map((competency) => ({
        ...competency.toJSON(),
        isOwner: competency.user._id.toString() === user.id,
        isPublic: competency.public,
      }))
    },
    async competency(_parent, args, { models, user }, _info) {
      const { Competency } = models

      let competency = await Competency.findOne({ code: args.code })
      if (!competency) {
        throw new UserInputError('Competency not found.')
      }

      // Basically, can only access own competencies and those which are public
      if (!(competency.user._id.toString() === user.id || competency.public)) {
        throw new UserInputError('Competency not found.')
      }

      return competency
    },
  },
  Mutation: {
    async createCompetency(_parent, args, { models, user }, _info) {
      const { Competency } = models

      // Clean up the optional args.
      if (args.description?.trim().length === 0) {
        args.description = undefined
      }
      if (!args.isPublic) {
        args.isPublic = undefined
      }
      if (args.partners?.length === 0) {
        args.partners = undefined
      }

      // Create the competency Mongoose object.
      const competency = new Competency(args)
      competency.public = args.isPublic
      competency.user = user.id

      // Save the competency into the database.
      try {
        await competency.save()
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
        return false
      }
    },
  },
}

export default resolvers
