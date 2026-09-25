import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

/**
 * Watermelon stamps `updated_at` on update when the model exposes `updatedAt`.
 * Creates are stamped here so last-write-wins has a write time, not a sync time.
 */
export class StampedModel extends Model {
  @field('updated_at') updatedAt!: number;
}

/** Financial rows stay in the database after delete so the owner can restore them. */
export class FinancialModel extends StampedModel {
  @field('is_deleted') isDeleted!: boolean;
  @field('created_at') createdAt!: number;
  @text('created_by') createdBy!: string | null;
}

type RecordBuilder = (record: Model) => void;

const originalPrepareCreate = Model._prepareCreate;
Model._prepareCreate = function prepareCreate(collection, recordBuilder: RecordBuilder = () => undefined) {
  return originalPrepareCreate.call(this, collection, (record: Model) => {
    recordBuilder(record);
    const raw = record._raw as {
      updated_at?: number | null;
      created_at?: number | null;
      created_by?: string | null;
      is_deleted?: boolean | null;
    };
    const now = Date.now();
    if (raw.updated_at == null) {
      raw.updated_at = now;
    }
    if ('createdAt' in record) {
      if (raw.created_at == null || raw.created_at === 0) {
        raw.created_at = now;
      }
      if (raw.created_by == null || raw.created_by === '') {
        raw.created_by = 'owner';
      }
      if (raw.is_deleted == null) {
        raw.is_deleted = false;
      }
    }
  });
};
