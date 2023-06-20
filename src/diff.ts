import _ from 'lodash';
import { ClassListItem, LeanCloudClient } from './leancloud-client';
import { ClassSchema, Column, LocalSchema } from './schema';
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

    for (const { classSchema, columns } of this.localSchemas) {
      const remoteSchema = remoteClassByName[classSchema.name];
      if (remoteSchema) {
        continue;
      }

      const defaultACL = columns.ACL?.default;
      this.tasks.push(new CreateClassTask(classSchema, defaultACL));

      const autoCreateColumns = ['objectId', 'ACL', 'createdAt', 'updatedAt'];
      Object.values(columns)
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
    Object.values(localSchema.columns).forEach((cs) => {
      const remoteColumnSchema = remoteSchema.columns[cs.name];
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

  checkColumn(className: string, localColumn: Column, remoteColumn: Column) {
    if (
      localColumn.type === 'Number' &&
      localColumn.type === remoteColumn.type
    ) {
      if (localColumn.autoIncrement !== remoteColumn.autoIncrement) {
        this.conflicts.push({
          type: 'NumberColumnAutoIncrementConflict',
          className,
          column: localColumn.name,
          localAutoIncrement: localColumn.autoIncrement,
          remoteAutoIncrement: remoteColumn.autoIncrement,
        });
        return;
      }
    }

    if (
      localColumn.type === 'Pointer' &&
      localColumn.type === remoteColumn.type
    ) {
      if (localColumn.className !== remoteColumn.className) {
        this.conflicts.push({
          type: 'PointerColumnClassNameConflict',
          className,
          column: localColumn.name,
          localClassName: localColumn.className,
          remoteClassName: remoteColumn.className,
        });
        return;
      }
    }

    if (!_.isEqual(localColumn, remoteColumn)) {
      this.tasks.push(new UpdateColumnTask(className, localColumn));
    }
  }
}
