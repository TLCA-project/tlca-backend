import { UserInputError } from 'apollo-server'
import mongoose from 'mongoose'

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
  ProgramVisibility: {
    PUBLIC: 'public',
    INVITE_ONLY: 'invite-only',
    PRIVATE: 'private',
  },
  Program: {
    // Retrieve the detailed information about the coordinator.
    async coordinator(program, _args, { models }, _info) {
      const { User } = models

      return await User.findOne({ _id: program.coordinator })
    },
    // Retrieve whether this program is archived.
    isArchived(program, _args, _context, _info) {
      return !!program.archived
    },
    // Retrieve whether this program is or has been published.
    isPublished(program, _args, _context, _info) {
      return !!program.published
    },
    // Retrieve the detailed information about the partners,
    // that is, the concatenation of all the partners of the
    // courses associated to this program.
    async partners(program, _args, { models }, _info) {
      const { Course, Partner } = models

      // Retrieve all the courses.
      const courses = await Course.find(
        { _id: { $in: program.courses.map((c) => c.course._id || c.course) } },
        'partners'
      )

      // Retrieve all the partners.
      const partners = []
      courses.forEach((c) => {
        partners.push(...c.partners)
      })

      return await Partner.find({ _id: { $in: partners } })
    },
    // Retrieve the status of the program according to
    // it's publication and archive dates.
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
    async programs(_parent, args, { models, user }, _info) {
      const { Program } = models

      const pipeline = []

      // Basically, can only retrieve programs that are:
      // with the 'public' or invite-only' visibilities,
      // and with the 'published' status.
      const filter = {
        $or: [
          {
            $and: [
              { published: { $exists: true } },
              { archived: { $exists: false } },
              {
                $or: [{ visibility: 'public' }, { visibility: 'invite-only' }],
              },
            ],
          },
        ],
      }

      // If a user is connected,
      // adjust the filter according to his/her roles.
      if (user && args.view !== 'user') {
        const { roles } = user
        const userId = new mongoose.Types.ObjectId(user.id)

        // Teachers can also access their own programs
        // no matter their status or visibility.
        if (roles.includes('teacher')) {
          filter.$or.push({ coordinator: userId })
        }

        // Students can also access the courses they are registered to
        // no matter their status or visibility.
        if (roles.includes('student')) {
          pipeline.push(
            {
              $lookup: {
                from: 'registrations',
                localField: '_id',
                foreignField: 'program',
                as: 'registrations',
              },
            },
            {
              $addFields: {
                isRegistered: {
                  $anyElementTrue: {
                    $map: {
                      input: '$registrations',
                      as: 'registration',
                      in: {
                        $and: [
                          { $eq: ['$$registration.user', userId] },
                          {
                            $eq: [
                              { $type: '$$registration.invitation' },
                              'missing',
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            }
          )

          filter.$or.push({ isRegistered: true })
        }

        // Admin can access to all the courses.
        if (roles.includes('admin')) {
          delete filter.$or
        }

        // If the view argument is defined,
        // adjust the filter according to it.
        const { view } = args
        if (view) {
          switch (view) {
            case 'coordinator':
              filter.$or = [{ coordinator: userId }]
              break

            case 'student':
              filter.$or = [{ isRegistered: true }]
              break
          }
        }
      }

      // Only set the defined filter when no user is connected,
      // or if the connected one has not the admin role.
      if (!user || !user.roles.includes('admin')) {
        pipeline.push({ $match: filter })
      }

      // Set up offset and limit.
      pipeline.push({ $skip: Math.max(0, args.offset ?? 0) })
      if (args.limit) {
        pipeline.push({ $limit: args.limit })
      }

      // Retrieve all the programs satisfying the conditions defined hereabove
      pipeline.push({ $project: { registrations: 0 } })
      const programs = await Program.aggregate(pipeline)

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
