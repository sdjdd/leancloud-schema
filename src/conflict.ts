export type Conflict =
  | ClassTypeConflict
  | ColumnTypeConflict
  | NumberColumnAutoIncrementConflict
  | PointerColumnClassNameConflict;

export interface ClassTypeConflict {
  type: 'ClassTypeConflict';
  className: string;
  localType: string;
  remoteType: string;
}

export interface ColumnTypeConflict {
  type: 'ColumnTypeConflict';
  className: string;
  column: string;
  localType: string;
  remoteType: string;
}

export interface NumberColumnAutoIncrementConflict {
  type: 'NumberColumnAutoIncrementConflict';
  className: string;
  column: string;
  localAutoIncrement: boolean;
  remoteAutoIncrement: boolean;
}

export interface PointerColumnClassNameConflict {
  type: 'PointerColumnClassNameConflict';
  className: string;
  column: string;
  localClassName: string;
  remoteClassName: string;
}
