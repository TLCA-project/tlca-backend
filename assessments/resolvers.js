import { UserInputError } from 'apollo-server'

const resolvers = {
  Query: {
    async assessment(_parent, args, { models }, _info) {
      const { Assessment } = models

      const assessment = await Assessment.findOne({ _id: args.id })
      if (!assessment) {
        throw new UserInputError('Assessment not found.')
      }

      return assessment
    },
  },
}

export default resolvers
