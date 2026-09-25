import {StampedModel} from '../stampModels';
import {field, text} from '@nozbe/watermelondb/decorators';

export class GrainMaster extends StampedModel {
  static table = 'grain_masters';

  @text('name') name!: string;
  @text('default_unit') defaultUnit!: string;
  @field('active') active!: boolean;
}
