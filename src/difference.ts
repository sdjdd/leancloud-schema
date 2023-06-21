import _ from 'lodash';
import { Conflict } from './conflict';
import { LeanCloudClient } from './leancloud-client';
import { ClassSchema, ColumnSchema } from './schema';
import { ACL } from './type';

const AUTO_CREATE_COLUMNS = ['objectId', 'ACL', 'createdAt', 'updatedAt'];

const DEFAULT_ACL: ACL = {
  '*': { read: true, write: true },
};

interface MissingClass {
  type: 'MissingClass';
  class: ClassSchema;
}

interface MissingColumn {
  type: 'MissingColumn';
  className: string;
  column: ColumnSchema;
}

interface ClassPermissionsMismatch {
  type: 'ClassPermissionsMismatch';
  className: string;
  current: ClassSchema['permissions'];
  expected: ClassSchema['permissions'];
}

interface ColumnMismatch {
  type: 'ColumnMismatch';
  className: string;
  current: ColumnSchema;
  expected: ColumnSchema;
}

export type Difference =
  | MissingClass
  | MissingColumn
  | ClassPermissionsMismatch
  | ColumnMismatch;

interface DiffContext {
  differences: Difference[];
  conflicts: Conflict[];
}

export async function difference(
  lcClient: LeanCloudClient,
  localClasses: ClassSchema[]
) {
  const ctx: DiffContext = {
    differences: [],
    conflicts: [],
  };

  const classList = await lcClient.getClassList();
  const existClasses: ClassSchema[] = [];

  localClasses.forEach((localClass) => {
    const remoteClass = classList.find((c) => c.name === localClass.name);
    if (remoteClass) {
      if (localClass.type !== remoteClass.type) {
        ctx.conflicts.push({
          type: 'ClassTypeConflict',
          className: localClass.name,
          localType: localClass.type,
          remoteType: remoteClass.type,
        });
      } else {
        existClasses.push(localClass);
      }
    } else {
      ctx.differences.push({ type: 'MissingClass', class: localClass });
      Object.values(localClass.schema).forEach((column) => {
        if (AUTO_CREATE_COLUMNS.includes(column.name)) {
          return;
        }
        ctx.differences.push({
          type: 'MissingColumn',
          className: localClass.name,
          column,
        });
      });
    }
  });

  for (const localClass of existClasses) {
    const remoteClass = await lcClient.getClassSchema(localClass.name);
    checkClass(ctx, localClass, remoteClass);
  }

  return ctx;
}

function checkClass(
  ctx: DiffContext,
  localClass: ClassSchema,
  remoteClass: ClassSchema
) {
  if (!_.isEqual(localClass.permissions, remoteClass.permissions)) {
    ctx.differences.push({
      type: 'ClassPermissionsMismatch',
      className: localClass.name,
      current: remoteClass.permissions,
      expected: localClass.permissions,
    });
  }
  Object.values(localClass.schema).forEach((localColumn) => {
    const remoteColumn = remoteClass.schema[localColumn.name];
    if (remoteColumn) {
      checkColumn(ctx, localClass.name, localColumn, remoteColumn);
    } else {
      ctx.differences.push({
        type: 'MissingColumn',
        className: localClass.name,
        column: localColumn,
      });
    }
  });
}

function checkColumn(
  ctx: DiffContext,
  className: string,
  localColumn: ColumnSchema,
  remoteColumn: ColumnSchema
) {
  if (localColumn.type !== remoteColumn.type) {
    ctx.conflicts.push({
      type: 'ColumnTypeConflict',
      className,
      column: localColumn.name,
      localType: localColumn.type,
      remoteType: remoteColumn.type,
    });
    return;
  }

  if (
    localColumn.type === 'Number' &&
    !isEqual(localColumn.auto_increment, remoteColumn.auto_increment, false)
  ) {
    ctx.conflicts.push({
      type: 'NumberColumnAutoIncrementConflict',
      className,
      column: localColumn.name,
      localAutoIncrement: localColumn.auto_increment || false,
      remoteAutoIncrement: remoteColumn.auto_increment || false,
    });
    return;
  }

  if (
    localColumn.type === 'Pointer' &&
    localColumn.className !== remoteColumn.className
  ) {
    ctx.conflicts.push({
      type: 'PointerColumnClassNameConflict',
      className,
      column: localColumn.name,
      localClassName: localColumn.className!,
      remoteClassName: remoteColumn.className!,
    });
    return;
  }

  if (!isColumnEqual(localColumn, remoteColumn)) {
    ctx.differences.push({
      type: 'ColumnMismatch',
      className,
      current: remoteColumn,
      expected: localColumn,
    });
  }
}

function isColumnEqual(c1: ColumnSchema, c2: ColumnSchema) {
  return (
    c1.name === c2.name &&
    c1.type === c2.type &&
    isEqual(c1.hidden, c2.hidden, false) &&
    isEqual(c1.read_only, c2.read_only, false) &&
    isEqual(c1.required, c2.required, false) &&
    isEqual(c1.auto_increment, c2.auto_increment, false) &&
    isEqual(c1.comment, c2.comment, '') &&
    isEqual(c1.user_private, c2.user_private, false) &&
    c1.className === c2.className &&
    _.isEqual(c1.default, c2.default)
  );
}

function isEqual<T>(a: T | undefined, b: T | undefined, defaultValue: T) {
  return (a ?? defaultValue) === (b ?? defaultValue);
}
