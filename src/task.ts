import {
  CreateColumnData,
  LeanCloudClient,
  UpdateColumnData,
} from './leancloud-client';
import { ACL, ClassSchema, Column } from './schema';

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
  constructor(readonly className: string, readonly column: Column) {}

  describe() {
    return {
      task: 'Create Column',
      className: this.className,
      column: this.column,
    };
  }

  async run(lcClient: LeanCloudClient) {
    const { className, column } = this;

    const data: CreateColumnData = {
      name: column.name,
      type: column.type,
      hidden: column.hidden,
      readonly: column.readonly,
      required: column.required,
      comment: column.comment,
    };

    switch (column.type) {
      case 'Number':
        if (column.autoIncrement) {
          data.autoIncrement = column.autoIncrement;
        }
        break;
      case 'Pointer':
        data.className = column.className;
        break;
    }

    if (column.default) {
      if (column.type === 'Date') {
        data.default = column.default.iso;
      } else {
        data.default = JSON.stringify(column.default);
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
  constructor(readonly className: string, readonly columnSchema: Column) {}

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
