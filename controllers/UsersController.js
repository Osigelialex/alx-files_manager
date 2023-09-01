import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';
import sha1 from 'sha1';

const UsersController = {
  postNew: async (req, res) => {

   const email = req.body.email;
   if (!email) {
    return res.status(400).send({'error': 'Missing email'});
   }
   const password = req.body.password;
   if (!password) {
    return res.status(400).json({'error': 'Missing password'});
   }
   // check if email already exists
   if ((await dbClient.userCollection.countDocuments({email: email})) > 0) {
      res.status(400).json({'error': 'Already exist'});
      return;
   }

   const doc = {
    email: email,
    password: sha1(password)
   };
   const result = await dbClient.userCollection.insertOne(doc);
   res.status(201).json({ id: result.insertedId, email });
   return;
  }
}

export default UsersController;
