import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile, readFile } from 'fs';
import { promisify } from 'util';
import { join } from 'path';
import { contentType } from 'mime-types';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const mkdirAsync = promisify(mkdir);
export const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);

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

    // create Bull queue.
    const fileQueue = new Queue('fileQueue');

    if (type !== 'folder') {
      await mkdirAsync(FOLDER_PATH, { recursive: true })
        .catch((err) => console.error(err));

      const path = join(FOLDER_PATH, uuidv4());

      await writeFileAsync(path, Buffer.from(data, 'base64'))
        .catch((err) => console.error(err));

      document.localPath = path;
    }
    const insertedFIle = await dbClient.fileCollection.insertOne(document);

    // add a job to queue
    const job = await fileQueue.add({
      userId,
      fileId: insertedFIle.insertedId.toString(),
    });
    // console.log(job.data);
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
      parentId: file.parentId,
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

  putPublish: async (req, res) => {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const query = {
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    };

    const file = await dbClient.fileCollection.findOne(query);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.fileCollection.updateOne({ _id: new ObjectId(id) },
      { $set: { isPublic: true } });
    file.isPublic = true;
    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  },

  putUnpublish: async (req, res) => {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const query = {
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    };

    const file = await dbClient.fileCollection.findOne(query);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.fileCollection.updateOne({ _id: new ObjectId(id) },
      { $set: { isPublic: false } });
    file.isPublic = false;
    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  },

  getFile: async (req, res) => {
    const { id } = req.params;
    const { size } = req.query;
    // get file by id
    const file = await dbClient.fileCollection.findOne({ _id: new ObjectId(id) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic) {
      // retrieve token
      const token = req.headers['x-token'];

      if (!token) {
        return res.status(404).json({ error: 'Not found' });
      }

      const userId = await redisClient.get(`auth_${token}`);

      if (!userId) {
        return res.status(404).json({ error: 'Not found' });
      }

      // confirm if user is owner of file
      if (file.userId.toString() !== userId) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let path = null;

    if (size) {
      path = `${file.localPath}_${size}`;
    } else {
      path = file.localPath;
    }

    try {
      const fileContent = await readFileAsync(path);
      res.setHeader('Content-Type', contentType(file.name));
      return res.status(200).send(fileContent);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }
  },
};

export default FilesController;
