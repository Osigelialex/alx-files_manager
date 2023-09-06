import Queue from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';
import { writeFileAsync } from './controllers/FilesController';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
  if (!job.data.fileId) {
    throw new Error('Missing fileId');
  } else if (!job.data.userId) {
    throw new Error('Missing userId');
  }
  const query = {
    _id: new ObjectId(job.data.fileId),
    userId: new ObjectId(job.data.userId),
  };

  const file = await dbClient.fileCollection.findOne(query);
  // console.log(file);
  if (!file) {
    throw new Error('File not found');
  }

  // create thumbnail
  const widths = [500, 250, 100];
  widths.forEach(async (width) => {
    try {
      const thumbnail = await imageThumbnail(file.localPath, { width });
      const newPath = `${file.localPath}_${width}`;

      // write thumbnail to file
      await writeFileAsync(newPath, thumbnail)
        .catch((err) => console.error(err));
    } catch (err) {
      console.log(err);
    }
  });
});
