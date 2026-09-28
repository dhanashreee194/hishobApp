import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {migrations} from './migrations';
import {modelClasses} from './models';
import {schema} from './schema';
import {importFarmSheet} from './importFarmSheet';
import {seedDatabase} from './seed';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'mazahishob',
  // WatermelonDB 0.28's Android JSI installer still targets the old architecture.
  // This build uses the autolinked native SQLite bridge, which runs on RN 0.87.
  jsi: false,
  onSetUpError: error => {
    console.error('WatermelonDB setup failed', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses,
});

export async function prepareDatabase(): Promise<void> {
  await adapter.initializingPromise;
  await seedDatabase(database);
  await importFarmSheet(database);
}

export {schema} from './schema';
export {seedDatabase} from './seed';
export * from './models';
