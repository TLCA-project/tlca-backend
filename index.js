import mongoose from 'mongoose';

import {} from './models/competency-model.js';
import Course from './models/course-model.js';
import {} from './models/partner-model.js';
import User from './models/user-model.js';

mongoose.connect('mongodb://localhost:27017/tlca-dev', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', () => {
  console.error('Error while connecting to DB');
});

import { ApolloServer, gql, UserInputError } from 'apollo-server';
import jwt from 'jsonwebtoken';

const typeDefs = gql`
  scalar Date

  type Competency {
    code: String!,
    name: String!,
    description: String
  }

  type Schedule {
    registrationsStart: Date,
    registrationsEnd: Date,
    start: Date,
    end: Date,
    evaluationsEnd: Date
  }

  type CourseCompetency {
    competency: Competency!,
    category: String!,
    subcategory: String
  }

  type Course {
    banner: String,
    code: String!,
    colophon: String,
    competencies: [CourseCompetency!]!,
    description: String!,
    field: String,
    language: String,
    name: String!,
    schedule: Schedule,
    type: String!
  }

  type Program {
    code: String!,
    name: String!
  }

  type Partner {
    abbreviation: String,
    banner: String,
    code: String!,
    description: String,
    name: String!,
    website: String,
    courses: [Course!]
  }

  type SignInResponse {
    token: String!
  }

  type User {
    displayName: String!
  }

  type Query {
    courses(offset: Int, limit: Int): [Course!]!,
    course(code: String!): Course,
    me: User,
    partners(limit: Int): [Partner!]!,
    partner(code: String!): Partner,
    programs(limit: Int): [Program!]!,
    program(code: String!): Program
  }

  type Mutation {
    signIn(email: String!, password: String!): SignInResponse!,
    signOut: Boolean,
    signUp(firstName: String!, lastName: String!, email: String!, password: String!): Boolean
  }
`;

const competencies = [{
  code: 'TC301',
  name: 'Comprendre ce qu\'est un signal numérique',
  description: '<p>Importante celle-là <b>!!!!</b></p>'
}, {
  code: 'TC310',
  name: 'Comprendre le principe de la numérisation d\'un signal analogique'
}, {
  code: 'TC101',
  name: 'Décrire un système comportant des transmissions d\'information'
}, {
  code: 'TC190',
  name: 'Comparer un signal analogique et un numérique'
}];

const courses = [{
  code: 'SE410µ',
  name: 'Gestion sécurisée des entrées des systèmes logiciels',
  banner: 'https://www.tlca.eu/modules/courses/client/img/banner/uploads/5fc3b83e6c4fb97907544e98.jpg',
  type: 'training'
}, {
  code: 'TC101µ',
  name: 'Introduction à la transmission d\'information numérique',
  banner: 'https://www.tlca.eu/modules/courses/client/img/banner/uploads/5f6dd694d506d64f39d5895e.jpg',
  type: 'ucourse',
  colophon: '<p>Photo de couverture du cours par Alex Proimos sur <a href="https://www.flickr.com/photos/proimos/7147399007">Flickr</a> (6 mai 2012).</p>',
  competencies: [{
    competency: competencies[0],
    category: 'basic',
    subcategory: 'Signal analogique et numérique'
  }, {
    competency: competencies[1],
    category: 'basic'
  }, {
    competency: competencies[2],
    category: 'advanced',
    subcategory: 'Système de transmission'
  }, {
    competency: competencies[3],
    category: 'advanced',
    subcategory: 'Signal analogique et numérique'
  }],
  description: '<p>Ce cours propose une introduction à la transmission d\'information numérique. Il présente les <b>caractéristiques</b> des signaux numériques, par rapport à celles des signaux analogiques. Il détaille également la <b>chaine de transmission</b> d\'information, de l\'envoi depuis la source à la réception au destinataire. Enfin, il introduit au processus de <b>numérisation</b> d\'un signal analogique.</p>',
  schedule: {
    registrationsStart: Date.parse("2021-09-01T22:00:00.000Z"),
    registrationsEnd: Date.parse("2021-09-15T22:00:00.000Z"),
    start: Date.parse("2021-10-01T22:00:00.000Z"),
    end: Date.parse("2021-10-31T23:00:00.000Z"),
    evaluationsEnd: Date.parse("2022-06-30T23:00:00.000Z")
  },
  field: 'Télécommunication',
  language: 'Français'
}, {
  code: 'SE401µ',
  name: 'Introduction à la sécurité logicielle',
  banner: 'https://www.tlca.eu/modules/courses/client/img/banner/uploads/5fc3a7c36c4fb97907544e93.jpg',
  type: 'ucourse'
}, {
  code: 'BU301µ',
  name: 'Édition et présentation assistée par ordinateur',
  banner: 'https://www.tlca.eu/modules/courses/client/img/banner/uploads/61aa608c77444d6f8d8aed7f.jpg',
  type: 'ucourse'
}, {
  code: 'CR201µ',
  name: 'Algorithmes de chiffrement',
  banner: 'https://www.tlca.eu/modules/courses/client/img/banner/uploads/614eba8270f3d76b30e58594.jpg',
  type: 'ucourse'
}, {
  code: 'TC102µ',
  name: 'Introduction à la transmission numérique en bande de base',
  banner: 'https://www.tlca.eu/modules/courses/client/img/banner/uploads/5fb7ca4f4f9f870b28860beb.jpg',
  type: 'ucourse'
}];

const programs = [];

const partners = [{
  code: 'csited',
  name: 'Computer Science and IT in Education',
  banner: 'https://www.tlca.eu/modules/partners/client/img/banner/uploads/5fa2ec6077882b1ab9fb3518.png',
  abbreviation: 'CSITEd',
  website: 'https://www.csited.be',
  description: '<p>La Computer Science and IT in Education (CSITEd) est une ASBL dont le but est de promouvoir l\'informatique au sens large, tant au niveau de la technologie qu\'en tant que science. Elle destine ses activités principalement aux élèves du primaire et du secondaire, dans le cadre de leur éducation, mais concerne également les enseignants, enseignantes et le grand public.</p>',
  courses: [courses[0], courses[1], courses[2]]
}, {
  code: 'ephec-eps',
  name: 'EPHEC Promotion Sociale',
  banner: 'https://www.tlca.eu/modules/partners/client/img/banner/uploads/5f677c4876a6ad6859e387e6.jpg',
  abbreviation: 'EPHEC'
}, {
  code: 'uclouvain',
  name: 'Université catholique de Louvain',
  abbreviation: 'UCLouvain'
}, {
  code: 'condorcet',
  name: 'Haute École provinciale de Hainaut Condorcet',
}];

const resolvers = {
  Query: {
    async courses(_parent, args, _context, _info) {
      const courses = await Course.find();

      const start = args.offset ?? 0;
      const end = start + (args.limit ?? courses.length);
      return courses.slice(start, end);
    },
    async course(_parent, args, _context, _info) {
      const course = await Course.findOne({ code: args.code });

      return course;
    },
    me(_parent, _args, _context, _info) {
      return { displayName: 'Sébastien' };
    },
    programs(_parent, args, _context, _info) {
      return programs.slice(0, args.limit ?? programs.length);
    },
    program(_parent, args, _context, _info) {
      return programs.find(p => p.code === args.code);
    },
    partners(_parent, args, _context, _info) {
      return partners.slice(0, args.limit ?? partners.length);
    },
    partner(_parent, args, _context, _info) {
      return partners.find(p => p.code === args.code);
    }
  },
  Mutation: {
    async signIn(_parent, args, _context, _info) {
      if (!args.email || !args.password) {
        throw new UserInputError('MISSING_FIELDS');
      }

      const user = await User.findOne({ email: args.email });
      if (user && user.authenticate(args.password)) {
        return {
          token: jwt.sign({ id: 'CouCou' }, 'SECRET_STORY')
        };
      }

      throw new UserInputError('INVALID_CREDENTIALS');
    },
    signOut(_parent, _args, _context, _info) {
      return true;
    },
    async signUp(_parent, args, _context, _info) {
      if (!args.firstName || !args.lastName || !args.email || !args.password) {
        throw new UserInputError('MISSING_FIELDS');
      }

      const user = new User(args);
      user.provider = 'local';
      user.displayName = user.firstName + ' ' + user.lastName;

      try {
        await user.save();
        return true;
      } catch (err) {
        switch (err.name) {
          case 'MongoServerError': {
            switch (err.code) {
              case 11000: {
                throw new UserInputError('EXISTING_EMAIL_ADDRESS');
              }
            }
          }

          case 'ValidationError': {
            if (err.errors.email) {
              throw new UserInputError('INVALID_EMAIL_ADDRESS');
            }
          }
        }
        return false;
      }
    }
  }
};

const getUser = function(_token) {
  return { loggedIn: true };
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization || '';
    const user = getUser(token);
    return { user };
  }
});

server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
