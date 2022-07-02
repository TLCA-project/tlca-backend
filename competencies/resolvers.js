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

      // Basically, can only access own competencies and those which are public
      const filter = { $or: [{ user: user.id }, { public: true }] }

      // Set up offset and limit.
      const skip = Math.max(0, args.offset ?? 0)
      const limit = args.limit ?? undefined

      // Retrieve all the competencies satisfying the conditions defined hereabove.
      const competencies = await Competency.find(filter, null, { skip, limit })
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
}

export default resolvers
