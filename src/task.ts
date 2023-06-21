import { Difference } from './difference';
import { LeanCloudClient } from './leancloud-client';
import { ClassSchema, ColumnSchema } from './schema';
import { ACL } from './type';

export type Task =
  | CreateClassTask
  | CreateColumnTask
  | UpdateClassPermissionsTask
  | UpdateDefaultACLTask
  | UpdateColumnTask;

export class CreateClassTask {
  constructor(readonly classSchema: ClassSchema) {}

  async run(lcClient: LeanCloudClient) {
    await lcClient.createClass(this.classSchema);
  }
}

export class CreateColumnTask {
  constructor(readonly className: string, readonly column: ColumnSchema) {}

  async run(lcClient: LeanCloudClient) {
    await lcClient.createColumn(this.className, this.column);
  }
}

export class UpdateClassPermissionsTask {
  constructor(
    readonly className: string,
    readonly permissions: ClassSchema['permissions']
  ) {}

  async run(lcClient: LeanCloudClient) {
    await lcClient.updateClassPermissions(this.className, this.permissions);
  }
}

export class UpdateDefaultACLTask {
  constructor(readonly className: string, readonly defaultACL: ACL) {}

  async run(lcClient: LeanCloudClient) {
    await lcClient.updateClassDefaultACL(this.className, this.defaultACL);
  }
}

export class UpdateColumnTask {
  constructor(readonly className: string, readonly column: ColumnSchema) {}

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
