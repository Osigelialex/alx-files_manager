import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const AuthController = {
  getConnect: async (req, res) => {
    // get Basic Auth details from user
    const authorizationHeader = req.headers.authorization;

    // check if authentication header does not exist
    if (!authorizationHeader) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // variables to store auth info
    let email; let password; let
      encodedPassword;

    // extracting username and email from base64 header
    try {
      const base64String = authorizationHeader.split(' ')[1];
      const userDetails = Buffer.from(base64String, 'base64').toString();

      // check for semicolon separator
      const semiColonIndex = userDetails.indexOf(':');
      if (semiColonIndex === -1) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      email = userDetails.slice(0, semiColonIndex);
      password = userDetails.slice(semiColonIndex + 1);
      encodedPassword = sha1(password);
    } catch (err) {
      res.status(401).json({ error: 'Unauthorized' });
    }
    // find user associated with username and Password
    const user = await dbClient.userCollection.findOne({ email });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (user.password !== encodedPassword) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // generate token for user
    const token = uuidv4();
    const duration = 3600 * 24;
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), duration);
    res.status(200).json({ token });
  },

  getDisconnect: async (req, res) => {
    const token = req.headers['x-token'];

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // construct key from token
    const key = `auth_${token}`;

    // retrieve user based on token
    const userId = await redisClient.get(key);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    redisClient.del(key);
    res.status(204).send();
  },
};

export default AuthController;
