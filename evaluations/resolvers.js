import Bugsnag from '@bugsnag/js'
import { DateTime } from 'luxon'

import { AuthenticationError, UserInputError } from 'apollo-server'

import { canTake } from '../lib/assessments.js'
import { isCoordinator, isEvaluator, isTeacher } from '../lib/courses.js'
import {
  cleanArray,
  cleanField,
  cleanObject,
  cleanString,
} from '../lib/utils.js'

// Clean up the optional args related to an assessment.
function clean(args) {
  cleanField(
    args,
    'accepted',
    'evalDate',
    'instance',
    'published',
    'rejected',
    'requested'
  )
  cleanString(args, 'comment', 'explanation', 'note', 'rejectedReason')

  // Clean up each competency.
  for (const competency of args.competencies) {
    const { checklist, learningOutcomes } = competency

    if (checklist) {
      for (const t of ['private', 'public']) {
        if (checklist[t]?.every((i) => !i)) {
          competency.checklist[t] = undefined
        }
        cleanArray(checklist, t)
      }
    }
    cleanObject(competency, 'checklist')

    if (learningOutcomes) {
      if (learningOutcomes.every((lo) => !lo)) {
        competency.learningOutcomes = undefined
      }
      cleanArray(competency, 'learningOutcomes')
    }

    if (
      !competency.selected &&
      !competency.checklist &&
      !competency.learningOutcomes
    ) {
      competency.delete = true
    }

    cleanField(competency, 'selected')
  }

  args.competencies = args.competencies.filter((c) => !c.delete)
  cleanArray(args, 'competencies')
}

function isRequestPending(evaluation) {
  return (
    evaluation.requested &&
    !(evaluation.accepted || evaluation.rejected) &&
    !evaluation.published
  )
}

// Create the progress history.
async function saveProgressHistory(evaluation, assessment, models) {
  const { ProgressHistory } = models

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
    const phases = assessment.phases ?? [assessment]
    const c = phases[evaluation.phase ?? 0].competencies.find(
      (c) =>
        (c.competency._id ?? c.competency).toString() === competency.toString()
    )

    // Save stars history if the competency has been selected.
    if (selected && (!learningOutcomes || !learningOutcomes.length)) {
      progressHistory.stars = c.stars
    }
    // Save learning outcomes history if at least one has been selected.
    else if (learningOutcomes?.some((lo) => lo)) {
      progressHistory.learningOutcomes = learningOutcomes
        .map((lo, i) => (lo ? c.learningOutcomes[i] : -1))
        .filter((e) => e !== -1)
    }

    // Add the history element.
    if (progressHistory.stars || progressHistory.learningOutcomes) {
      history.push(progressHistory)
    }
  }

  await Promise.all(history.map(async (h) => h.save()))
}

// Retrieve the status of an evaluation.
function status(evaluation) {
  if (evaluation.published) {
    return 'published'
  }
  if (evaluation.requested) {
    if (evaluation.accepted) {
      return 'accepted'
    }
    if (evaluation.rejected) {
      return 'rejected'
    }
    return 'requested'
  }
  return 'unpublished'
}

const resolvers = {
  EvaluationStatus: {
    ACCEPTED: 'accepted',
    PUBLISHED: 'published',
    REJECTED: 'rejected',
    REQUESTED: 'requested',
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
    // Retrieve the date the evaluation was created.
    created(evaluation, _args, _context, _info) {
      return evaluation.date
    },
    // Retrieve the data associated to this evaluation.
    async data(evaluation, _args, { models }, _info) {
      const { Assessment, AssessmentInstance } = models

      if (evaluation.published) {
        // Retrieve the instance associated to this evaluation.
        const instance = await AssessmentInstance.findOne(
          { _id: evaluation.instance },
          'data'
        ).lean()

        // Retrieve the assessment associated to this assessment instance.
        const assessment = await Assessment.findOne(
          { _id: evaluation.assessment },
          'provider providerConfig'
        ).lean()

        const { provider, providerConfig } = assessment

        switch (provider) {
          case 'tfq':
            evaluation.data.answers = instance.data.questions.map((q, i) =>
              q.select.map((item, j) => {
                const question = providerConfig.questions[i].pool[item]
                return {
                  feedback: question.feedback,
                  correct: evaluation.data.answer[i][j] === question.answer,
                }
              })
            )
            break
        }
      }

      return evaluation.data
    },
    // Retrieve the date the evaluation was taken.
    date(evaluation, _args, _context, _info) {
      return evaluation.evalDate ?? evaluation.accepted ?? evaluation.date
    },
    // Retrieve the evaluator who created this evaluation.
    async evaluator(evaluation, _args, { models }, _info) {
      const { User } = models
      return await User.findOne({ _id: evaluation.evaluator }).lean()
    },
    // Retrieve the 'id' of the evaluation from the MongoDB '_id'.
    id(evaluation, _args, _context, _info) {
      return evaluation._id.toString()
    },
    // Retrieve the instance associated with this evaluation.
    async instance(evaluation, _args, { models }, _info) {
      const { AssessmentInstance } = models
      return await AssessmentInstance.findOne({
        _id: evaluation.instance,
      }).lean()
    },
    // Retrieve whether this evaluation is published.
    isPublished(evaluation, _args, _context, _info) {
      return !!evaluation.published
    },
    // Retrieve whether this evalation request is still pending.
    isRequestPending(evaluation, _args, _context, _info) {
      return isRequestPending(evaluation)
    },
    // Retrieve the learner who took this evaluation.
    async learner(evaluation, _args, { models }, _info) {
      const { User } = models
      return await User.findOne({ _id: evaluation.user }).lean()
    },
    // Retrieve the competencies acquired
    // from previous evaluations of the same instance.
    async pastCompetencies(evaluation, _args, { models }, _info) {
      const { Competency, Evaluation } = models

      const competencies = {}
      const pastEvaluations = await Evaluation.find(
        {
          _id: { $ne: evaluation._id },
          date: { $lte: evaluation.date },
          instance: evaluation.instance,
        },
        'competencies'
      ).lean()

      for (const evaluation of pastEvaluations) {
        if (!evaluation.competencies) {
          continue
        }

        for (const competency of evaluation.competencies) {
          const id = competency.competency.toString()
          if (!competencies[id]) {
            competencies[id] = competency
          } else {
            if (competency.learningOutcomes) {
              if (!competencies[id].learningOutcomes) {
                competencies[id].learningOutcomes = competency.learningOutcomes
              }
            }
            competencies[id].selected ||= competency.selected
          }
        }
      }

      const pastCompetencies = await Promise.all(
        Object.values(competencies)
          .filter((c) => c.selected || c.learningOutcomes?.some((lo) => lo))
          .map(async (c) => ({
            ...c,
            competency: await Competency.findOne({ _id: c.competency }),
          }))
      )

      return pastCompetencies
    },
    // Retrieve the status of this evaluation
    // according to it's publication date.
    status(evaluation, _args, _content, _info) {
      return status(evaluation)
    },
  },
  EvaluationCompetency: {
    async competency(evaluationCompetency, _args, { models }, _info) {
      const { Competency } = models
      return await Competency.findOne({
        _id: evaluationCompetency.competency,
      }).lean()
    },
  },
  Query: {
    // Retrieve one given evaluation given its 'id'.
    async evaluation(_parent, args, { models, user }, _info) {
      const { Evaluation } = models

      const evaluation = await Evaluation.findOne({ _id: args.id })
        .populate({
          path: 'competencies.competency',
          model: 'Competency',
        })
        .populate({
          path: 'requestedCompetencies.competency',
          model: 'Competency',
        })
        .lean()
      if (!evaluation) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      if (
        !isEvaluator(evaluation, user) &&
        evaluation.accepted &&
        !evaluation.published
      ) {
        const requestedCompetencies = await Evaluation.populate(evaluation, {
          path: 'requestedCompetencies.competency',
          model: 'Competency',
        }).then((e) => e.requestedCompetencies)
        evaluation.competencies = requestedCompetencies ?? []
      }

      return evaluation
    },
    // Retrieve all the evaluations
    // that are available to the connected user.
    async evaluations(_parent, args, { models, user }, _info) {
      const { Course, Evaluation } = models

      // Basically, can only retrieve evaluations whose:
      // the connected user is the evaluator,
      // or is the learner being evaluated,
      // and that are published.
      const filter = {
        $and: [
          {
            $or: [
              {
                $and: [
                  { published: { $exists: true } },
                  { $or: [{ evaluator: user.id }, { user: user.id }] },
                ],
              },
            ],
          },
        ],
      }

      // Teachers can also access unpublished evaluations.
      if (user.roles.includes('teacher')) {
        filter.$and[0].$or.push({ publish: { $exists: false } })
      }

      // Students can also access unpublished evaluations
      // for which they made a request.
      if (user.roles.includes('student')) {
        filter.$and[0].$or.push({
          $and: [
            { publish: { $exists: false } },
            { requested: { $exists: true } },
            { user: user.id },
          ],
        })
      }

      if (args.assessment) {
        filter.$and.push({ assessment: args.assessment })
      }

      if (args.courseCode) {
        const course = await Course.exists({ code: args.courseCode })
        if (!course) {
          throw new UserInputError('COURSE_NOT_FOUND')
        }
        filter.$and.push({ course: course._id })
      }

      if (args.instance) {
        filter.$and.push({ instance: args.instance })
      }

      // if (args.learner) {
      //   const learner = await User.exists({ username: args.learner })
      //   if (!learner) {
      //     throw new UserInputError('LEARNER_NOT_FOUND')
      //   }
      //   filter.user = learner._id
      // }

      if (args.published) {
        filter.$and.push({ published: { $exists: args.published } })
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
    // Accept an evaluation request.
    async acceptEvaluationRequest(_parent, args, { models, user }, _info) {
      const { Evaluation } = models

      // Retrieve the evaluation request to accept.
      const evaluation = await Evaluation.findOne({ _id: args.id })
      if (!evaluation || !isRequestPending(evaluation)) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      // Retrieve the course associated to this evaluation.
      const course = await Evaluation.populate(evaluation, [
        {
          path: 'course',
          select: '_id coordinator teachers',
          model: 'Course',
        },
      ]).then((e) => e.course)
      if (!(isCoordinator(course, user) || isTeacher(course, user))) {
        throw new UserInputError('NOT_AUTHORISED')
      }

      // Accept the evaluation request.
      evaluation.accepted = new Date()
      evaluation.evaluator = user.id
      evaluation.requestedCompetencies = evaluation.competencies
      evaluation.competencies = undefined

      try {
        // Update the evaluation into the database.
        return await evaluation.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return evaluation
    },
    // Correct an evaluation request (for those from an assessment with an external provider).
    async correctEvaluation(_parent, args, { models, user }, _info) {
      const { Assessment, Evaluation } = models

      // Retrieve the evaluation to correct.
      const evaluation = await Evaluation.findOne({ _id: args.id })
      if (!evaluation) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      // Retrieve the course associated to this evaluation.
      const course = await Evaluation.populate(evaluation, [
        {
          path: 'course',
          select: 'coordinator teachers',
          model: 'Course',
        },
      ]).then((e) => e.course)
      if (!(isCoordinator(course, user) || isTeacher(course, user))) {
        throw new UserInputError('NOT_AUTHORISED')
      }

      // Retrieve the assessment associated to this evaluation.
      const assessment = await Evaluation.populate(evaluation, [
        {
          path: 'assessment',
          select: 'competencies provider providerConfig',
          model: 'Assessment',
        },
      ]).then((e) => e.assessment)
      if (
        !assessment ||
        !assessment.provider ||
        !isRequestPending(evaluation)
      ) {
        throw new UserInputError('EVALUATION_NOT_CORRECTABLE')
      }

      // Retrieve the competencies associated to the assessment.
      const competencies = await Assessment.populate(assessment, [
        {
          path: 'competencies.competency',
          select: 'code',
          model: 'Competency',
        },
      ]).then((e) => e.competencies)

      // Retrieve the instance associated to this evaluation.
      const instance = await Evaluation.populate(evaluation, {
        path: 'instance',
        select: 'data',
        model: 'AssessmentInstance',
      }).then((e) => e.instance)
      if (!instance) {
        throw new UserInputError('EVALUATION_NOT_CORRECTABLE')
      }

      // Correct the evaluation.
      switch (assessment.provider) {
        case 'tfq': {
          evaluation.competencies = []

          const { questions } = assessment.providerConfig
          const { answer: selected } = evaluation.data

          questions.forEach((q, i) => {
            const answer = instance.data.questions[i].select.map(
              (j) => q.pool[j].answer
            )
            const correct = selected[i]
              .map((v, j) => v === answer[j])
              .every((v) => v)

            if (correct) {
              evaluation.competencies.push({
                competency: competencies.find(
                  (c) => c.competency.code === q.competency
                ).competency._id,
                selected: true,
              })
            }
          })

          break
        }
      }
      evaluation.evaluator = user.id
      evaluation.published = new Date()

      try {
        await saveProgressHistory(evaluation, assessment, models)

        // Update the evaluation into the database.
        return await evaluation.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return evaluation
    },
    // Create a new evaluation from the specified assessment and learner.
    async createEvaluation(_parent, args, { models, user }, _info) {
      const { Assessment, AssessmentInstance, Competency, Evaluation, User } =
        models

      // Clean up the optional args.
      clean(args)

      // Retrieve the learner for which to create an evaluation.
      const learner = await User.exists({ username: args.learner })
      if (!learner) {
        throw new UserInputError('LEARNER_NOT_FOUND')
      }

      // Retrieve the assessment for which to create an evaluation.
      const assessment = await Assessment.findOne(
        { _id: args.assessment },
        'course instances'
      ).lean()
      if (!assessment) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      // Retrieve the number of existing instances for the same assessment.
      if (!args.instance) {
        const instancesNb = await AssessmentInstance.countDocuments({
          assessment: assessment._id,
          user: learner._id,
        })
        if (assessment.instances && assessment.instances === instancesNb) {
          throw new UserInputError('INSTANCE_CREATE')
        }
      }

      // Retrieve the assessment instance for which to create an evaluation
      // or create a new one.
      const instance = args.instance
        ? await AssessmentInstance.exists({
            _id: args.instance,
            assessment: assessment._id,
            user: learner._id,
          })
        : new AssessmentInstance({
            assessment: assessment._id,
            user: learner._id,
          })
      if (!instance) {
        throw new UserInputError('INSTANCE_NOT_FOUND')
      }

      // Save the evaluation into the database.
      try {
        if (!args.instance) {
          await instance.save()
        }

        // Create the evaluation Mongoose object.
        const evaluation = new Evaluation(args)
        evaluation.assessment = assessment._id
        evaluation.competencies = args.competencies
          ? await Promise.all(
              args.competencies.map(async (c) => ({
                ...c,
                competency: await Competency.exists({ code: c.competency }),
              }))
            )
          : undefined
        evaluation.course = assessment.course
        evaluation.evaluator = user.id
        evaluation.instance = instance._id
        evaluation.user = learner._id

        return await evaluation.save()
      } catch (err) {
        console.log(err)
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
      const { AssessmentInstance, Evaluation, ProgressHistory } = models

      // Retrieve the evaluation to delete.
      const evaluation = await Evaluation.findOne(
        { _id: args.id },
        '_id evaluator instance published'
      ).lean()
      if (!evaluation || !isEvaluator(evaluation, user)) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      // Retrieve the total number of evaluations
      // associated to the same instance.
      const evaluationsNb = await Evaluation.countDocuments({
        instance: evaluation.instance,
      })

      // Delete the evaluation.
      try {
        // If the evaluation is already published,
        // must delete all the progress history elements as well.
        if (evaluation.published) {
          await ProgressHistory.deleteMany({
            evaluation: evaluation._id,
          })
        }

        // If there is only one evaluation for this instance,
        // must delete the instance.
        if (evaluationsNb === 1) {
          await AssessmentInstance.deleteOne({ _id: evaluation.instance })
        }

        await Evaluation.deleteOne({ _id: args.id })
        return true
      } catch (err) {
        Bugsnag.notify(err)
      }

      return false
    },
    // Delete an existing evaluation request.
    async deleteEvaluationRequest(_parent, args, { models, user }, _info) {
      const { AssessmentInstance, Evaluation } = models

      // Retrieve the evaluation to delete.
      const evaluation = await Evaluation.findOne(
        { _id: args.id },
        'instance requested published user'
      ).lean()
      if (
        !evaluation ||
        evaluation.user.toString() !== user.id ||
        status(evaluation) !== 'requested'
      ) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      // Retrieve the total number of evaluations
      // associated to the same instance.
      const evaluationsNb = await Evaluation.countDocuments({
        instance: evaluation.instance,
      })

      try {
        // If there is only one evaluation associated
        // to the instance, delete it.
        if (evaluationsNb === 1) {
          await AssessmentInstance.deleteOne({ _id: evaluation.instance })
        }

        // Delete the evaluation.
        await Evaluation.deleteOne({ _id: args.id })
        return true
      } catch (err) {
        Bugsnag.notify(err)
      }

      return false
    },
    // Edit an existing evaluation from the specified parameters.
    async editEvaluation(_parent, args, { models, user }, _info) {
      const { Competency, Evaluation } = models

      // Retrieve the evaluation to edit.
      const evaluation = await Evaluation.findOne({ _id: args.id })
      if (!evaluation) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }
      if (
        !isEvaluator(evaluation, user) ||
        evaluation.published ||
        evaluation.rejected ||
        (evaluation.requested && !evaluation.accepted)
      ) {
        throw new UserInputError('EVALUATION_NOT_EDITABLE')
      }

      // Clean up the optional args.
      clean(args)

      // Remove 'evalDate' if the same as 'accepted', when present.
      if (
        evaluation.accepted &&
        DateTime.fromJSDate(evaluation.accepted).equals(
          DateTime.fromISO(args.evalDate)
        )
      ) {
        delete args.evalDate
      }

      // When editing an accepted evaluation,
      // the evaluation date should be changed to the current date.
      if (evaluation.accepted && !args.evalDate) {
        args.evalDate = Date.now()
      }

      // Edit the evaluation mongoose object.
      for (const field of ['comment', 'evalDate', 'note']) {
        evaluation[field] = args[field]
      }
      evaluation.competencies = args.competencies
        ? await Promise.all(
            args.competencies.map(async (c) => ({
              ...c,
              competency: await Competency.exists({ code: c.competency }),
            }))
          )
        : undefined

      // Save the assessment into the database.
      try {
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
    // Publish an evaluation that is not yet published
    // and save the associated possible progress history.
    async publishEvaluation(_parent, args, { models, user }, _info) {
      const { Evaluation } = models

      const evaluation = await Evaluation.findOne({ _id: args.id }).populate({
        path: 'course',
        select: 'coordinator',
        model: 'Course',
      })
      if (!evaluation) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      // Can only publish an evaluation that is not published yet
      // and only its evaluator or the associated course coordinator can publish it.
      if (
        evaluation.published ||
        !(
          isEvaluator(evaluation, user) ||
          isCoordinator(evaluation.course, user)
        )
      ) {
        throw new UserInputError('NOT_AUTHORISED')
      }

      // Retrieve all the published evaluations that are
      // related to same assessment instance.
      const evaluations = await Evaluation.find(
        {
          instance: evaluation.instance,
          published: { $exists: true },
        },
        'competencies date evalDate published'
      )
        .lean()
        .then((result) =>
          result
            .map((e) => ({
              ...e,
              evalDate: e.evalDate ?? e.date,
            }))
            .sort((a, b) => (a.evalDate > b.evalDate ? 1 : -1))
        )
      if (!evaluations) {
        throw new UserInputError('EVALUATION_PUBLISH')
      }

      // Check the constraints related to the assessment.
      const assessment = await Evaluation.populate(evaluation, {
        path: 'assessment',
        selected: 'competencies incremental phases takes',
        model: 'Assessment',
      }).then((e) => e.assessment)

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
      const phases = assessment.phases ?? [assessment]
      phases[evaluation.phase ?? 0].competencies.forEach((c) => {
        competencies[c.competency.toString()] = {
          acquiredLearningOutcomes: c.learningOutcomes?.map((_) => false),
          stars: c.stars,
          learningOutcomes: c.learningOutcomes,
          selected: false,
        }
      })
      evaluations
        .filter((e) => !!e.competencies)
        .forEach((e) => {
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

      // Check the constraints related to the acquired competencies
      // and create the progress history.
      if (evaluation.competencies) {
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

        await saveProgressHistory(evaluation, assessment, models)
      }

      // Publish the evaluation.
      evaluation.published = new Date()

      try {
        // Save the evaluation into the database.
        return await evaluation.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
    // Reject an evaluation request.
    async rejectEvaluationRequest(_parent, args, { models, user }, _info) {
      const { Evaluation } = models

      // Retrieve the evaluation request to reject.
      const evaluation = await Evaluation.findOne({ _id: args.id })
      if (!evaluation || !isRequestPending(evaluation)) {
        throw new UserInputError('EVALUATION_NOT_FOUND')
      }

      // Retrieve the course associated to this evaluation.
      const course = await Evaluation.populate(evaluation, [
        {
          path: 'course',
          select: '_id coordinator teachers',
          model: 'Course',
        },
      ]).then((e) => e.course)
      if (!(isCoordinator(course, user) || isTeacher(course, user))) {
        throw new UserInputError('NOT_AUTHORISED')
      }

      // Reject the evaluation request.
      evaluation.rejected = new Date()
      evaluation.evaluator = user.id
      evaluation.rejectionReason = args.reason

      try {
        // Update the evaluation into the database.
        return await evaluation.save()
      } catch (err) {
        Bugsnag.notify(err)
      }

      return evaluation
    },
    // Request a new evaluation for the specified assessment.
    async requestEvaluation(_parent, args, { models, user }, _info) {
      const {
        Assessment,
        AssessmentInstance,
        Competency,
        Evaluation,
        Registration,
      } = models

      // Clean up the optional args.
      clean(args)

      // Retrieve the assessment for which to request an evaluation.
      const assessment = await Assessment.findOne(
        { _id: args.assessment },
        '_id evaluationRequest course end start'
      ).lean()
      if (!assessment) {
        throw new UserInputError('ASSESSMENT_NOT_FOUND')
      }

      const now = DateTime.now()
      if (!assessment.evaluationRequest || !canTake(assessment, now)) {
        throw new UserInputError('CANNOT_REQUEST_EVALUATION')
      }

      // Only possible if the connected user is registered
      // to the course associated to the assessment.
      const isRegistered = await Registration.exists({
        course: assessment.course,
        invitation: { $exists: false },
        user: user.id,
      })
      if (!isRegistered) {
        throw new AuthenticationError('NOT_AUTHORISED')
      }

      // Retrieve the assessment instance for which to create an evaluation
      // or create a new one.
      let instance = null
      if (args.instance) {
        instance = await AssessmentInstance.findOne(
          { _id: args.instance, assessment: assessment._id, user: user.id },
          '_id assessment'
        )
        if (!instance) {
          throw new UserInputError('ASSESSMENT_INSTANCE_NOT_FOUND')
        }
      } else {
        instance = new AssessmentInstance({
          assessment: assessment._id,
          user: user.id,
        })
      }

      // Save the evaluation into the database.
      try {
        await instance.save()

        // Create the evaluation Mongoose object.
        const evaluation = new Evaluation(args)
        evaluation.assessment = assessment._id
        evaluation.competencies = args.competencies
          ? await Promise.all(
              args.competencies.map(async (c) => ({
                ...c,
                competency: await Competency.exists({ code: c.competency }),
              }))
            )
          : undefined
        evaluation.course = assessment.course._id
        evaluation.instance = instance._id
        evaluation.requested = new Date()
        evaluation.user = user.id

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
  },
}

export default resolvers
