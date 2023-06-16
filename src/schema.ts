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

interface BasicColumnSchema<T extends string = string, D = any> {
  name: string;
  type: T;
  hidden: boolean;
  readonly: boolean;
  required: boolean;
  comment?: string;
  default?: D;
}

export type ColumnSchema =
  | BasicColumnSchema<'String', number>
  | (BasicColumnSchema<'Number', number> & {
      autoIncrement?: boolean;
      incrementValue?: number;
    })
  | BasicColumnSchema<'Boolean', boolean>
  | BasicColumnSchema<'Date', Date>
  | BasicColumnSchema<'File', Pointer<'_File'>>
  | BasicColumnSchema<'Array', any[]>
  | BasicColumnSchema<'Object', Record<string, any>>
  | BasicColumnSchema<'GeoPoint', GeoPoint>
  | (BasicColumnSchema<'Pointer', Pointer> & {
      pointerClass?: string;
    })
  | BasicColumnSchema<'Any', any>
  | BasicColumnSchema<'ACL', ACL>;

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
