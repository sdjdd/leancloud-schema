import _ from 'lodash';
import { ClassListItem, LeanCloudClient } from './leancloud-client';
import { ClassSchema, ColumnSchema, LocalSchema } from './schema';
import {
  CreateClassTask,
  CreateColumnTask,
  Task,
  UpdateClassPermissionsTask,
  UpdateColumnTask,
} from './task';
import { Conflict } from './conflict';

export class Diff {
  private tasks: Task[] = [];
  private conflicts: Conflict[] = [];

  constructor(
    readonly lcClient: LeanCloudClient,
    readonly localSchemas: LocalSchema[]
  ) {}

  async do() {
    this.tasks = [];
    this.conflicts = [];

    const remoteClassList = await this.lcClient.getClassList();
    this.checkMissingClass(remoteClassList);
    await this.checkExistClass(remoteClassList);

    return {
      tasks: this.tasks,
      conflicts: this.conflicts,
    };
  }

  checkMissingClass(remoteClassList: ClassListItem[]) {
    const remoteClassByName = _.keyBy(remoteClassList, (c) => c.name);

    for (const { classSchema, columnSchemas } of this.localSchemas) {
      const remoteSchema = remoteClassByName[classSchema.name];
      if (remoteSchema) {
        continue;
      }

      const defaultACL = columnSchemas.ACL?.default;
      this.tasks.push(new CreateClassTask(classSchema, defaultACL));

      const autoCreateColumns = ['objectId', 'ACL', 'createdAt', 'updatedAt'];
      Object.values(columnSchemas)
        .filter((cs) => !autoCreateColumns.includes(cs.name))
        .sort((a, b) => (a.name > b.name ? 1 : -1))
        .forEach((cs) => {
          this.tasks.push(new CreateColumnTask(classSchema.name, cs));
        });
    }
  }

  async checkExistClass(remoteClassList: ClassListItem[]) {
    const remoteClassByName = _.keyBy(remoteClassList, (c) => c.name);

    for (const localSchema of this.localSchemas) {
      const remoteClass = remoteClassByName[localSchema.classSchema.name];
      if (!remoteClass) {
        continue;
      }

      if (localSchema.classSchema.type !== remoteClass.type) {
        this.conflicts.push({
          type: 'ClassTypeConflict',
          className: localSchema.classSchema.name,
          localType: localSchema.classSchema.type,
          remoteType: remoteClass.type,
        });
        continue;
      }

      await this.checkClass(localSchema);
    }
  }

  async checkClass(localSchema: LocalSchema) {
    const remoteSchema = await this.lcClient.getClassInfo(
      localSchema.classSchema.name
    );
    this.checkClassPermissions(
      localSchema.classSchema,
      remoteSchema.classSchema
    );
    this.checkColumns(localSchema, remoteSchema);
  }

  checkClassPermissions(
    localClassSchema: ClassSchema,
    remoteClassSchema: ClassSchema
  ) {
    if (
      !_.isEqual(localClassSchema.permissions, remoteClassSchema.permissions)
    ) {
      this.tasks.push(
        new UpdateClassPermissionsTask(
          localClassSchema.name,
          localClassSchema.permissions
        )
      );
    }
  }

  checkColumns(localSchema: LocalSchema, remoteSchema: LocalSchema) {
    Object.values(localSchema.columnSchemas).forEach((cs) => {
      const remoteColumnSchema = remoteSchema.columnSchemas[cs.name];
      if (remoteColumnSchema) {
        if (cs.type !== remoteColumnSchema.type) {
          this.conflicts.push({
            type: 'ColumnTypeConflict',
            className: localSchema.classSchema.name,
            column: cs.name,
            localType: cs.type,
            remoteType: remoteColumnSchema.type,
          });
        } else {
          this.checkColumn(
            localSchema.classSchema.name,
            cs,
            remoteColumnSchema
          );
        }
      } else {
        this.tasks.push(new CreateColumnTask(localSchema.classSchema.name, cs));
      }
    });
  }

  checkColumn(
    className: string,
    localColumnSchema: ColumnSchema,
    remoteColumnSchema: ColumnSchema
  ) {
    if (
      localColumnSchema.type === 'Number' &&
      localColumnSchema.type === remoteColumnSchema.type
    ) {
      if (
        localColumnSchema.autoIncrement !== remoteColumnSchema.autoIncrement
      ) {
        this.conflicts.push({
          type: 'NumberColumnAutoIncrementConflict',
          className,
          column: localColumnSchema.name,
          localAutoIncrement: localColumnSchema.autoIncrement,
          remoteAutoIncrement: remoteColumnSchema.autoIncrement,
        });
        return;
      }
    }

    if (
      localColumnSchema.type === 'Pointer' &&
      localColumnSchema.type === remoteColumnSchema.type
    ) {
      if (localColumnSchema.className !== remoteColumnSchema.className) {
        this.conflicts.push({
          type: 'PointerColumnClassNameConflict',
          className,
          column: localColumnSchema.name,
          localClassName: localColumnSchema.className,
          remoteClassName: remoteColumnSchema.className,
        });
        return;
      }
    }

    if (!_.isEqual(localColumnSchema, remoteColumnSchema)) {
      this.tasks.push(new UpdateColumnTask(className, localColumnSchema));
    }
  }
}
