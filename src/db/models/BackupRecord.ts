import {StampedModel} from '../stampModels';
import {date, field, text} from '@nozbe/watermelondb/decorators';

export class BackupRecord extends StampedModel {
  static table = 'backup_records';

  @date('created_at') createdAt!: Date;
  @text('file_name') fileName!: string;
  @field('size') size!: number;
  @text('checksum') checksum!: string;
}
