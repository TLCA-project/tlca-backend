import { UserInputError } from 'apollo-server'

const resolvers = {
  ProgramStatus: {
    ARCHIVED: 'archived',
    PUBLISHED: 'published',
    UNPUBLISHED: 'unpublished',
  },
  ProgramType: {
    TRAINING: 'training',
    UPROGRAM: 'uprogram',
  },
  Program: {
    async coordinator(program, _args, { models }, _info) {
      const { User } = models

      return await User.findOne({ _id: program.coordinator })
    },
    async partners(program, _args, { models }, _info) {
      const { Partner } = models

      const partners = []

      if (program.courses) {
        program.courses.forEach((c) => {
          partners.push(...c.partners)
        })
      }

      return await Partner.find({ _id: { $in: partners } })
    },
    status(program, _args, _content, _info) {
      if (!program.published) {
        return 'unpublished'
      }
      if (!program.archived) {
        return 'published'
      }
      if (program.archived) {
        return 'archived'
      }

      return null
    },
  },
  Query: {
    async programs(_parent, args, { models }, _info) {
      const { Program } = models

      // Set up offset and limit.
      const skip = Math.max(0, args.offset ?? 0)
      const limit = args.limit ?? undefined

      // Retrieve all the courses satisfying the conditions defined hereabove.
      const programs = await Program.find({}, null, { skip, limit })

      return programs
    },
    async program(_parent, args, { models }, _info) {
      const { Program } = models

      let program = await Program.findOne({ code: args.code })
      if (!program) {
        throw new UserInputError('Program not found.')
      }

      program = await Program.populate(program, [
        {
          path: 'coordinator',
          select: '_id displayName username',
          model: 'User',
        },
      ]).then((c) => c.toJSON())

      if (
        _info.operation.selectionSet.selections[0].selectionSet.selections.find(
          (s) => s.name.value === 'courses'
        )
      ) {
        program = await Program.populate(program, [
          { path: 'courses', model: 'Course' },
        ])
      }

      return program
    },
  },
}

export default resolvers
