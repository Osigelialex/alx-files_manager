import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const UsersController = {
  postNew: async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }
    // check if email already exists
    if ((await dbClient.userCollection.countDocuments({ email })) > 0) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const doc = {
      email,
      password: sha1(password),
    };
    const result = await dbClient.userCollection.insertOne(doc);
    return res.status(201).json({ id: result.insertedId, email });
  },

  getMe: async (req, res) => {
    const token = req.headers['x-token'];

    // check if token exists
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // construct key from token
    const key = `auth_${token}`;
    // retrieve user id from redis with token
    const userId = await redisClient.get(key);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // search mongo for user with object id
    const user = await dbClient.userCollection.findOne({ _id: new ObjectId(userId) });
    res.json({ id: userId, email: user.email });
  },
};

export default UsersController;
