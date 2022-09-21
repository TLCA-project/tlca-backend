import Bugsnag from '@bugsnag/js'
import { AuthenticationError, UserInputError } from 'apollo-server'
import jwt from 'jsonwebtoken'
import { DateTime } from 'luxon'

import { cleanString } from '../lib/utils.js'

// Clean up the optional args related to a user.
function clean(args) {
  cleanString(args, 'firstName', 'lastName')
}

// Handle errors resulting from the creation or edit of a program.
function handleError(err) {
  const formErrors = {}

  switch (err.name) {
    case 'MongoServerError':
      switch (err.code) {
        case 11000:
          throw new UserInputError('EXISTING_USERNAME', {
            formErrors: {
              code: 'The specified username already exists',
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

// Create the access and the refresh tokens.
function getTokens(user, env) {
  const userinfo = { id: user._id, roles: user.roles }

  const token = jwt.sign(userinfo, env.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
  })
  const refreshToken = jwt.sign(userinfo, env.JWT_REFRESH_TOKEN_SECRET, {
    expiresIn: '14d',
  })

  user.refreshToken = refreshToken
  user.refreshTokenExpires = DateTime.now().plus({ days: 14 }).toJSDate()

  return {
    token,
    refreshToken,
  }
}

// Send a confirmation email to a user.
async function sendConfirmationEmail(smtpTransport, user) {
  const confirmationURL = `https://www.tlca.eu/profiles/${user.username}/${user.emailConfirmationToken}`

  await smtpTransport.sendMail({
    to: user.email,
    from: 'sebastien@combefis.be',
    subject: '[TLCA] Email address confirmation',
    html:
      '<p>Hello,</p>' +
      '<p>Thank you for creating an account on the TLCA platform.</p>' +
      `<p>In order to be able to connect on the platform, you first need to confirm your email address. You can do so by visiting the following page:</p><p><a href="${confirmationURL}">${confirmationURL}</a></p>` +
      '<p>The TLCA team</p>',
  })
}

const resolvers = {
  User: {
    displayName(user, _args, _context, _info) {
      if (!(user.firstName && user.lastName)) {
        return user.username
      }
      return `${user.firstName} ${user.lastName}`
    },
    // Retrieve the 'id' of this user.
    id(user, _args, _context, _info) {
      return user._id
    },
    // Retrieve whether this user is confirmed or not
    // (meaning that his/her email address is valid).
    isConfirmed(user, _args, _context, _info) {
      return !user.emailConfirmationToken
    },
  },
  Query: {
    async colleagues(_parent, _args, { models }, _info) {
      const { User } = models

      return await User.find({ roles: 'teacher' })
    },
    async me(_parent, _args, { models, user }, _info) {
      const { User } = models

      // Retrieve the logged in user, if any.
      const loggedUser = await User.findOne(
        { _id: user?.id },
        'firstName lastName roles username'
      ).lean()
      if (!user) {
        throw new AuthenticationError('Not authorized')
      }

      // Return all the selected field except '_id'
      return (({ _id, ...rest }) => rest)(loggedUser)
    },
    // Retrieve one given user given its 'username'.
    async user(_parent, args, { models, user: loggedUser }, _info) {
      const { User } = models

      const user = await User.findOne({ username: args.username }).lean()
      if (!user || user._id.toString() !== loggedUser.id) {
        throw new UserInputError('USER_NOT_FOUND')
      }

      return user
    },
    async users(_parent, args, { models }, _info) {
      const { User } = models

      // Set up offset and limit.
      const skip = Math.max(0, args.offset ?? 0)
      const limit = args.limit ?? undefined

      // Retrieve all the users satisfying the conditions defined hereabove.
      return await User.find({}, null, { skip, limit }).lean()
    },
  },
  Mutation: {
    // Confirm this user, that is validate his/her email address.
    async confirmAccount(_parent, args, { models }, _info) {
      const { User } = models

      // Retrieve the user to confirm.
      const user = await User.findOne(
        { username: args.username },
        'emailConfirmationToken emailConfirmationTokenExpires'
      )
      if (
        !user ||
        user.emailConfirmationToken !== args.emailConfirmationToken ||
        DateTime.now() > DateTime.fromISO(user.emailConfirmationTokenExpires)
      ) {
        throw new UserInputError('INVALID_CONFIRMATION_TOKEN')
      }
      if (!user.emailConfirmationToken) {
        throw new UserInputError('ALREADY_CONFIRMED')
      }

      // Confirm the user.
      user.emailConfirmationToken = undefined
      user.emailConfirmationTokenExpires = undefined
      user.emailConfirmed = new Date()

      // Save the user into the database.
      try {
        await user.save()
        return true
      } catch (err) {
        Bugsnag.notify(err)
      }

      return false
    },
    // Confirm this user, that is validate his/her email address.
    async editUser(_parent, args, { models, user: loggedUser }, _info) {
      const { User } = models

      // Retrieve the user to return.
      const user = await User.findOne({ username: args.username })
      if (!user || user._id.toString() !== loggedUser.id) {
        throw new UserInputError('USER_NOT_FOUND')
      }

      // Clean up the optional args.
      clean(args)

      // Edit the user mongoose object.
      for (const field of ['firstName', 'lastName']) {
        user[field] = args[field]
      }

      // Save the user into the database.
      try {
        return await user.save()
      } catch (err) {
        handleError(err)
      }

      return false
    },
    async refreshToken(_parent, args, { env, models }, _info) {
      const { User } = models

      // Check the refresh token validity.
      const decoded = jwt.verify(args.token, env.JWT_REFRESH_TOKEN_SECRET)
      if (!decoded) {
        throw new UserInputError('INVALID_REFRESH_TOKEN')
      }

      // Find a user with the given refresh token.
      const user = await User.findOne(
        { _id: decoded.id },
        '_id refreshToken refreshTokenExpires roles'
      )
      if (
        !user ||
        user.refreshToken !== args.token ||
        DateTime.now() > DateTime.fromISO(user.refreshTokenExpires)
      ) {
        throw new UserInputError('INVALID_REFRESH_TOKEN')
      }

      // Create the access and the refresh tokens.
      const { refreshToken, token } = getTokens(user, env)

      // Save the refresh token into the database.
      try {
        await user.save()
        return {
          refreshToken,
          token,
        }
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
    // Resend a confirmation email to this user.
    async resendConfirmationEmail(
      _parent,
      args,
      { models, smtpTransport },
      _info
    ) {
      const { User } = models

      // Retrieve the user to confirm.
      const user = await User.findOne(
        { username: args.username },
        'email emailConfirmationToken emailConfirmationTokenExpires username'
      )
      if (!user) {
        throw new UserInputError('USER_NOT_FOUND')
      }
      if (!user.emailConfirmationToken) {
        throw new UserInputError('ALREADY_CONFIRMED')
      }

      // Generate a new confirmation token.
      user.updateEmail(user.email)

      // Send a confirmation email to the new user.
      await sendConfirmationEmail(smtpTransport, user)

      // Save the user into the database.
      try {
        await user.save()
        return true
      } catch (err) {
        Bugsnag.notify(err)
      }

      return false
    },
    async signIn(_parent, args, { env, models }, _info) {
      const { User } = models

      // Find a user who has either the specified email address
      // or the specified username.
      const user = await User.findOne(
        {
          $or: [
            { email: args.usernameOrEmail },
            { username: args.usernameOrEmail },
          ],
        },
        '_id emailConfirmed password roles salt'
      )
      if (!user?.authenticate(args.password)) {
        throw new UserInputError('INVALID_CREDENTIALS')
      }
      if (!user.emailConfirmed) {
        throw new UserInputError('UNCONFIRMED_EMAIL_ADDRESS')
      }

      // Create the access and the refresh tokens.
      const { refreshToken, token } = getTokens(user, env)

      // Save the refresh token into the database.
      try {
        await user.save()
        return {
          refreshToken,
          token,
        }
      } catch (err) {
        Bugsnag.notify(err)
      }

      return null
    },
    async signOut(_parent, _args, { models, user }, _info) {
      const { User } = models

      // Find the connected user.
      const loggedUser = await User.findOne(
        { _id: user.id },
        '_id refreshToken refreshTokenExpires'
      )

      // Remove his/her refresh token.
      loggedUser.refreshToken = undefined
      loggedUser.refreshTokenExpires = undefined

      // Save the refresh token into the database.
      try {
        await loggedUser.save()
        return true
      } catch (err) {
        Bugsnag.notify(err)
      }

      return false
    },
    async signUp(_parent, args, { models, smtpTransport }, _info) {
      const { Registration, User } = models

      // Create the user Mongoose object.
      const user = new User(args)
      user.provider = 'local'

      user.updateEmail(args.email)

      // Save the user into the database.
      try {
        await user.save()

        // Send a confirmation email to the new user.
        await sendConfirmationEmail(smtpTransport, user)

        // Update any invitation that have been sent to this user.
        const registrations = await Registration.find({ email: args.email })
        await Promise.all(
          registrations.map(async (registration) => {
            registration.email = undefined
            registration.user = user._id

            await registration.save()
          })
        )

        return true
      } catch (err) {
        switch (err.name) {
          case 'MongoServerError': {
            switch (err.code) {
              case 11000: {
                throw new UserInputError('EXISTING_EMAIL_ADDRESS')
              }
            }
            break
          }

          case 'ValidationError': {
            if (err.errors.email) {
              throw new UserInputError('INVALID_EMAIL_ADDRESS')
            }
            if (err.errors.password) {
              throw new UserInputError('INVALID_PASSWORD')
            }
            break
          }
        }

        Bugsnag.notify(err)
      }

      return false
    },
  },
}

export default resolvers
