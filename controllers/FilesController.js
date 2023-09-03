import redisClient from "../utils/redis";
import dbClient from "../utils/db";

const FilesController = {
  postUpload: async (req, res) => {
    const token = req.headers['X-TOKEN'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(token);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // extract data from request
    const name = req.body['name'];
    const type = req.body['type'];
    const parentId = req.body['parentId'] || 0;
    const isPublic = req.body['isPublic'] || false;
    
    if (type === 'file' || type === 'image') {
      const data = req.body['data'];
    }
    const acceptedTypes = ['folder', 'file', 'image'];
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }
    
    if (parentId !== 0) {
      file = dbClient.fileCollection.find({ parentId });
      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const document = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

  },
};

export default FilesController;