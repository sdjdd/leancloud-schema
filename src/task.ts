import { CreateColumnData, LeanCloudClient } from './leancloud-client';
import { ACL, ClassSchema, ColumnSchema } from './schema';

export type Task = CreateClassTask | CreateColumnTask;

export class CreateClassTask {
  readonly type = 'createClass';

  constructor(
    private lcClient: LeanCloudClient,
    readonly classSchema: ClassSchema,
    readonly defaultACL?: ACL
  ) {}

  async run() {
    await this.lcClient.createClass({
      name: this.classSchema.name,
      type: this.classSchema.type,
      defaultACL: this.defaultACL || {
        '*': { read: true, write: true },
      },
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
    const data: CreateColumnData = {
      className: this.className,
      name: this.columnSchema.name,
      type: this.columnSchema.type,
      hidden: this.columnSchema.hidden,
      readonly: this.columnSchema.readonly,
      required: this.columnSchema.required,
      default: this.columnSchema.default,
      comment: this.columnSchema.comment,
    };

    if (this.columnSchema.type === 'Number') {
      data.autoIncrement = this.columnSchema.autoIncrement;
      data.incrementValue = this.columnSchema.incrementValue;
    } else if (this.columnSchema.type === 'Pointer') {
      data.pointerClass = this.columnSchema.pointerClass;
    }

    await this.lcClient.createColumn(data);
  }
}
