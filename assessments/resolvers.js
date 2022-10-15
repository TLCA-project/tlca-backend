import { AuthenticationError, UserInputError } from 'apollo-server'
import { DateTime } from 'luxon'

import { isCoordinator, isTeacher } from '../lib/courses.js'
import { hasRole } from '../lib/users.js'
import {
  cleanArray,
  cleanField,
  cleanObject,
  cleanString,
} from '../lib/utils.js'

// Clean up the optional args related to an assessment.
function clean(args) {
  cleanArray(args, 'competencies', 'phases')
  cleanField(
    args,
    'canRequestEvaluation',
    'end',
    'incremental',
    'instances',
    'oralDefense',
    'phased',
    'start',
    'takes'
  )
  cleanObject(args, 'load')
  cleanString(args, 'code', 'description')

  // Clean up competencies.
  const phases = !args.phased ? [args] : args.phases
  for (const phase of phases) {
    for (const competency of phase.competencies) {
      if (competency.checklist) {
        cleanArray(competency.checklist, 'private', 'public')
      }
      cleanArray(competency, 'learningOutcomes')
      cleanField(competency, 'maxStars', 'optional', 'stars')
    }
  }
}

const resolvers = {
  AssessmentCategory: {
    CASESTUDY: 'casestudy',
    CODING: 'coding',
    EXERCISE: 'exercise',
    INTERVIEW: 'interview',
    MISSION: 'mission',
    PROJECT: 'project',
    QUIZ: 'quiz',
  },
  AssessmentType: {
    INCREMENTAL: 'incremental',
    PHASED: 'phased',
    SINGLE_TAKE: 'single_take',
  },
  Assessment: {
    // Retrieve whether learners can request an evaluation for this assessment.
    canRequestEvaluation(assessment, _args, _context, _info) {
      return !!assessment.canRequestEvaluation
    },
    // Retrieve the detailed information about the competencies.
    async competencies(assessment, _args, { models }, _info) {
      const { Assessment } = models

      if (assessment.phased) {
        return null
      }
      return await Assessment.populate(assessment, [
        {
          path: 'competencies.competency',
          model: 'Competency',
        },
      ]).then((a) =>
        a.competencies.map((c) => ({ ...c, isOptional: c.optional }))
      )
    },
    // Retrieve whether this assessment has an oral defense.
    hasOralDefense(assessment, _args, _context, _info) {
      return !!assessment.oralDefense
    },
    // Retrieve the 'id' of the assessment from the MongoDB '_id'.
    id(assessment, _args, _context, _info) {
      return assessment._id.toString()
    },
    // Retrieve whether this assessment is closed.
    isClosed(assessment, _args, _context, _info) {
      return !!assessment.closed
    },
    // Retrieve whether this assessment is hidden.
    isHidden(assessment, _args, _context, _info) {
      return !!assessment.hidden
    },
    // Retrieve whether this assessment is incremental.
    isIncremental(assessment, _args, _context, _info) {
      return !!assessment.incremental
    },
    // Retrieve the type of this assessment.
    type(assessment, _args, _content, _info) {
      if (assessment.incremental) {
        return 'incremental'
      }
      if (assessment.phased) {
        return 'phased'
      }
      return 'single_take'
    },
  },
  AssessmentInstance: {
    // Retrieve the resolved data for this assessment instance.
    async content(instance, _args, { models }, _info) {
      const { Assessment } = models

      // Retrieve the assessment associated to this assessment instance.
      const assessment = await Assessment.findOne(
        { _id: instance.assessment },
        'provider providerConfig'
      ).lean()

      const content = {}

      switch (assessment.provider) {
        case 'tfq':
          content.deadline = instance.data.deadline
          content.questions = instance.data.questions.map((q, i) => ({
            competency: assessment.providerConfig.questions[i].competency,
            items: q.select.map(
              (j) => assessment.providerConfig.questions[i].pool[j].question
            ),
          }))
          break
      }

      return content
    },
    // Retrieve the 'datetime' creation of this assessment instance.
    datetime(assessmentInstance, _args, _context, _info) {
      return assessmentInstance.created
    },
    // Retrieve the 'id' of this assessment instance.
    id(assessmentInstance, _args, _context, _info) {
      return assessmentInstance._id.toString()
    },
  },
  Query: {
    // Retrieve one given assessment given its 'id'.
    async assessment(_parent, args, { models }, _info) {
      const { Assessment } = models

      const assessment = await Assessment.findOne({ _id: args.id }).lean()
      if (!assessment) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      return assessment
    },
    // Retrieve one given assessment instance given its 'id'.
    async assessmentInstance(_parent, args, { models }, _info) {
      const { AssessmentInstance } = models

      const instance = await AssessmentInstance.findOne({
        _id: args.id,
      }).lean()
      if (!instance) {
        throw new UserInputError('ASSESSMENT_INSTANCE_NOT_FOUND')
      }

      return instance
    },
    // Retrieve all the assessment instances
    // that are available to the connected user.
    async assessmentInstances(_parent, args, { models, user }, _info) {
      const { Assessment, AssessmentInstance, Registration, User } = models

      // Only 'admin' can access all the assessment instances
      // without specifying an assessment.
      if (!args.assessment && !hasRole(user, 'admin')) {
        throw new UserInputError('MISSING_FILTER')
      }

      const filter = {}

      // Filter by assessment.
      if (args.assessment) {
        const assessment = await Assessment.findOne(
          {
            _id: args.assessment,
          },
          '_id course'
        ).lean()
        if (!assessment) {
          throw new UserInputError('ASSESSMENT_NOT_FOUND')
        }

        // Only possible if the connected user
        // is either the coordinator or a teacher or is registered
        // to the course associated to the assessment.
        const course = await Assessment.populate(assessment, [
          {
            path: 'course',
            select: '_id coordinator teachers',
            model: 'Course',
          },
        ]).then((a) => a.course)

        const isRegistered = await Registration.exists({
          course: course._id,
          invitation: { $exists: false },
          user: user.id,
        })
        if (
          !(
            isCoordinator(course, user) ||
            isTeacher(course, user) ||
            isRegistered
          )
        ) {
          throw new AuthenticationError('NOT_AUTHORISED')
        }

        filter.assessment = assessment._id

        // Filter by learner, only possible if the connected user
        // is either the coordinator or a teacher
        // of the course associated to the assessment.
        if (isCoordinator(course, user) || isTeacher(course, user)) {
          if (args.learner) {
            const learner = await User.findOne(
              {
                username: args.learner,
              },
              '_id'
            ).lean()
            if (!learner) {
              throw new UserInputError('USER_NOT_FOUND')
            }

            filter.user = learner._id
          }
        }
        // By default, can only retrieve assessment instances
        // associated to the connected user.
        else {
          filter.user = user.id
        }
      }

      return await AssessmentInstance.find(filter).lean()
    },
    // Retrieve all the assessments
    // that are available to the connected user.
    async assessments(_parent, args, { models, user }, _info) {
      const { Assessment, Course, Registration } = models

      // Only 'admin' can access all the assessments
      // without specifying a course code.
      if (!args.courseCode && !hasRole(user, 'admin')) {
        throw new UserInputError('COURSE_CODE_REQUIRED')
      }

      const filter = {}

      // Filter the assessments to only keep those associated to the specified course.
      if (args.courseCode) {
        const course = await Course.findOne(
          { code: args.courseCode },
          '_id coordinator teachers'
        ).lean()
        if (!course) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }

        filter.course = course._id

        const isRegistered = await Registration.exists({
          course: course._id,
          invitation: { $exists: false },
          user: user.id,
        })
        if (
          !(
            (hasRole(user, 'teacher') &&
              (isCoordinator(course, user) || isTeacher(course, user))) ||
            (hasRole(user, 'student') && isRegistered)
          )
        ) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }

        if (isRegistered) {
          filter.hidden = { $ne: true }
        }
      }

      // Filter the assessements to only keep the open ones.
      if (args.open) {
        filter.closed = { $ne: true }
      }

      return await Assessment.find(filter).lean()
    },
  },
  Mutation: {
    // Create a new assessment from the specified parameters.
    async createAssessment(_parent, args, { models, user }, _info) {
      const { Assessment, Competency, Course, Event } = models

      // Either competencies or phases must be defined.
      if (!args.phased && !args.competencies) {
        throw new UserInputError('MISSING_COMPETENCIES')
      }
      if (args.phased && !args.phases) {
        throw new UserInputError('MISSING_PHASES')
      }

      // Clean up the optional args.
      clean(args)

      // Retrieve the course for which to create an assessment.
      const course = await Course.findOne({ code: args.course })
        .lean()
        .populate({
          path: 'competencies.competency',
          select: 'code',
          model: 'Competency',
        })
      if (!course || !isCoordinator(course, user)) {
        throw new UserInputError('COURSE_NOT_FOUND')
      }

      // Code must be unique among assessments from the same course.
      if (
        args.code &&
        (await Assessment.exists({
          course: course._id,
          code: args.code,
        }))
      ) {
        throw new UserInputError('INVALID_CODE', {
          formErrors: {
            code: 'The specified code already exists',
          },
        })
      }

      // Check that the constraints are satisfied.
      const courseCompetencies = course.competencies.map(
        (c) => c.competency.code
      )

      const phases = !args.phased ? [args] : args.phases
      for (const phase of phases) {
        if (
          phase.competencies.some(
            (c) => !courseCompetencies.includes(c.competency)
          )
        ) {
          throw new UserInputError('INVALID_COMPETENCIES')
        }
      }

      // Create the assessment Mongoose object.
      const assessment = new Assessment(args)
      const resolveCompetencies = async (c) => ({
        ...c,
        competency: (await Competency.exists({ code: c.competency }))?._id,
      })
      if (!args.phased) {
        assessment.competencies = await Promise.all(
          args.competencies.map(resolveCompetencies)
        )
      } else {
        assessment.phases = await Promise.all(
          args.phases.map(async (p) => ({
            ...p,
            competencies: await Promise.all(
              p.competencies.map(resolveCompetencies)
            ),
          }))
        )
      }

      assessment.course = course._id
      assessment.hidden = true
      assessment.user = user.id

      // Create a new event for this assessment, if asked for.
      if (args.createEvent) {
        if (
          !args.start ||
          !args.end ||
          !(DateTime.fromISO(args.start) < DateTime.fromISO(args.end))
        ) {
          throw new UserInputError('INVALID_EVENT_DATES')
        }

        const event = new Event({
          course: course._id,
          end: args.end,
          start: args.start,
          title: args.name,
          type: 'assessment',
        })
        await event.save()
        assessment.event = event._id
      }

      // Save the assessment into the database.
      try {
        return await assessment.save()
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
      }

      return null
    },
    // Create an instance of an assessment (for those with an external provider).
    async createAssessmentInstance(_parent, args, { models, user }, _info) {
      const { Assessment, AssessmentInstance, Registration } = models

      // Retrieve the assessment for which to create an instance.
      const assessment = await Assessment.findOne(
        { _id: args.id },
        '_id closed course hidden provider providerConfig'
      ).lean()
      if (
        !assessment ||
        assessment.closed ||
        assessment.hidden ||
        !assessment.provider
      ) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      // Check whether the user is registered to the course
      const isRegistered = await Registration.exists({
        course: assessment.course,
        user: user.id,
      })
      if (!isRegistered) {
        throw new AuthenticationError('NOT_AUTHORISED')
      }

      // Check whether there is already an assessment instance.
      const instance = await AssessmentInstance.findOne({
        assessment: assessment._id,
        user: user.id,
      })
      if (instance) {
        return instance
      }

      // TODO: the logic to create the instance.
      const data = {}
      const config = assessment.providerConfig

      switch (assessment.provider) {
        case 'tfq':
          data.started = Date.now
          data.deadline = DateTime.now()
            .plus({ seconds: config.maxTime })
            .toISO()
          data.questions = []
          for (const question of config.questions) {
            const select = []
            while (select.length < question.select) {
              const r = Math.floor(Math.random() * question.pool.length)
              if (select.indexOf(r) === -1) {
                select.push(r)
              }
            }
            data.questions.push({ select })
          }
          break
      }

      // Create the assessment instance Mongoose object.
      const newInstance = new AssessmentInstance({
        assessment: assessment._id,
        data,
        user: user.id,
      })

      // Save the assessment instance into the database.
      try {
        return await newInstance.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
    // Edit an existing assessment from the specified parameters.
    async editAssessment(_parent, args, { models, user }, _info) {
      const { Assessment, Competency } = models

      // Retrieve the assessment to edit.
      const assessment = await Assessment.findOne({ _id: args.id }).populate({
        path: 'course',
        select: '_id competencies coordinator',
        model: 'Course',
      })
      if (!assessment || !isCoordinator(assessment.course, user)) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      // Clean up the optional args.
      clean(args)

      // Code must be unique among assessments from the same course.
      if (
        args.code &&
        (await Assessment.exists({
          course: assessment.course._id,
          code: args.code,
          _id: { $ne: assessment._id },
        }))
      ) {
        throw new UserInputError('INVALID_CODE', {
          formErrors: {
            code: 'The specified code already exists',
          },
        })
      }

      // Check that the constraints are satisfied.
      // TODO: only check if it has been changed
      const courseCompetencies = await Assessment.populate(assessment, [
        {
          path: 'course.competencies.competency',
          select: 'code',
          model: 'Competency',
        },
      ]).then((a) => a.course.competencies.map((c) => c.competency.code))
      if (
        args.competencies.some(
          (c) => !courseCompetencies.includes(c.competency)
        )
      ) {
        throw new UserInputError('INVALID_COMPETENCIES')
      }

      // Edit the assessment mongoose object.
      for (const field of [
        'canRequestEvaluation',
        'category',
        'code',
        'competencies',
        'description',
        'end',
        'incremental',
        'instances',
        'load',
        'name',
        'oralDefense',
        'start',
        'takes',
      ]) {
        assessment[field] = args[field]
      }
      assessment.competencies = await Promise.all(
        args.competencies.map(async (c) => ({
          ...c,
          competency: (await Competency.exists({ code: c.competency }))?._id,
        }))
      )

      // Save the assessment into the database.
      try {
        return await assessment.save()
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
      }

      return null
    },
    // Delete a new assessment.
    async deleteAssessment(_parent, args, { models, user }, _info) {
      const { Assessment, Evaluation, Event } = models

      // Retrieve the assessment to delete.
      const assessment = await Assessment.findOne({ _id: args.id }).populate({
        path: 'course',
        select: 'coordinator',
        model: 'Course',
      })
      if (!assessment || !isCoordinator(assessment.course, user)) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      // Check if there are any evaluation associated to the assessment.
      if (await Evaluation.exists({ assessment: assessment._id })) {
        throw new UserInputError('EVALUATIONS_STILL_ASSOCIATED')
      }

      try {
        // Check if there is an event associated to the assessment
        // and delete it, if any.
        if (assessment.event) {
          const event = await Event.findOne({ _id: assessment.event })
          if (event) {
            await event.delete()
          }
        }

        await assessment.delete()
        return true
      } catch (err) {
        console.log(err)
      }

      return false
    },
    // Open or close this assessment depending on its openness.
    async openCloseAssessment(_parent, args, { models, user }, _info) {
      const { Assessment } = models

      // Retrieve the assessment to update.
      const assessment = await Assessment.findOne({ _id: args.id }).populate({
        path: 'course',
        select: 'coordinator',
        model: 'Course',
      })
      if (!assessment || !isCoordinator(assessment.course, user)) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      // Switch the openness of this assessment.
      assessment.closed = !assessment.closed
      if (!assessment.closed) {
        delete assessment.closed
      }

      try {
        // Update the assessment into the database.
        return await assessment.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
    async saveAssessmentTake(_parent, args, { models, user }, _info) {
      const { AssessmentInstance, Evaluation } = models

      // Retrieve the assessment instance.
      const instance = await AssessmentInstance.findOne({ _id: args.id })
        .populate({
          path: 'assessment',
          select: 'course',
          model: 'Assessment',
        })
        .lean()
      if (!instance) {
        throw new UserInputError('ASSESSMENT_INSTANCE_NOT_FOUND')
      }

      if (DateTime.now() > DateTime.fromISO(instance.data.deadline)) {
        throw new UserInputError('TOO_LATE_TO_SAVE')
      }

      let evaluation = await Evaluation.findOne({ instance: args.id })
      if (!evaluation) {
        evaluation = new Evaluation(args)
        evaluation.assessment = instance.assessment._id
        evaluation.course = instance.assessment.course
        evaluation.instance = args.id
        evaluation.user = user.id
      }
      evaluation.data = { answer: args.answer }
      evaluation.requested = Date.now()

      try {
        // Save or update the evaluation into the database.
        await evaluation.save()
        return true
      } catch (err) {
        console.log(err)
        return false
      }
    },
    // Show or hide this assessment depending on its visibility.
    async showHideAssessment(_parent, args, { models, user }, _info) {
      const { Assessment } = models

      // Retrieve the assessment to update.
      const assessment = await Assessment.findOne({ _id: args.id }).populate({
        path: 'course',
        select: 'coordinator',
        model: 'Course',
      })
      if (!assessment || !isCoordinator(assessment.course, user)) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      // Switch the visibility of this assessment.
      assessment.hidden = !assessment.hidden
      if (!assessment.hidden) {
        delete assessment.hidden
      }

      try {
        // Update the assessment into the database.
        return await assessment.save()
      } catch (err) {
        console.log(err)
      }

      return null
    },
  },
}

export default resolvers
