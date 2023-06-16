import { LeanCloudClient } from './leancloud-client';
import { ClassSchema, ColumnSchema } from './schema';

export type Task = CreateClassTask | CreateColumnTask;

export class CreateClassTask {
  readonly type = 'createClass';

  constructor(
    private lcClient: LeanCloudClient,
    readonly classSchema: ClassSchema
  ) {}

  async run() {
    await this.lcClient.createClass({
      name: this.classSchema.name,
      type: this.classSchema.type,
      defaultACL: this.classSchema.defaultACL,
      permissions: this.classSchema.permissions,
    });
  }
}

export class CreateColumnTask {
  readonly type = 'createColumn';

  constructor(
    private lcClient: LeanCloudClient,
    readonly className: string,
    readonly columnSchema: ColumnSchema
  ) {}

  async run() {
    await this.lcClient.createColumn({
      className: this.className,
      name: this.columnSchema.name,
      type: this.columnSchema.type,
      hidden: this.columnSchema.hidden,
      readonly: this.columnSchema.readonly,
      required: this.columnSchema.required,
      default: this.columnSchema.default,
      comment: this.columnSchema.comment,
      autoIncrement: this.columnSchema.autoIncrement,
      incrementValue: this.columnSchema.incrementValue,
      pointerClass: this.columnSchema.pointerClass,
    });
  }
}
