const resolvers = {
  Competency: {
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
    async competency(_parent, args, { models }, _info) {
      //   const { Program } = models
      //   let program = await Program.findOne({ code: args.code })
      //   if (!program) {
      //     throw new UserInputError('Program not found.')
      //   }
      //   program = await Program.populate(program, [
      //     {
      //       path: 'coordinator',
      //       select: '_id displayName username',
      //       model: 'User',
      //     },
      //   ]).then((c) => c.toJSON())
      //   if (
      //     _info.operation.selectionSet.selections[0].selectionSet.selections.find(
      //       (s) => s.name.value === 'courses'
      //     )
      //   ) {
      //     program = await Program.populate(program, [
      //       { path: 'courses', model: 'Course' },
      //     ])
      //   }
      //   return program
    },
  },
}

export default resolvers
