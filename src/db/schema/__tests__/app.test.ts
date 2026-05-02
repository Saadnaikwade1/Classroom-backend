import { describe, it, expect } from "vitest";
import { getTableName } from "drizzle-orm";
import {
  departments,
  subjects,
  departmentRelations,
  subjectsRelations,
} from "../app";

// ─── departments table ────────────────────────────────────────────────────────

describe("departments table", () => {
  it("has the correct SQL table name", () => {
    expect(getTableName(departments)).toBe("departments");
  });

  it("exposes an id column", () => {
    expect(departments.id).toBeDefined();
  });

  it("exposes a code column", () => {
    expect(departments.code).toBeDefined();
  });

  it("exposes a name column", () => {
    expect(departments.name).toBeDefined();
  });

  it("exposes a description column", () => {
    expect(departments.description).toBeDefined();
  });

  it("exposes timestamp columns (createdAt, updatedAt)", () => {
    expect(departments.createdAt).toBeDefined();
    expect(departments.updatedAt).toBeDefined();
  });

  it("id column is the primary key", () => {
    expect(departments.id.primary).toBe(true);
  });

  it("code column is unique", () => {
    expect(departments.code.isUnique).toBe(true);
  });

  it("code column has max length 50", () => {
    expect(departments.code.columnType).toBe("PgVarchar");
    expect((departments.code as unknown as { length: number }).length).toBe(50);
  });

  it("name column has max length 255", () => {
    expect((departments.name as unknown as { length: number }).length).toBe(255);
  });

  it("description column allows null (is optional)", () => {
    // A column without notNull() has notNull = false
    expect(departments.description.notNull).toBe(false);
  });
});

// ─── subjects table ───────────────────────────────────────────────────────────

describe("subjects table", () => {
  it("has the correct SQL table name", () => {
    expect(getTableName(subjects)).toBe("subjects");
  });

  it("exposes an id column", () => {
    expect(subjects.id).toBeDefined();
  });

  it("exposes a departmentId column", () => {
    expect(subjects.departmentId).toBeDefined();
  });

  it("exposes a name column", () => {
    expect(subjects.name).toBeDefined();
  });

  it("exposes a code column", () => {
    expect(subjects.code).toBeDefined();
  });

  it("exposes a description column", () => {
    expect(subjects.description).toBeDefined();
  });

  it("exposes timestamp columns (createdAt, updatedAt)", () => {
    expect(subjects.createdAt).toBeDefined();
    expect(subjects.updatedAt).toBeDefined();
  });

  it("id column is the primary key", () => {
    expect(subjects.id.primary).toBe(true);
  });

  it("code column is unique", () => {
    expect(subjects.code.isUnique).toBe(true);
  });

  it("departmentId is not null (required FK)", () => {
    expect(subjects.departmentId.notNull).toBe(true);
  });

  it("code column has max length 50", () => {
    expect((subjects.code as unknown as { length: number }).length).toBe(50);
  });

  it("name column has max length 255", () => {
    expect((subjects.name as unknown as { length: number }).length).toBe(255);
  });

  it("description column allows null (is optional)", () => {
    expect(subjects.description.notNull).toBe(false);
  });
});

// ─── relations ────────────────────────────────────────────────────────────────

describe("departmentRelations", () => {
  it("is defined and exported", () => {
    expect(departmentRelations).toBeDefined();
  });

  it("is a Relations object (has a referencedTable property)", () => {
    // drizzle Relations objects expose their table reference
    expect((departmentRelations as unknown as { table: unknown }).table).toBeDefined();
  });
});

describe("subjectsRelations", () => {
  it("is defined and exported", () => {
    expect(subjectsRelations).toBeDefined();
  });

  it("is a Relations object", () => {
    expect((subjectsRelations as unknown as { table: unknown }).table).toBeDefined();
  });
});

// ─── TypeScript inference sanity checks (compile-time only) ──────────────────
// These imports verify the exported types exist at the type level.
// If they're missing the file won't compile.
import type { Department, NewDepartment, Subject, NewSubject } from "../app";

describe("exported TypeScript types", () => {
  it("Department type has all expected keys", () => {
    // Use a value assertion to confirm shape at runtime via inference
    const sample: Department = {
      id: 1,
      code: "CS",
      name: "Computer Science",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(sample.id).toBe(1);
    expect(sample.code).toBe("CS");
  });

  it("NewDepartment type allows omitting auto-generated fields", () => {
    const sample: NewDepartment = {
      code: "MATH",
      name: "Mathematics",
    };
    expect(sample.code).toBe("MATH");
  });

  it("Subject type has all expected keys", () => {
    const sample: Subject = {
      id: 1,
      departmentId: 2,
      name: "Algorithms",
      code: "CS101",
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(sample.departmentId).toBe(2);
  });

  it("NewSubject type allows omitting auto-generated fields", () => {
    const sample: NewSubject = {
      departmentId: 1,
      name: "Linear Algebra",
      code: "MATH201",
    };
    expect(sample.name).toBe("Linear Algebra");
  });
});