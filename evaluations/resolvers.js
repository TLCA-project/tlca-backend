import Bugsnag from '@bugsnag/js'

import { UserInputError } from 'apollo-server'

import { isCoordinator, isEvaluator } from '../lib/courses.js'

const resolvers = {
  EvaluationStatus: {
    PUBLISHED: 'published',
    UNPUBLISHED: 'unpublished',
  },
  Evaluation: {
    // Retrieve the assessment that this evaluation is for.
    async assessment(evaluation, _args, { models }, _info) {
      const { Assessment } = models
      return await Assessment.findOne({ _id: evaluation.assessment })
    },
    // Retrieve the course that this evaluation is related to.
    async course(evaluation, _args, { models }, _info) {
      const { Course } = models
      return await Course.findOne({ _id: evaluation.course })
    },
    // Retrieve the date the evaluation was taken.
    date(evaluation, _args, _context, _info) {
      return evaluation.evalDate || evaluation.date
    },
    // Retrieve the 'id' of the evaluation from the MongoDB '_id'.
    id(evaluation, _args, _context, _info) {
      return evaluation._id.toString()
    },
    // Retrieve whether this evaluation is published or not.
    isPublished(evaluation, _args, _context, _info) {
      return !!evaluation.published
    },
    // Retrieve the learner who took this evaluation.
    async learner(evaluation, _args, { models }, _info) {
      const { User } = models
      return await User.findOne({ _id: evaluation.user })
    },
    // Retrieve the status of this evaluation
    // according to it's publication date.
    status(evaluation, _args, _content, _info) {
      if (evaluation.published) {
        return 'published'
      }
      return 'unpublished'
    },
  },
  Query: {
    // Retrieve one given evaluation given its 'id'.
    async evaluation(_parent, args, { models }, _info) {
      const { Evaluation } = models

      const evaluation = await Evaluation.findOne({ _id: args.id })
        .populate({
          path: 'competencies.competency',
          model: 'Competency',
        })
        .lean()
      if (!evaluation) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      return evaluation
    },
    // Retrieve all the evaluations
    // that are available to the connected user.
    async evaluations(_parent, args, { models }, _info) {
      const { Course, Evaluation, User } = models

      const filter = {}

      if (args.assessment) {
        filter.assessment = args.assessment
      }

      if (args.courseCode) {
        const course = await Course.exists({ code: args.courseCode })
        if (!course) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }
        filter.course = course._id
      }

      if (args.learner) {
        const learner = await User.exists({ username: args.learner })
        if (!learner) {
          throw new UserInputError('LEARNER_NOT_FOUND')
        }
        filter.user = learner._id
      }

      return await Evaluation.find(filter)
        .populate({
          path: 'competencies.competency',
          model: 'Competency',
        })
        .lean()
    },
  },
  Mutation: {
    // Create a new evaluation from the specified assessment and learner.
    async createEvaluation(_parent, args, { models, user }, _info) {
      const { Assessment, AssessmentInstance, Competency, Evaluation, User } =
        models

      // Clean up the optional args.
      if (!args.comment?.trim().length) {
        delete args.comment
      }
      if (!args.evalDate) {
        delete args.evalDate
      }

      // Retrieve the learner for which to create an evaluation.
      const learner = await User.exists({ username: args.learner })
      if (!learner) {
        throw new UserInputError('LEARNER_NOT_FOUND')
      }

      // Retrieve the assessment for which to create an evaluation.
      const assessment = await Assessment.findOne(
        { _id: args.assessment },
        '_id course'
      ).lean()
      if (!assessment) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      // Retrieve the assessment instance or create a new one.
      let instance = null
      if (args.instance) {
        // Retrieve the assessment instance for which to create an evaluation.
        instance = await AssessmentInstance.findOne(
          { _id: args.instance },
          '_id assessment'
        )
        if (
          !instance ||
          instance.assessment.toString() !== assessment._id.toString()
        ) {
          throw new UserInputError('ASSESSMENT_INSTANCE_NOT_FOUND')
        }
      } else {
        instance = new AssessmentInstance({
          assessment: assessment._id,
          user: learner._id,
        })
      }

      // Save the evaluation into the database.
      try {
        await instance.save()

        // Create the evaluation Mongoose object.
        const evaluation = new Evaluation(args)
        evaluation.assessment = assessment._id
        evaluation.competencies = await Promise.all(
          args.competencies.map(async (c) => ({
            ...c,
            competency: await Competency.exists({ code: c.competency }),
          }))
        )
        evaluation.course = assessment.course._id
        evaluation.evaluator = user.id
        evaluation.instance = instance._id
        evaluation.user = learner._id

        return await evaluation.save()
      } catch (err) {
        const formErrors = {}

        switch (err.name) {
          case 'ValidationError':
            Object.keys(err.errors).forEach(
              (e) => (formErrors[e] = err.errors[e].properties.message)
            )
            throw new UserInputError('VALIDATION_ERROR', { formErrors })
        }
      }

      return null
    },
    // Delete an existing evaluation.
    async deleteEvaluation(_parent, args, { models, user }, _info) {
      const { AssessmentInstance, Evaluation } = models

      // Retrieve the evaluation to delete.
      const evaluation = await Evaluation.findOne(
        { _id: args.id },
        '_id evaluator instance published'
      )
      if (!evaluation || !isEvaluator(evaluation, user)) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      // If the evaluation is already published,
      // must delete all the progress history elements as well.
      if (evaluation.published) {
        throw new UserInputError('NOT_AUTHORISED')
      }

      // If the evaluation if the only one of its instance
      // must delete the instance as well.
      const instance = await AssessmentInstance.findOne(
        {
          _id: evaluation.instance,
        },
        '_id'
      )
      if (!instance) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }
      const evaluationsNb = await Evaluation.countDocuments({
        instance: instance._id,
      })

      // Delete the evaluation.
      try {
        if (evaluationsNb === 1) {
          await instance.delete()
        }

        await evaluation.delete()
        return true
      } catch (err) {
        Bugsnag.notify(err)
      }

      return false
    },
    async publishEvaluation(_parent, args, { models, user }, _info) {
      const { Evaluation, ProgressHistory } = models

      const evaluation = await Evaluation.findOne({ _id: args.id }).populate([
        {
          path: 'assessment',
          select: 'competencies incremental takes',
          model: 'Assessment',
        },
        {
          path: 'course',
          select: 'coordinator',
          model: 'Course',
        },
      ])
      if (!evaluation) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      // Can only publish an evaluation that is not published yet
      // and only its evaluator or the associated course coordinator can publish it.
      if (
        evaluation.published ||
        (!isEvaluator(evaluation, user) &&
          !isCoordinator(evaluation.course, user))
      ) {
        throw new UserInputError('NOT_AUTHORISED')
      }

      // Retrieve all the existing evaluations for the same assessment instance.
      const evaluations = await Evaluation.find(
        {
          instance: evaluation.instance,
          published: { $exists: true },
        },
        '_id competencies date evalDate published'
      ).lean()
      if (!evaluations) {
        throw new UserInputError('EVALUATION_PUBLICATION_FAILED')
      }

      // Sort the published evaluations by evaluation date.
      evaluations.forEach((e) => {
        if (!e.evalDate) {
          e.evalDate = e.date
        }
      })
      evaluations.sort((a, b) => (a.evalDate > b.evalDate ? 1 : -1))

      // Check the constraints related to the assessment.
      const assessment = evaluation.assessment
      if (
        (!assessment.incremental && evaluations.length > 0) ||
        (assessment.incremental &&
          assessment.takes &&
          evaluations.length >= assessment.takes)
      ) {
        throw new UserInputError('INVALID_EVALUATION')
      }

      // Build the history of validated competencies and learning outcomes.
      const competencies = {}
      assessment.competencies.forEach((c) => {
        competencies[c.competency.toString()] = {
          acquiredLearningOutcomes: c.learningOutcomes?.map((_) => false),
          stars: c.stars,
          learningOutcomes: c.learningOutcomes,
          selected: false,
        }
      })
      evaluations.forEach((e) => {
        e.competencies.forEach((c) => {
          const competency = competencies[c.competency.toString()]

          competency.selected ||= c.selected

          if (c.learningOutcomes?.length) {
            for (let i = 0; i < c.learningOutcomes.length; i++) {
              competency.acquiredLearningOutcomes[i] ||= c.learningOutcomes[i]
            }
          }
        })
      })

      // Check the constraints related to the acquired competencies.
      for (const c of evaluation.competencies) {
        const competency = competencies[c.competency.toString()]

        if (c.selected && competency.selected) {
          throw new UserInputError('INVALID_EVALUATION')
        }

        if (c.learningOutcomes?.length) {
          if (
            c.learningOutcomes.some(
              (lo, i) => lo && competency.acquiredLearningOutcomes[i]
            )
          ) {
            throw new UserInputError('INVALID_EVALUATION')
          }
        }
      }

      // Create the progress history.
      const history = []
      for (const {
        competency,
        learningOutcomes,
        selected,
      } of evaluation.competencies) {
        const progressHistory = new ProgressHistory({
          competency,
          date: evaluation.evalDate ?? evaluation.date,
          evaluation: evaluation._id,
          user: evaluation.user,
        })

        // Save stars history if the competency has been selected.
        if ((!learningOutcomes || !learningOutcomes.length) && selected) {
          progressHistory.stars = competencies[competency.toString()].stars
        }
        // Save learning outcomes history if at least one has been selected.
        else if (learningOutcomes?.some((lo) => lo)) {
          progressHistory.learningOutcomes = learningOutcomes
            .map((lo, i) =>
              lo ? competencies[competency.toString()].learningOutcomes[i] : -1
            )
            .filter((e) => e !== -1)
        }

        // Add the history element.
        if (progressHistory.stars || progressHistory.learningOutcomes) {
          history.push(progressHistory)
        }
      }

      // Publish the evaluation.
      evaluation.published = new Date()

      try {
        // Save the evaluation into the database.
        await Promise.all(history.map(async (h) => h.save()))
        return await evaluation.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
  },
}

export default resolvers
