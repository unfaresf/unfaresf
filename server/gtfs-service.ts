import { openDb } from 'gtfs';
import config from '../gtfs-config.json' assert { type: 'json' };

const gtfsDb = openDb(config);

export default gtfsDb;