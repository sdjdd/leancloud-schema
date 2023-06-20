export interface LocalSchema {
  classSchema: ClassSchema;
  columnSchemas: Record<string, ColumnSchema>;
}

export interface ClassSchema {
  name: string;
  type: 'normal' | 'log';
  permissions: {
    add_fields: Permission;
    create: Permission;
    delete: Permission;
    update: Permission;
    find: Permission;
    get: Permission;
  };
}

type Permission =
  | { '*': true }
  | { onlySignInUsers: true }
  | {
      roles: string[];
      users: string[];
    };

export interface BasicColumnSchema<T extends string = string, U = any> {
  name: string;
  type: T;
  hidden: boolean;
  readonly: boolean;
  required: boolean;
  comment: string;
  default?: U;
}

export interface NumberColumnSchema
  extends BasicColumnSchema<'Number', number> {
  autoIncrement: boolean;
}

export interface PointerColumnSchema<T extends string = string>
  extends BasicColumnSchema<'Pointer', Pointer<T>> {
  className: T;
}

export type ColumnSchema =
  | BasicColumnSchema<'String', string>
  | NumberColumnSchema
  | BasicColumnSchema<'Boolean', boolean>
  | BasicColumnSchema<'Date', LCDate>
  | BasicColumnSchema<'File', Pointer<'_File'>>
  | BasicColumnSchema<'Array', any[]>
  | BasicColumnSchema<'Object', Record<string, any>>
  | BasicColumnSchema<'GeoPoint', GeoPoint>
  | PointerColumnSchema
  | BasicColumnSchema<'Any', any>
  | BasicColumnSchema<'ACL', ACL>;

interface LCDate {
  __type: 'Date';
  iso: string;
}

interface Pointer<T extends string = string> {
  __type: 'Pointer';
  className: T;
  objectId: string;
}

interface GeoPoint {
  __type: 'GeoPoint';
  latitude: number;
  longitude: number;
}

export interface ACL {
  [subject: string]:
    | { read: true }
    | { write: true }
    | { read: true; write: true };
}
