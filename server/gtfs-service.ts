import { openDb } from 'gtfs';
import config from '../gtfs/gtfs-config.json' assert { type: 'json' };

const gtfsDb = openDb(config);

export default gtfsDb;