export interface LocalSchema {
  classSchema: ClassSchema;
  columnSchemas: Record<string, ColumnSchema>;
}

export interface ClassSchema {
  name: string;
  type: ClassType;
  defaultACL: DefaultACL;
  permissions: Record<Action, Permission>;
}

export type ClassType = 'normal' | 'log';

export type DefaultACL = {
  [subject: string]:
    | { read: true }
    | { write: true }
    | { read: true; write: true };
};

export type Action =
  | 'add_fields'
  | 'create'
  | 'delete'
  | 'update'
  | 'find'
  | 'get';

export type Permission =
  | { '*': true }
  | { onlySignInUsers: true }
  | {
      roles: string[];
      users: string[];
    };

export interface ColumnSchema {
  name: string;
  type: ColumnType;
  hidden: boolean;
  readonly: boolean;
  required: boolean;
  default?: any;
  comment?: string;
  autoIncrement?: boolean;
  incrementValue?: number;
  pointerClass?: string;
}

export type ColumnType =
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Date'
  | 'File'
  | 'Array'
  | 'Object'
  | 'GeoPoint'
  | 'Pointer'
  | 'Any'
  | 'ACL';
