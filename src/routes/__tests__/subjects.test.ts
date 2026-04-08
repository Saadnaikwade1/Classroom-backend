/**
 * Unit tests for src/routes/subjects.ts
 *
 * The route handler is tested by invoking it directly with mock req/res objects,
 * which avoids any real TCP connections and keeps these as true unit tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoist mock variables so they are available inside vi.mock factory ────────
const {
  mockSelect,
  mockFrom,
  mockLeftJoin,
  mockWhere,
  mockOrderBy,
  mockLimit,
  mockOffset,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockLeftJoin: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
  mockLimit: vi.fn(),
  mockOffset: vi.fn(),
}));

// ─── Mock the db module so no real database connection is attempted ──────────
vi.mock("../../db", () => ({
  db: { select: mockSelect },
}));

// Import the router AFTER mocking so the mock is active when the module loads
import subjectRouter from "../subjects";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a self-contained thenable Drizzle query-builder chain that resolves
 * to resolveValue.  Each chain uses its own fresh vi.fn() instances so that
 * two chains created in the same test do not interfere with each other.
 */
function buildChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  // Each method is a fresh spy that always returns the same chain object,
  // making the builder fluent regardless of call order.
  chain.from = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(resolveValue).then(resolve, reject);
  return chain;
}

/** Wire the two sequential db.select() calls made by the handler. */
function setupDbMocks(totalCount: number, subjectsList: unknown[]) {
  mockSelect
    .mockReturnValueOnce(buildChain([{ count: totalCount }]))
    .mockReturnValueOnce(buildChain(subjectsList));
}

/** Create a minimal mock Express request. */
function makeReq(query: Record<string, string> = {}) {
  return { query } as unknown as import("express").Request;
}

/** Create a mock Express response that captures status + json payload. */
function makeRes() {
  const res = {
    _status: 0,
    _body: undefined as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: unknown) {
      this._body = body;
      return this;
    },
  };
  return res;
}

/** Pull the first (and only) GET "/" handler out of the router's stack. */
function getHandler() {
  const layer = (subjectRouter as unknown as { stack: { route?: { stack: { handle: Function }[] } }[] }).stack.find(
    (l) => l.route?.stack?.[0]
  );
  return layer!.route!.stack[0]!.handle as (
    req: import("express").Request,
    res: import("express").Response
  ) => Promise<void>;
}

const handler = getHandler();

const makeMockSubject = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  departmentId: 10,
  name: "Algorithms",
  code: "CS101",
  description: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  department: {
    id: 10,
    code: "CS",
    name: "Computer Science",
    description: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /subjects handler", () => {
  describe("successful responses", () => {
    it("returns 200 with data and pagination when there are results", async () => {
      const subject = makeMockSubject();
      setupDbMocks(1, [subject]);

      const req = makeReq();
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      expect(res._status).toBe(200);
      const body = res._body as { data: unknown[]; pagination: Record<string, unknown> };
      expect(body.data).toHaveLength(1);
      expect((body.data[0] as { code: string }).code).toBe("CS101");
      expect(body.pagination).toMatchObject({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it("returns an empty data array when there are no subjects", async () => {
      setupDbMocks(0, []);

      const req = makeReq();
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      expect(res._status).toBe(200);
      const body = res._body as { data: unknown[]; pagination: Record<string, unknown> };
      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
      expect(body.pagination.totalPages).toBe(0);
    });

    it("returns multiple subjects", async () => {
      const s1 = makeMockSubject({ id: 1, code: "CS101", name: "Algorithms" });
      const s2 = makeMockSubject({ id: 2, code: "CS102", name: "Data Structures" });
      setupDbMocks(2, [s1, s2]);

      const req = makeReq();
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      const body = res._body as { data: unknown[] };
      expect(body.data).toHaveLength(2);
    });
  });

  describe("pagination", () => {
    it("defaults page to 1 and limit to 10 when no query params given", async () => {
      setupDbMocks(0, []);

      const req = makeReq();
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      const body = res._body as { pagination: Record<string, unknown> };
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(10);
    });

    it("respects custom page and limit query params", async () => {
      const items = Array.from({ length: 5 }, (_, i) => makeMockSubject({ id: i + 1 }));
      setupDbMocks(25, items);

      const req = makeReq({ page: "3", limit: "5" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      const body = res._body as { pagination: Record<string, unknown> };
      expect(body.pagination.page).toBe(3);
      expect(body.pagination.limit).toBe(5);
      expect(body.pagination.total).toBe(25);
      expect(body.pagination.totalPages).toBe(5);
    });

    it("clamps page to 1 when page=0 is supplied", async () => {
      setupDbMocks(0, []);

      const req = makeReq({ page: "0" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      const body = res._body as { pagination: Record<string, unknown> };
      expect(body.pagination.page).toBe(1);
    });

    it("clamps page to 1 when a negative page is supplied", async () => {
      setupDbMocks(0, []);

      const req = makeReq({ page: "-5" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      const body = res._body as { pagination: Record<string, unknown> };
      expect(body.pagination.page).toBe(1);
    });

    it("clamps limit to 1 when limit=0 is supplied", async () => {
      setupDbMocks(0, []);

      const req = makeReq({ limit: "0" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      const body = res._body as { pagination: Record<string, unknown> };
      expect(body.pagination.limit).toBe(1);
    });

    it("calculates totalPages correctly for non-divisible totals (ceil)", async () => {
      setupDbMocks(11, []);

      const req = makeReq({ limit: "5" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      // Math.ceil(11/5) = 3
      const body = res._body as { pagination: Record<string, unknown> };
      expect(body.pagination.totalPages).toBe(3);
    });

    it("returns totalPages=1 when exactly one page of results exists", async () => {
      setupDbMocks(1, [makeMockSubject()]);

      const req = makeReq({ page: "1", limit: "1" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      const body = res._body as { pagination: Record<string, unknown> };
      expect(body.pagination.totalPages).toBe(1);
    });

    it("boundary: page=1 limit=1 total=0 yields totalPages=0", async () => {
      setupDbMocks(0, []);

      const req = makeReq({ page: "1", limit: "1" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      const body = res._body as { pagination: Record<string, unknown> };
      expect(body.pagination.totalPages).toBe(0);
    });
  });

  describe("search query param", () => {
    it("returns 200 when a search value is provided", async () => {
      setupDbMocks(1, [makeMockSubject()]);

      const req = makeReq({ search: "algo" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      expect(res._status).toBe(200);
    });

    it("returns 200 with empty data when search matches nothing", async () => {
      setupDbMocks(0, []);

      const req = makeReq({ search: "zzznomatch" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      expect(res._status).toBe(200);
      const body = res._body as { data: unknown[] };
      expect(body.data).toEqual([]);
    });
  });

  describe("department filter param", () => {
    it("returns 200 when a department filter is provided", async () => {
      setupDbMocks(1, [makeMockSubject()]);

      const req = makeReq({ department: "ComputerScience" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      expect(res._status).toBe(200);
    });

    it("returns 200 with empty data when department filter matches nothing", async () => {
      setupDbMocks(0, []);

      const req = makeReq({ department: "UnknownDept" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      expect(res._status).toBe(200);
      const body = res._body as { data: unknown[] };
      expect(body.data).toEqual([]);
    });
  });

  describe("combined filters", () => {
    it("accepts both search and department together", async () => {
      const subject = makeMockSubject();
      setupDbMocks(1, [subject]);

      const req = makeReq({ search: "algo", department: "CS" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      expect(res._status).toBe(200);
      const body = res._body as { data: unknown[] };
      expect(body.data).toHaveLength(1);
    });

    it("accepts search, department, page, and limit all at once", async () => {
      setupDbMocks(3, [makeMockSubject()]);

      const req = makeReq({ search: "math", department: "Science", page: "1", limit: "2" });
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      expect(res._status).toBe(200);
      const body = res._body as { pagination: Record<string, unknown> };
      expect(body.pagination).toMatchObject({ page: 1, limit: 2, total: 3 });
    });
  });

  describe("response shape", () => {
    it("response body has a data array and pagination object", async () => {
      setupDbMocks(0, []);

      const req = makeReq();
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      const body = res._body as Record<string, unknown>;
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("pagination");
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("pagination object has page, limit, total, totalPages fields", async () => {
      setupDbMocks(0, []);

      const req = makeReq();
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      const body = res._body as { pagination: Record<string, unknown> };
      expect(body.pagination).toHaveProperty("page");
      expect(body.pagination).toHaveProperty("limit");
      expect(body.pagination).toHaveProperty("total");
      expect(body.pagination).toHaveProperty("totalPages");
    });

    it("total defaults to 0 when count query returns an empty array", async () => {
      // count[0]?.count ?? 0 → 0 when the array is empty
      mockSelect
        .mockReturnValueOnce(buildChain([]))  // count → []
        .mockReturnValueOnce(buildChain([])); // list  → []

      const req = makeReq();
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      const body = res._body as { pagination: Record<string, unknown> };
      expect(body.pagination.total).toBe(0);
    });
  });

  describe("error handling", () => {
    it("returns 500 when db.select() throws synchronously", async () => {
      mockSelect.mockImplementation(() => {
        throw new Error("DB connection refused");
      });

      const req = makeReq();
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      expect(res._status).toBe(500);
      expect(res._body).toEqual({ error: "Failed to get subjects" });
    });

    it("returns 500 when the count query rejects asynchronously", async () => {
      const rejectingChain = {
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        then: (_resolve: unknown, reject: (e: Error) => unknown) =>
          Promise.reject(new Error("Query failed")).catch(reject),
      };
      mockSelect.mockReturnValueOnce(rejectingChain);

      const req = makeReq();
      const res = makeRes();
      await handler(req as unknown as import("express").Request, res as unknown as import("express").Response);

      expect(res._status).toBe(500);
      expect((res._body as { error: string }).error).toBe("Failed to get subjects");
    });
  });
});