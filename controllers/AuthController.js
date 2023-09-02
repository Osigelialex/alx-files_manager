import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const AuthController = {
  getConnect: async (req, res) => {
    // get Basic Auth details from user
    const authorizationHeader = req.headers.authorization;

    // extracting username and email from base64 header
    const base64String = authorizationHeader.split(' ')[1];
    const userDetails = Buffer.from(base64String, 'base64').toString();
    const components = userDetails.split(':');
    const email = components[0];
    const password = components[1];
    const encodedPassword = sha1(password);

    // find user associated with username and Password
    const user = await dbClient.userCollection.findOne({ email });

    if (user.password !== encodedPassword) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // generate token for user
    const token = uuidv4();
    const duration = 3600 * 24;
    await redisClient.set(token, user._id.toString(), duration);
    res.status(200).json({ token });
  },

  getDisconnect: async (req, res) => {
    const token = req.headers['x-token'];

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // retrieve user based on token
    const userId = await redisClient.get(token);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    redisClient.del(token);
    res.status(201).send();
  },
};

export default AuthController;
