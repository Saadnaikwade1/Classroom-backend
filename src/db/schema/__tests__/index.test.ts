import { describe, it, expect } from "vitest";
import * as schemaIndex from "../index";

/**
 * Tests for src/db/schema/index.ts
 *
 * The file is a barrel that re-exports everything from ./app.
 * These tests verify every public symbol is accessible through the index so
 * consumers can import from the new path ("../db/schema") without breaking.
 */
describe("src/db/schema/index.ts barrel exports", () => {
  it("exports the departments table", () => {
    expect(schemaIndex.departments).toBeDefined();
  });

  it("exports the subjects table", () => {
    expect(schemaIndex.subjects).toBeDefined();
  });

  it("exports departmentRelations", () => {
    expect(schemaIndex.departmentRelations).toBeDefined();
  });

  it("exports subjectsRelations", () => {
    expect(schemaIndex.subjectsRelations).toBeDefined();
  });

  it("departments export is the same object as in app.ts (no re-wrapping)", async () => {
    const app = await import("../app");
    expect(schemaIndex.departments).toBe(app.departments);
  });

  it("subjects export is the same object as in app.ts", async () => {
    const app = await import("../app");
    expect(schemaIndex.subjects).toBe(app.subjects);
  });

  it("does not export unexpected undefined values for known keys", () => {
    const expectedKeys = [
      "departments",
      "subjects",
      "departmentRelations",
      "subjectsRelations",
    ] as const;

    for (const key of expectedKeys) {
      expect(
        schemaIndex[key],
        `Expected "${key}" to be defined in the schema index`
      ).not.toBeUndefined();
    }
  });
});