import { UserInputError } from 'apollo-server'
import mongoose from 'mongoose'

import { isCoordinator } from '../lib/courses.js'
import { cleanField } from '../lib/utils.js'

// Clean up the optional args related to a program.
function clean(args) {
  // Clean up courses.
  for (const course of args.courses) {
    cleanField(course, 'optional')
  }
}

// Handle errors resulting from the creation or edit of a program.
function handleError(err) {
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
}

const resolvers = {
  ProgramStatus: {
    ARCHIVED: 'archived',
    PUBLISHED: 'published',
    UNPUBLISHED: 'unpublished',
  },
  ProgramType: {
    TRAINING: 'training',
    UNIT: 'unit',
    UPROGRAM: 'uprogram',
  },
  ProgramVisibility: {
    INVITE_ONLY: 'invite-only',
    PRIVATE: 'private',
    PUBLIC: 'public',
  },
  ProgramView: {
    COORDINATOR: 'coordinator',
    STUDENT: 'student',
    USER: 'user',
  },
  Program: {
    // Retrieve the detailed information about the coordinator of this program.
    async coordinator(program, _args, { models }, _info) {
      const { User } = models
      return await User.findOne({ _id: program.coordinator }).lean()
    },
    // Retrieve the detailed information about the courses of this program.
    async courses(program, _args, { models }, _info) {
      const { Program } = models

      return await Program.populate(program, {
        path: 'courses.course',
        model: 'Course',
      }).then((p) => p.courses.map((c) => ({ ...c, isOptional: c.optional })))
    },
    // Retrieve whether this program is archived.
    isArchived(program, _args, _context, _info) {
      return !!program.archived
    },
    // Retrieve whether the connected user is the coordinator of this program.
    isCoordinator(program, _args, { user }, _info) {
      const coordinator = program.coordinator
      return (coordinator?._id || coordinator)?.toString() === user.id
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

      // Retrieve all the courses from this program.
      const programCourses = program.courses.map(
        (c) => c.course._id || c.course
      )
      const courses = await Course.find(
        { _id: { $in: programCourses } },
        'partners'
      ).lean()

      // Retrieve all the partners.
      const partners = []
      courses.forEach((c) => {
        if (c.partners?.length) {
          partners.push(...c.partners)
        }
      })

      return await Partner.find({ _id: { $in: partners } }).lean()
    },
    // Retrieve the status of this program according to
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
          select: '_id username',
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
  Mutation: {
    async createProgram(_parent, args, { models, user }, _info) {
      const { Course, Program } = models

      // Clean up the optional args.
      clean(args)

      // Create the program Mongoose object.
      const program = new Program(args)
      program.courses = await Promise.all(
        args.courses.map(async (c) => ({
          ...c,
          course: (await Course.findOne({ code: c.course }))?._id,
        }))
      )
      program.coordinator = user.id
      program.user = user.id

      // Save the program into the database.
      try {
        return await program.save()
      } catch (err) {
        handleError(err)
      }

      return null
    },
    // Edit an existing program with the specified parameters.
    async editProgram(_parent, args, { models, user }, _info) {
      const { Course, Program } = models

      // Retrieve the program to edit.
      const program = await Program.findOne({ code: args.code })
      if (!program || !isCoordinator(program, user)) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      // Clean up the optional args.
      clean(args)

      // Edit the program mongoose object.
      for (const field of ['description', 'name', 'type', 'visibility']) {
        program[field] = args[field]
      }
      program.courses = await Promise.all(
        args.courses.map(async (c) => ({
          ...c,
          course: (await Course.exists({ code: c.course }))?._id,
        }))
      )

      // Save the program into the database.
      try {
        return await program.save()
      } catch (err) {
        handleError(err)
      }

      return null
    },
    async publishProgram(_parent, args, { models, user }, _info) {
      const { Program } = models

      const program = await Program.findOne({ code: args.code })
      if (!program) {
        throw new UserInputError('PROGRAM_NOT_FOUND')
      }

      // Can only publish a program that is not published yet
      // and only the program coordinator can publish it.
      if (
        program.published ||
        program.archived ||
        !isCoordinator(program, user)
      ) {
        throw new UserInputError('PROGRAM_PUBLICATION_FAILED')
      }

      // Can only publish a program if all its courses are published.
      const courses = await Program.populate(program, [
        {
          path: 'courses.course',
          select: 'archived published',
          model: 'Course',
        },
      ]).then((a) => a.courses)
      if (courses.some(({ course: c }) => !c.published || c.archived)) {
        throw new UserInputError('UNPUBLISHED_PROGRAM_COURSES')
      }
      // TODO: add the check regarding the schedule also, in this latter.

      // Publish the program.
      program.published = new Date()

      try {
        // Save the program into the database.
        return await program.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
  },
}

export default resolvers
