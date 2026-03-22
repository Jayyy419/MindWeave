type JsonObject = Record<string, unknown>;

const API_BASE = process.env.TEST_API_BASE || "http://localhost:3001/api";
const ADMIN_TEST_TOKEN = process.env.TEST_ADMIN_TOKEN || "";

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

async function requestWithToken(path: string, token: string, init?: RequestInit): Promise<Response> {
  return request(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

async function assertStatus(response: Response, expected: number, context: string): Promise<void> {
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`${context} expected ${expected} but got ${response.status}: ${body}`);
  }
}

async function run(): Promise<void> {
  const uid = randomId();
  const email = `smoke-${uid}@example.com`;
  const username = `smoke_${uid}`;
  const password = `Smoke!Pass${Math.floor(Math.random() * 10000)}`;

  console.log(`Using API base: ${API_BASE}`);
  console.log(`Registering user: ${email}`);

  const registerRes = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });

  if (!registerRes.ok) {
    const body = await registerRes.text();
    throw new Error(`Register failed (${registerRes.status}): ${body}`);
  }

  const registerJson = (await registerRes.json()) as JsonObject;
  const token = registerJson.token;
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("Register response did not include a valid token");
  }

  const loginRes = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    const body = await loginRes.text();
    throw new Error(`Login failed (${loginRes.status}): ${body}`);
  }

  const profileRes = await requestWithToken("/user/profile", token, { method: "GET" });
  if (!profileRes.ok) {
    const body = await profileRes.text();
    throw new Error(`Profile failed (${profileRes.status}): ${body}`);
  }

  const protectedEndpoints = [
    "/impact/rbac/roles",
    "/impact/ab-tests",
    "/impact/ai-audit-summary",
    "/impact/cost-monitoring",
    "/impact/evidence-pack",
  ];

  for (const endpoint of protectedEndpoints) {
    const nonAdminRes = await requestWithToken(endpoint, token, { method: "GET" });
    await assertStatus(nonAdminRes, 403, `Non-admin access check for ${endpoint}`);
  }

  if (ADMIN_TEST_TOKEN) {
    console.log("Running admin governance checks with TEST_ADMIN_TOKEN");

    const listRolesRes = await requestWithToken("/impact/rbac/roles", ADMIN_TEST_TOKEN, { method: "GET" });
    await assertStatus(listRolesRes, 200, "Admin role list check");

    const createAbRes = await requestWithToken("/impact/ab-tests", ADMIN_TEST_TOKEN, {
      method: "POST",
      body: JSON.stringify({
        name: `smoke-ab-${uid}`,
        channel: "integration-smoke",
        status: "active",
        variants: [
          { key: "control", weight: 50 },
          { key: "variant", weight: 50 },
        ],
      }),
    });
    await assertStatus(createAbRes, 201, "Admin create A/B test check");

    const createAbJson = (await createAbRes.json()) as JsonObject;
    const experimentId = createAbJson.id;
    if (typeof experimentId !== "string" || experimentId.length === 0) {
      throw new Error("Admin create A/B test response did not include an experiment id");
    }

    const assignRes = await requestWithToken(`/impact/ab-tests/${encodeURIComponent(experimentId)}/assign`, ADMIN_TEST_TOKEN, {
      method: "POST",
      body: JSON.stringify({ subjectKey: `smoke-subject-${uid}` }),
    });
    await assertStatus(assignRes, 200, "Admin A/B assignment check");

    const summaryRes = await requestWithToken(`/impact/ab-tests/${encodeURIComponent(experimentId)}/summary`, ADMIN_TEST_TOKEN, {
      method: "GET",
    });
    await assertStatus(summaryRes, 200, "Admin A/B summary check");

    const aiRes = await requestWithToken("/impact/ai-audit-summary", ADMIN_TEST_TOKEN, { method: "GET" });
    await assertStatus(aiRes, 200, "Admin AI audit summary check");

    const costRes = await requestWithToken("/impact/cost-monitoring", ADMIN_TEST_TOKEN, { method: "GET" });
    await assertStatus(costRes, 200, "Admin cost monitoring check");

    const exportRes = await requestWithToken("/impact/evidence-pack", ADMIN_TEST_TOKEN, { method: "GET" });
    await assertStatus(exportRes, 200, "Admin evidence export check");
  } else {
    console.log("TEST_ADMIN_TOKEN not provided; skipped admin-success governance checks.");
  }

  console.log("Integration smoke test passed.");
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
