import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    this.client.on('connect', () => {
      // console.log('connected to server');
    }).on('error', (err) => {
      console.log(err);
    });
    this.connected = true;
  }

  // method
  isAlive() {
    return this.connected;
  }

  /**
   * gets a velue from the redis db.
   * @param {*} key
   * @returns the value corresponding to the key.
   */
  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    const val = await getAsync(key);
    return val;
  }

  /**
   * takes a string key, a value and a duration in second as arguments
   * to store it in Redis (with an expiration set by the duration argument)
   * @param {*} key
   * @param {*} value
   * @param {*} duration
   */
  async set(key, value, duration) {
    this.client.set(key, value, 'EX', duration);
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
