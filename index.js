import { ApolloServer } from 'apollo-server';
import typeDefs from './data/schema.js';
import resolvers from './data/resolvers.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv'

dotenv.config()

// Configure the access to the MongoDB database.
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', () => {
  console.error('Error while connecting to DB');
});

// Configure functions for the GraphQL authentication.
const getUser = function(_token) {
  return { loggedIn: true };
};

// Create and configure the Apollo server.
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization || '';
    const user = getUser(token);
    return { user };
  }
});

// Launch the apollo server.
server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
