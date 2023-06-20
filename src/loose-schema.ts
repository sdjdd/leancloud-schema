export interface ClassSchema {
  name: string;
  type: string;
  schema: {
    [column: string]: ColumnSchema;
  };
  permissions: {
    [action: string]: Permission;
  };
}

export interface ColumnSchema {
  name: string;
  type: string;
  hidden?: boolean;
  read_only?: boolean;
  required?: boolean;
  comment?: string;
  default?: any;
  auto_increment?: boolean; // Number column
  className?: string; // Pointer column
  user_private?: boolean; // _User class column
}

export interface Permission {
  '*'?: boolean;
  onlySignInUsers?: boolean;
  roles?: string[];
  users?: string[];
}
