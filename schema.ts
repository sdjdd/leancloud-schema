export interface ClassSchema {
  name: string;
  type: ClassType;
  defaultAcl: Record<string, { read?: true; write?: true }>;
  permissions: Record<Action, Permission>;
}

export type ClassType = 'normal' | 'log';

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
  | 'Any';
