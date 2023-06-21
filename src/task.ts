import { Difference } from './difference';
import { LeanCloudClient } from './leancloud-client';
import { ClassSchema, ColumnSchema } from './loose-schema';
import { ACL } from './type';

export type Task =
  | CreateClassTask
  | CreateColumnTask
  | UpdateClassPermissionsTask
  | UpdateDefaultACLTask
  | UpdateColumnTask;

export class CreateClassTask {
  constructor(readonly classSchema: ClassSchema) {}

  describe() {
    return {
      task: 'Create class',
      class: {
        name: this.classSchema.name,
        type: this.classSchema.type,
        permissions: this.classSchema.permissions,
        defaultACL: this.classSchema.schema.ACL?.default,
      },
    };
  }

  async run(lcClient: LeanCloudClient) {
    await lcClient.createClass(this.classSchema);
  }
}

export class CreateColumnTask {
  constructor(readonly className: string, readonly column: ColumnSchema) {}

  describe() {
    return {
      task: 'Create Column',
      className: this.className,
      column: this.column,
    };
  }

  async run(lcClient: LeanCloudClient) {
    await lcClient.createColumn(this.className, this.column);
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
  constructor(readonly className: string, readonly column: ColumnSchema) {}

  describe() {
    return {
      task: 'Update column',
      className: this.className,
      column: this.column,
    };
  }

  async run(lcClient: LeanCloudClient) {
    await lcClient.updateColumn(this.className, this.column);
  }
}

export function createTask(difference: Difference): Task {
  switch (difference.type) {
    case 'MissingClass':
      return new CreateClassTask(difference.class);
    case 'MissingColumn':
      return new CreateColumnTask(difference.className, difference.column);
    case 'ClassPermissionsMismatch':
      return new UpdateClassPermissionsTask(
        difference.className,
        difference.expected
      );
    case 'ColumnMismatch':
      return new UpdateColumnTask(difference.className, difference.expected);
  }
}
