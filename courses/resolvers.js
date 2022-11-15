import { UserInputError } from 'apollo-server'
import { DateTime } from 'luxon'
import mongoose from 'mongoose'

import { isCoordinator } from '../lib/courses.js'
import {
  cleanArray,
  cleanField,
  cleanObject,
  cleanString,
} from '../lib/utils.js'

// Clean up the optional args related to a course.
function clean(args) {
  cleanArray(args, 'partners', 'schedule', 'tags', 'teachers')
  cleanField(args, 'colophon', 'field', 'language', 'span')
  cleanObject(args, 'load')
  cleanString(args, 'description')

  // Clean up competencies.
  for (const competency of args.competencies) {
    cleanField(competency, 'useLearningOutcomes')
    cleanString(competency, 'subcategory')
  }

  // Clean up groups.
  if (args.groups) {
    cleanArray(args.groups, 'teaching', 'working')
  }
  cleanObject(args, 'groups')
}

// Handle errors resulting from the creation or edit of a course.
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
  CompetencyCategory: {
    ADVANCED: 'advanced',
    BASIC: 'basic',
  },
  CourseLoadType: {
    WEEKLY: 'weekly',
    THEO_PRAC: 'theo+prac',
  },
  CourseStatus: {
    ARCHIVED: 'archived',
    PUBLISHED: 'published',
    UNPUBLISHED: 'unpublished',
  },
  CourseType: {
    PROJECT: 'project',
    TRAINING: 'training',
    UCOURSE: 'ucourse',
    UNIT: 'unit',
  },
  CourseView: {
    COORDINATOR: 'coordinator',
    STUDENT: 'student',
    TEACHER: 'teacher',
    USER: 'user',
  },
  Visibility: {
    INVITE_ONLY: 'invite-only',
    PRIVATE: 'private',
    PUBLIC: 'public',
  },
  Course: {
    async assessments(course, _args, { models }, _info) {
      const { Assessment } = models

      return await Assessment.find({ course: course._id })
    },
    async coordinator(course, _args, { models }, _info) {
      const { User } = models

      return await User.findOne({ _id: course.coordinator })
    },
    hasAdvancedCompetencies(course, _args, _context, _info) {
      return course.competencies.some((c) => c.category === 'advanced')
    },
    // Check whether this courses has groups (teaching or working).
    hasGroups(course, _args, _context, _info) {
      return (
        !!course.groups &&
        ['teaching', 'working'].some((g) => course.groups[g]?.length > 0)
      )
    },
    hasTeachingGroups(course, _args, _context, _info) {
      return course.groups?.teaching?.length
    },
    hasWorkingGroups(course, _args, _context, _info) {
      return course.groups?.working?.length
    },
    // Check whether the connected user has received an invitation for this course.
    async hasReceivedInvitation(course, _args, { models, user }, _info) {
      const { Registration } = models

      const registration = await Registration.findOne({
        course: course._id,
        user: user.id,
      }).lean()
      return registration?.invitation === 'sent'
    },
    // Check whether the connected user has requested an invitation for this course.
    async hasRequestedInvitation(course, _args, { models, user }, _info) {
      const { Registration } = models

      const registration = await Registration.findOne({
        course: course._id,
        user: user.id,
      }).lean()
      return registration?.invitation === 'requested'
    },
    isArchived(course, _args, _context, _info) {
      return !!course.archived
    },
    isCoordinator(course, _args, { user }, _info) {
      const coordinator = course.coordinator
      return (coordinator?._id || coordinator)?.toString() === user.id
    },
    isPublished(course, _args, _context, _info) {
      return !!course.published
    },
    async isRegistered(course, _args, { models, user }, _info) {
      const { Registration } = models

      const registration = await Registration.findOne({
        course: course._id,
        user: user.id,
      })

      return !!registration && !registration.invitation
    },
    isTeacher(course, _args, { user }, _info) {
      return !!course.teachers?.some((t) => (t._id || t).toString() === user.id)
    },
    async partners(course, _args, { models }, _info) {
      const { Partner } = models

      return await Partner.find({ _id: { $in: course.partners } })
    },
    async registration(course, _args, { models, user }, _info) {
      const { Registration } = models

      return await Registration.findOne({ course: course._id, user: user.id })
    },
    async registrations(course, _args, { models }, _info) {
      const { Registration } = models

      const registrations = await Registration.find({ course: course._id })
        .lean()
        .populate('user')

      return registrations.map((r) => ({ ...r, datetime: r.date, id: r._id }))
    },
    status(course, _args, _content, _info) {
      if (!course.published) {
        return 'unpublished'
      }
      if (!course.archived) {
        return 'published'
      }
      if (course.archived) {
        return 'archived'
      }

      return null
    },
    // Retrieve the teachers of this course.
    async teachers(course, _args, { models }, _info) {
      if (!course.teachers || !course.teachers.length) {
        return null
      }

      const { User } = models

      return await Promise.all(
        course.teachers.map(async (t) => await User.findOne({ _id: t }))
      )
    },
    team(course, _args, _context, _info) {
      const team = []

      // Add all the teachers.
      const teachers = course.teachers
      if (teachers) {
        team.push(...teachers)
      }

      // Add the coordinator if he/she is not also a teacher.
      const coordinator = course.coordinator
      if (
        !team.find(
          (t) =>
            (t._id || t).toString() ===
            (coordinator._id || coordinator).toString()
        )
      ) {
        team.push(coordinator)
      }

      return team
    },
    // workingGroups(course, _args, _context, _info) {
    //   return course.groups?.working
    // },
  },
  CourseGroup: {
    async teaching(group, _args, { models, user }, _info) {
      const { User } = models

      if (!group.teaching) {
        return null
      }

      return await Promise.all(
        group.teaching.map(async (g) => ({
          ...g,
          isSupervisor: g.supervisor._id.toString() === user.id,
          supervisor: await User.findOne({ _id: g.supervisor }),
        }))
      )
    },
  },
  Query: {
    async courses(_parent, args, { models, user }, _info) {
      const { Course } = models

      const pipeline = []

      // Basically, can only retrieve courses that are:
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

        // Teachers can also access their own courses
        // no matter their status or visibility.
        if (roles.includes('teacher')) {
          filter.$or.push({ coordinator: userId }, { teachers: userId })
        }

        // Students can also access the courses they are registered to
        // no matter their status or visibility.
        if (roles.includes('student')) {
          pipeline.push(
            {
              $lookup: {
                from: 'registrations',
                localField: '_id',
                foreignField: 'course',
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

            case 'teacher':
              filter.$or = [
                {
                  $and: [
                    { published: { $exists: true } },
                    { $or: [{ coordinator: userId }, { teachers: userId }] },
                  ],
                },
              ]
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

      // Retrieve all the courses satisfying the conditions defined hereabove
      // of all the competencies if the connected user has the admin role.
      pipeline.push({ $project: { registrations: 0 } })
      const courses = await Course.aggregate(pipeline)

      return courses
    },
    async course(_parent, args, { models, user }, _info) {
      const { Course } = models

      let course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('Course not found.')
      }

      // If no user is authenticated,
      // reject the request if the course has not been published or is archived
      if (
        !user &&
        (!course.published ||
          course.archived ||
          course.visibility === 'private')
      ) {
        throw new UserInputError('Course not found.')
      }

      course = await Course.populate(course, [
        {
          path: 'competencies.competency',
          select: 'code description learningOutcomes name',
          model: 'Competency',
        },
        {
          path: 'coordinator',
          select: '_id username',
          model: 'User',
        },
        { path: 'teachers', select: '_id username', model: 'User' },
      ]).then((c) => c.toJSON())

      // Rename the 'id' field of the coordinator and teachers
      course.coordinator.id = course.coordinator._id.toString()
      // if (course.teachers) {
      //   course.teachers.forEach((t) => (t.id = t._id.toString()))
      // }

      // Restructure the format of the schedule
      if (course.schedule) {
        course.schedule = Object.entries(course.schedule).map(
          ([name, date]) => ({ name, datetime: date })
        )
      }

      return course
    },
  },
  Mutation: {
    async archiveCourse(_parent, args, { models, user }, _info) {
      const { Course } = models

      // Clean up the optional args.
      if (args.archiveCode?.trim().length === 0) {
        args.archiveCode = undefined
      }

      const course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Can only archive a course that is published.
      if (
        !course.published ||
        course.archived ||
        !isCoordinator(course, user)
      ) {
        throw new UserInputError('COURSE_ARCHIVING_FAILED')
      }

      // TODO: Can only archive a course with respect to its schedule.

      // Archive the course
      const archiveDate = DateTime.now()
      if (!args.archiveCode) {
        args.archiveCode = `${course.code}_${archiveDate.toFormat(
          'yyyy-MM-dd_HH-mm'
        )}_archived`
      }
      course.archived = archiveDate.toISO()
      course.code = args.archiveCode

      // Save the course into the database.
      try {
        return await course.save()
      } catch (err) {
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
        }
      }

      return null
    },
    async cloneCourse(_parent, args, { models, user }, _info) {
      const { Assessment, Course } = models

      // Clean up the optional args.
      if (args.cloneCode?.trim().length === 0) {
        args.cloneCode = undefined
      }

      const course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Can only clone a course that is archived.
      if (!course.archived || !isCoordinator(course, user)) {
        throw new UserInputError('COURSE_CLONING_FAILED')
      }

      // TODO: Can only clone a course with respect to its schedule.

      // Clone the course.
      const cloneDate = DateTime.now()
      if (!args.cloneCode) {
        args.cloneCode = `${course.code}_${cloneDate.toFormat(
          'yyyy-MM-dd_HH-mm'
        )}_cloned`
      }

      const clone = new Course(course)
      clone.isNew = true

      clone.published = undefined
      clone.archived = undefined

      clone._id = new mongoose.Types.ObjectId()
      clone.clonedFrom = course._id
      clone.code = args.cloneCode
      clone.created = new Date()
      clone.user = new mongoose.Types.ObjectId(user.id)

      // Save the course into the database.
      try {
        const cloneCourse = await clone.save()

        // Clone the assessments of the course.
        const assessments = await Assessment.find({ course: course._id })
        await Promise.all(
          assessments.map(async (assessment) => {
            const clone = new Assessment(assessment)
            clone.isNew = true

            clone._id = new mongoose.Types.ObjectId()
            clone.clonedFrom = assessment._id
            clone.course = cloneCourse._id
            clone.created = new Date()
            clone.user = new mongoose.Types.ObjectId(user.id)

            await clone.save()
          })
        )

        return cloneCourse
      } catch (err) {
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
        }
      }

      return null
    },
    async createCourse(_parent, args, { models, user }, _info) {
      const { Competency, Course, Partner, User } = models

      // Clean up the optional args.
      clean(args)

      // Create the course Mongoose object.
      const course = new Course(args)
      course.competencies = await Promise.all(
        args.competencies.map(async (c) => ({
          ...c,
          competency: (await Competency.exists({ code: c.competency }))?._id,
        }))
      )
      course.coordinator = user.id
      course.groups = {}
      if (args.groups?.teaching) {
        course.groups.teaching = await Promise.all(
          args.groups.teaching.map(async (g) => ({
            ...g,
            supervisor: (await User.exists({ username: g.supervisor }))?._id,
          }))
        )
      }
      if (args.groups?.working) {
        course.groups.working = args.groups.working
      }
      if (!course.groups.teaching && !course.groups.working) {
        course.groups = undefined
      }
      if (args.partners) {
        course.partners = await Promise.all(
          args.partners.map(async (p) => await Partner.exists({ code: p })?._id)
        )
      }
      if (args.schedule?.length) {
        course.schedule = args.schedule.reduce(
          (schedule, event) => ({
            ...schedule,
            [event.name]: event.datetime,
          }),
          {}
        )
      }
      if (args.teachers) {
        course.teachers = await Promise.all(
          args.teachers.map(
            async (t) => await User.exists({ username: t })?._id
          )
        )
      }
      course.user = user.id

      // Save the course into the database.
      try {
        return await course.save()
      } catch (err) {
        handleError(err)
      }

      return null
    },
    async editCourse(_parent, args, { models, user }, _info) {
      const { Competency, Course, Partner, User } = models

      // Retrieve the course to edit.
      const course = await Course.findOne({ code: args.code })
      if (!course || !isCoordinator(course, user)) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Clean up the optional args.
      clean(args)

      // Edit the course mongoose object.
      for (const field of [
        'colophon',
        'description',
        'field',
        'language',
        'load',
        'name',
        'span',
        'tags',
        'type',
        'visibility',
      ]) {
        course[field] = args[field]
      }

      course.competencies = await Promise.all(
        args.competencies.map(async (c) => ({
          ...c,
          competency: await Competency.exists({ code: c.competency }),
        }))
      )

      course.groups = undefined
      if (args.groups) {
        course.groups = {}

        if (args.groups.teaching) {
          course.groups.teaching = await Promise.all(
            args.groups.teaching.map(async (g) => ({
              ...g,
              supervisor: await User.exists({ username: g.supervisor }),
            }))
          )
        }

        if (args.groups.working) {
          course.groups.working = args.groups.working
        }
      }

      course.partners = !args.partners
        ? undefined
        : await Promise.all(
            args.partners.map(async (p) => await Partner.exists({ code: p }))
          )

      course.schedule = !args.schedule
        ? undefined
        : args.schedule.reduce(
            (schedule, event) => ({
              ...schedule,
              [event.name]: event.datetime,
            }),
            {}
          )

      course.teachers = !args.teachers
        ? undefined
        : await Promise.all(
            args.teachers.map(async (t) => await User.exists({ username: t }))
          )

      // Save the course into the database.
      try {
        return await course.save()
      } catch (err) {
        handleError(err)
      }

      return null
    },
    async publishCourse(_parent, args, { models, user }, _info) {
      const { Course } = models

      const course = await Course.findOne({ code: args.code })
      if (!course) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Can only publish a course that is not published yet
      // and only the course coordinator can publish it.
      if (course.published || course.archived || !isCoordinator(course, user)) {
        throw new UserInputError('COURSE_PUBLICATION_FAILED')
      }

      // TODO: Can only publish a course with respect to its schedule.

      // Publish the course
      course.published = new Date()

      // Save the course into the database.
      try {
        return await course.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
  },
}

export default resolvers
