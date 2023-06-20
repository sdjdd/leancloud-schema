import {
  CreateColumnData,
  LeanCloudClient,
  UpdateColumnData,
} from './leancloud-client';
import { ACL, ClassSchema, ColumnSchema } from './schema';

export type Task =
  | CreateClassTask
  | CreateColumnTask
  | UpdateClassPermissionsTask
  | UpdateDefaultACLTask
  | UpdateColumnTask;

export class CreateClassTask {
  constructor(
    readonly classSchema: ClassSchema,
    readonly defaultACL: ACL = { '*': { read: true, write: true } }
  ) {}

  describe() {
    return {
      task: 'Create class',
      classSchema: this.classSchema,
      defaultACL: this.defaultACL,
    };
  }

  async run(lcClient: LeanCloudClient) {
    await lcClient.createClass({
      name: this.classSchema.name,
      type: this.classSchema.type,
      defaultACL: this.defaultACL,
      permissions: this.classSchema.permissions,
    });
  }
}

export class CreateColumnTask {
  constructor(
    readonly className: string,
    readonly columnSchema: ColumnSchema
  ) {}

  describe() {
    return {
      task: 'Create Column',
      className: this.className,
      columnSchema: this.columnSchema,
    };
  }

  async run(lcClient: LeanCloudClient) {
    const { className, columnSchema } = this;

    const data: CreateColumnData = {
      name: columnSchema.name,
      type: columnSchema.type,
      hidden: columnSchema.hidden,
      readonly: columnSchema.readonly,
      required: columnSchema.required,
      comment: columnSchema.comment,
    };

    switch (columnSchema.type) {
      case 'Number':
        if (columnSchema.autoIncrement) {
          data.autoIncrement = columnSchema.autoIncrement;
        }
        break;
      case 'Pointer':
        data.className = columnSchema.className;
        break;
    }

    if (columnSchema.default) {
      if (columnSchema.type === 'Date') {
        data.default = columnSchema.default.iso;
      } else {
        data.default = JSON.stringify(columnSchema.default);
      }
    }

    await lcClient.createColumn(className, data);
  }
}

export class UpdateClassPermissionsTask {
  constructor(
    readonly className: string,
    readonly permissions: ClassSchema['permissions']
  ) {}

  describe() {
    return {
      task: 'Update class permissions',
      className: this.className,
      permissions: this.permissions,
    };
  }

  async run(lcClient: LeanCloudClient) {
    await lcClient.updateClassPermissions(this.className, this.permissions);
  }
}

export class UpdateDefaultACLTask {
  constructor(readonly className: string, readonly defaultACL: ACL) {}

  describe() {
    return {
      task: 'Update class default ACL',
      className: this.className,
      defaultACL: this.defaultACL,
    };
  }

  async run(lcClient: LeanCloudClient) {
    await lcClient.updateClassDefaultACL(this.className, this.defaultACL);
  }
}

export class UpdateColumnTask {
  constructor(
    readonly className: string,
    readonly columnSchema: ColumnSchema
  ) {}

  describe() {
    return {
      task: 'Update column',
      className: this.className,
      columnSchema: this.columnSchema,
    };
  }

  async run(lcClient: LeanCloudClient) {
    const { columnSchema } = this;

    const data: UpdateColumnData = {
      hidden: this.columnSchema.hidden,
      readonly: this.columnSchema.readonly,
      required: this.columnSchema.required,
      comment: this.columnSchema.comment,
    };

    if (columnSchema.default) {
      if (columnSchema.type === 'Date') {
        data.default = columnSchema.default.iso;
      } else if (columnSchema.type === 'String') {
        data.default = columnSchema.default;
      } else {
        data.default = JSON.stringify(columnSchema.default);
      }
    } else {
      data.default = null;
    }

    await lcClient.updateColumn(this.className, columnSchema.name, data);
  }
}
