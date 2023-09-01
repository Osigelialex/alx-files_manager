import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const AppController = {
  getStatus: async (req, res) => {
    const redisIsAlive = await redisClient.isAlive();
    const databaseIsAlive = await dbClient.isAlive();
    res.status(200).json({ redis: redisIsAlive, db: databaseIsAlive });
  },

  getStats: async (req, res) => {
    const nbUsers = await dbClient.nbUsers();
    const nbFiles = await dbClient.nbFiles();
    res.status(200).json({ users: nbUsers, files: nbFiles });
  },
};

export default AppController;
