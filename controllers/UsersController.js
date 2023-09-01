import sha1 from 'sha1';
import dbClient from '../utils/db';

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
};

export default UsersController;
