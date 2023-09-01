import mongodb from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.alive = false;
    mongodb.MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if (!err) {
        // console.log("Connected successfully to server");
        this.db = client.db(database);
        this.alive = true;

        // create collection
        this.userCollection = this.db.collection('users');
        this.fileCollection = this.db.collection('files');
      } else {
        console.log(err);
        this.alive = false;
      }
    });
  }

  /**
   * checks if connection to Redis is Alive.
   * @return true if connection alive or false if not
   */
  isAlive() {
    return this.alive;
  }

  /**
   *
   * @return the number of documents in the collection users
   */
  async nbUsers() {
    const num = await this.userCollection.countDocuments();
    return (num);
  }

  /**
   *
   * @return the number of documents in the collection files
   */
  async nbFiles() {
    const num = await this.fileCollection.countDocuments();
    return (num);
  }
}

const dbClient = new DBClient();
export default dbClient;
