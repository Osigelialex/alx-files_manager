import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile } from 'fs';
import { promisify } from 'util';
import { join } from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);

const FilesController = {
  postUpload: async (req, res) => {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // extract data from request
    const { name } = req.body;
    const { type } = req.body;
    const parentId = req.body.parentId || 0;
    const isPublic = req.body.isPublic || false;
    let data = null;

    if (type === 'file' || type === 'image') {
      data = req.body.data;
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
      const file = await dbClient.fileCollection.findOne({ _id: new ObjectId(parentId) });
      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const document = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic,
      parentId,
    };

    if (type !== 'folder') {
      await mkdirAsync(FOLDER_PATH, { recursive: true })
        .catch((err) => console.error(err));

      const path = join(FOLDER_PATH, uuidv4());

      await writeFileAsync(path, Buffer.from(data, 'base64'))
        .catch((err) => console.error(err));

      document.localPath = path;
    }
    const insertedFIle = await dbClient.fileCollection.insertOne(document);
    return res.status(201).json(
      {
        id: insertedFIle.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId,
      },
    );
  },

  getShow: async (req, res) => {
    const authToken = req.headers['x-token'];

    if (!authToken) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${authToken}`);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    const query = {
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    };

    const file = await dbClient.fileCollection.findOne(query);

    if (!file) return res.status(404).json({ error: 'Not found' });

    return res.json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
    }).status(200);
  },

  getIndex: async (req, res) => {
    const authToken = req.headers['x-token'];

    if (!authToken) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${authToken}`);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;
    const pageSkip = page * pageSize;

    let matchQuery;

    // if parent id is specified get all user files with parent id
    // otherwise get all user files
    if (!parentId) {
      matchQuery = { userId: new ObjectId(userId) };
    } else {
      matchQuery = { userId: new ObjectId(userId), parentId };
    }

    const pipeLine = [
      { $match: matchQuery },
      { $limit: pageSize },
      { $skip: pageSkip },
      {
        $project: {
          _id: 0,
          id: '$_id',
          userId: '$userId',
          name: '$name',
          type: '$type',
          isPublic: '$isPublic',
          parentId: '$parentId',
        },
      },
    ];

    const result = await dbClient.fileCollection.aggregate(pipeLine).toArray();
    return res.json(result);
  },
};

export default FilesController;