import _ from 'lodash';

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

interface ColumnOptions {
  hidden?: boolean;
  required?: boolean;
  readonly?: boolean;
  comment?: string;
  default?: any;
}

export class Column<T = any> {
  hidden = false;
  required = false;
  readonly = false;
  comment = '';
  default?: T;

  constructor(
    readonly name: string,
    readonly type: string,
    options?: ColumnOptions
  ) {}

  compare(column: Column): number {
    return this.name > column.name ? 1 : -1;
  }

  encodeDefaultValue(): any {
    if (this.default !== undefined) {
      return JSON.stringify(this.default);
    }
  }

  toJSON(encodeDefaultValue = false): any {
    return {
      type: this.type,
      hidden: this.hidden,
      required: this.required,
      read_only: this.readonly,
      comment: this.comment,
      default: encodeDefaultValue ? this.encodeDefaultValue() : this.default,
    };
  }
}

export class StringColumn extends Column<string> {
  constructor(name: string) {
    super(name, 'String');
  }

  encodeDefaultValue() {
    return this.default;
  }
}

export class NumberColumn extends Column<number> {
  autoIncrement = false;

  constructor(name: string) {
    super(name, 'Number');
  }

  toJSON(encodeDefaultValue = false) {
    return {
      ...super.toJSON(encodeDefaultValue),
      autoIncrement: this.autoIncrement,
    };
  }
}

export class BooleanColumn extends Column<boolean> {
  constructor(name: string) {
    super(name, 'Boolean');
  }
}

export class DateColumn extends Column<LCDate> {
  constructor(name: string) {
    super(name, 'Date');
  }

  encodeDefaultValue() {
    if (this.default) {
      return this.default.iso;
    }
  }
}

export class FileColumn extends Column<Pointer<'File'>> {
  constructor(name: string) {
    super(name, 'File');
  }
}

export class ArrayColumn extends Column<any[]> {
  constructor(name: string) {
    super(name, 'Array');
  }
}

export class ObjectColumn extends Column<Record<string, any>> {
  constructor(name: string) {
    super(name, 'Object');
  }
}

export class GeoPointColumn extends Column<GeoPoint> {
  constructor(name: string) {
    super(name, 'GeoPoint');
  }
}

export class PointerColumn extends Column<Pointer> {
  className: string;

  constructor(name: string, className: string) {
    super(name, 'Pointer');
    this.className = className;
  }

  toJSON(encodeDefaultValue = false) {
    return {
      ...super.toJSON(encodeDefaultValue),
      className: this.className,
    };
  }
}

export class AnyColumn extends Column<any> {
  constructor(name: string) {
    super(name, 'Any');
  }
}

export class ObjectIdColumn extends StringColumn {
  constructor() {
    super('objectId');
  }

  compare(column: Column) {
    return -1;
  }

  toJSON() {
    return {
      type: this.type,
    };
  }
}

export class ACLColumn extends Column<ACL> {
  constructor() {
    super('ACL', 'ACL');
  }

  compare(column: Column) {
    if (column.name === 'objectId') {
      return 1;
    }
    return -1;
  }
}

export class CreatedAtColumn extends DateColumn {
  constructor() {
    super('createdAt');
  }

  compare(column: Column) {
    if (column.name === 'updatedAt') {
      return -1;
    }
    return 1;
  }

  toJSON() {
    return {
      type: this.type,
      hidden: this.hidden,
      comment: this.comment,
    };
  }
}

export class UpdatedAtColumn extends DateColumn {
  constructor() {
    super('updatedAt');
  }

  compare(column: Column) {
    return 1;
  }

  toJSON() {
    return {
      type: this.type,
      hidden: this.hidden,
      comment: this.comment,
    };
  }
}
