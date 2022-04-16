import mongoose from 'mongoose';

// Connect to the MongoDB database.
export function connectDB(databaseUrl) {
  mongoose.connect(databaseUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  const db = mongoose.connection;
  db.on('open', () => {
    console.log(`Connected to MongoDB at ${databaseUrl}.`);
  });
  
  db.on('error', () => {
    console.error('Failed to connect to MongoDB.');
  });
}
