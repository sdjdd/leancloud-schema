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

interface BasicColumnSchema {
  name: string;
  type: string;
  hidden: boolean;
  readonly: boolean;
  required: boolean;
  comment?: string;
  default?: any;
}

interface StringColumnSchema extends BasicColumnSchema {
  type: 'String';
  default?: string;
}

interface NumberColumnSchema extends BasicColumnSchema {
  type: 'Number';
  default?: number;
  autoIncrement?: boolean;
}

interface BooleanColumnSchema extends BasicColumnSchema {
  type: 'Boolean';
  default?: boolean;
}

interface DateColumnSchema extends BasicColumnSchema {
  type: 'Date';
  default?: LCDate;
}

interface FileColumnSchema extends BasicColumnSchema {
  type: 'File';
  default?: Pointer<'_File'>;
}

interface ArrayColumnSchema extends BasicColumnSchema {
  type: 'Array';
  default?: any[];
}

interface ObjectColumnSchema extends BasicColumnSchema {
  type: 'Object';
  default?: Record<string, any>;
}

interface GeoPointColumnSchema extends BasicColumnSchema {
  type: 'GeoPoint';
  default?: GeoPoint;
}

interface PointerColumnSchema<T extends string = string>
  extends BasicColumnSchema {
  type: 'Pointer';
  default?: Pointer<T>;
  className?: T;
}

interface AnyColumnSchema extends BasicColumnSchema {
  type: 'Any';
  default?: any;
}

interface ACLColumnSchema extends BasicColumnSchema {
  type: 'ACL';
  defalut?: ACL;
}

export type ColumnSchema =
  | StringColumnSchema
  | NumberColumnSchema
  | BooleanColumnSchema
  | DateColumnSchema
  | FileColumnSchema
  | ArrayColumnSchema
  | ObjectColumnSchema
  | GeoPointColumnSchema
  | PointerColumnSchema
  | AnyColumnSchema
  | ACLColumnSchema;

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
