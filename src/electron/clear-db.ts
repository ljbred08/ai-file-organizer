// clear-db.ts
import * as vectraDb from './vectra-db';

vectraDb.clearVectraDb().then(() => {
  console.log('Database cleared!');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});