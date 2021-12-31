/*
const mongoose = require('mongoose');

const { CourseSchema } = require('./models/course-model.js');

mongoose.connect(environment[env].dbString, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

*/

const { ApolloServer, gql, UserInputError } = require('apollo-server');
const jwt = require('jsonwebtoken');

const typeDefs = gql`
  type Course {
    code: String!,
    name: String!,
    banner: String,
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
    name: String!
  }

  type SignInResponse {
    token: String!
  }

  type Query {
    courses(limit: Int): [Course!]!,
    course(code: String!): Course,
    partners(limit: Int): [Partner!]!,
    partner(code: String!): Partner,
    programs(limit: Int): [Program!]!,
    program(code: String!): Program
  }

  type Mutation {
    signIn(email: String!, password: String!): SignInResponse!
  }
`;

const courses = [{
  code: 'SE410µ',
  name: 'Gestion sécurisée des entrées des systèmes logiciels',
  banner: 'https://www.tlca.eu/modules/courses/client/img/banner/uploads/5fc3b83e6c4fb97907544e98.jpg',
  type: 'training'
}, {
  code: 'TC101µ',
  name: 'Introduction à la transmission d\'information numérique',
  banner: 'https://www.tlca.eu/modules/courses/client/img/banner/uploads/5f6dd694d506d64f39d5895e.jpg',
  type: 'ucourse'
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
  abbreviation: 'CSITEd'
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
    courses(_parent, args, _context, _info) {
      return courses.slice(0, args.limit ?? courses.length);
    },
    course(_parent, args, _context, _info) {
      return courses.find(c => c.code === args.code);
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
    signIn(_parent, args, _context, _info) {
      const { email, password } = args;
      console.log('Login:', email, password);

      if (email === 'seb' && password === '123') {
        return {
          token: jwt.sign({ id: 'CouCou' }, 'SECRET_STORY')
        };
      }

      throw new UserInputError('Invalid credentials');
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
