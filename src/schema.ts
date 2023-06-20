export interface LocalSchema {
  classSchema: ClassSchema;
  columns: Record<string, Column>;
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

export interface BasicColumn<T extends string = string, U = any> {
  name: string;
  type: T;
  hidden: boolean;
  readonly: boolean;
  required: boolean;
  comment: string;
  default?: U;
}

export interface NumberColumn extends BasicColumn<'Number', number> {
  autoIncrement: boolean;
}

export interface PointerColumn<T extends string = string>
  extends BasicColumn<'Pointer', Pointer<T>> {
  className: T;
}

export type Column =
  | BasicColumn<'String', string>
  | NumberColumn
  | BasicColumn<'Boolean', boolean>
  | BasicColumn<'Date', LCDate>
  | BasicColumn<'File', Pointer<'_File'>>
  | BasicColumn<'Array', any[]>
  | BasicColumn<'Object', Record<string, any>>
  | BasicColumn<'GeoPoint', GeoPoint>
  | PointerColumn
  | BasicColumn<'Any', any>
  | BasicColumn<'ACL', ACL>;

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
