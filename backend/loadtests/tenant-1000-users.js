import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:3001";
const EXPLORE_LIMIT = Number(__ENV.K6_EXPLORE_LIMIT || 12);
const SWIPES_PER_USER = Number(__ENV.K6_SWIPES_PER_USER || 5);
const THINK_TIME_MIN = Number(__ENV.K6_THINK_TIME_MIN || 0.4);
const THINK_TIME_MAX = Number(__ENV.K6_THINK_TIME_MAX || 2.2);
const ENABLE_CHAT_START = (__ENV.K6_ENABLE_CHAT_START || "true").toLowerCase() !== "false";
const TOKENS_FILE_CONTENT = __ENV.K6_TENANT_TOKENS_FILE
  ? open(__ENV.K6_TENANT_TOKENS_FILE)
  : "";
const EMAILS_FILE_CONTENT = __ENV.K6_TENANT_EMAILS_FILE
  ? open(__ENV.K6_TENANT_EMAILS_FILE)
  : "";

// For a real 1000-user run, prefer pre-issued JWTs because /api/auth/login
// is rate-limited to 10 requests per 60 seconds in this backend.
const TOKENS = new SharedArray("tenant-tokens", () =>
  `${TOKENS_FILE_CONTENT}\n${__ENV.K6_TENANT_TOKENS || ""}`
    .split(",")
    .flatMap((value) => value.split("\n"))
    .map((value) => value.trim())
    .filter(Boolean)
);

const TENANT_EMAILS = new SharedArray("tenant-emails", () =>
  `${EMAILS_FILE_CONTENT}\n${__ENV.K6_TENANT_EMAILS || ""}`
    .split(",")
    .flatMap((value) => value.split("\n"))
    .map((value) => value.trim())
    .filter(Boolean)
);

const TENANT_PASSWORDS = new SharedArray("tenant-passwords", () =>
  (__ENV.K6_TENANT_PASSWORDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

export const options = {
  scenarios: {
    tenants_1000_constant: {
      executor: "constant-vus",
      vus: Number(__ENV.K6_VUS || 1000),
      duration: __ENV.K6_DURATION || "1m",
      gracefulStop: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    checks: ["rate>0.99"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

function jsonHeaders(token) {
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    tags: { tenant_flow: "true" },
  };
}

function pickFrom(list, fallbackIndex) {
  if (!list.length) return "";
  return list[fallbackIndex % list.length];
}

function getVuIndex() {
  return Math.max(0, (__VU || 1) - 1);
}

function getAuthToken() {
  const vuIndex = getVuIndex();
  const directToken = pickFrom(TOKENS, vuIndex);
  if (directToken) return directToken;

  const email = pickFrom(TENANT_EMAILS, vuIndex);
  if (!email) {
    throw new Error(
      "No tenant auth configured. Set K6_TENANT_TOKENS or K6_TENANT_EMAILS/K6_TENANT_PASSWORDS."
    );
  }

  const password =
    pickFrom(TENANT_PASSWORDS, vuIndex) ||
    __ENV.K6_TENANT_PASSWORD ||
    "";

  if (!password) {
    throw new Error(
      "Tenant passwords are missing. Set K6_TENANT_PASSWORD or K6_TENANT_PASSWORDS."
    );
  }

  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "auth_login", tenant_flow: "true" },
    }
  );

  check(loginRes, {
    "login status ok": (res) => res.status === 200 || res.status === 201,
    "login token returned": (res) => {
      try {
        return Boolean(res.json("accessToken"));
      } catch (_) {
        return false;
      }
    },
  });

  const token = loginRes.json("accessToken");
  if (!token) {
    throw new Error(`Login failed for ${email} with status ${loginRes.status}`);
  }

  return token;
}

function normalizeExploreItems(res) {
  try {
    const payload = res.json();
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data)) return payload.data;
  } catch (_) {
    return [];
  }
  return [];
}

function propertyIdFromItem(item) {
  return item?._id || item?.id || "";
}

function randomThinkTime() {
  if (THINK_TIME_MAX <= THINK_TIME_MIN) return THINK_TIME_MIN;
  return THINK_TIME_MIN + Math.random() * (THINK_TIME_MAX - THINK_TIME_MIN);
}

function swipeListing(token, propertyId, liked) {
  const res = http.post(
    `${BASE_URL}/api/matches`,
    JSON.stringify({
      propertyId,
      tenantLiked: liked,
      ...(liked ? {} : { dismissReason: "Soft" }),
    }),
    {
      ...jsonHeaders(token),
      tags: { endpoint: "matches_create", action: liked ? "like" : "dismiss" },
    }
  );

  check(res, {
    "match write ok": (response) => response.status === 200 || response.status === 201,
  });

  return res;
}

function loadMatches(token) {
  const res = http.get(`${BASE_URL}/api/matches/tenant?page=1&limit=20`, {
    ...jsonHeaders(token),
    tags: { endpoint: "matches_tenant" },
  });

  check(res, {
    "matches list ok": (response) => response.status === 200,
  });

  return res;
}

function startChat(token, propertyId) {
  const res = http.post(
    `${BASE_URL}/api/chat/start`,
    JSON.stringify({ propertyId }),
    {
      ...jsonHeaders(token),
      tags: { endpoint: "chat_start" },
    }
  );

  check(res, {
    "chat start ok": (response) => response.status === 200 || response.status === 201,
  });

  return res;
}

function loadConversations(token) {
  const res = http.get(`${BASE_URL}/api/chat/conversations?limit=20&offset=0`, {
    ...jsonHeaders(token),
    tags: { endpoint: "chat_conversations" },
  });

  check(res, {
    "conversation list ok": (response) => response.status === 200,
  });

  return res;
}

export default function () {
  const token = getAuthToken();

  const exploreRes = http.get(
    `${BASE_URL}/api/properties/explore?limit=${EXPLORE_LIMIT}`,
    {
      ...jsonHeaders(token),
      tags: { endpoint: "properties_explore" },
    }
  );

  check(exploreRes, {
    "explore ok": (res) => res.status === 200,
  });

  const listings = normalizeExploreItems(exploreRes)
    .map(propertyIdFromItem)
    .filter(Boolean);

  if (!listings.length) {
    sleep(randomThinkTime());
    return;
  }

  const likedListingIds = [];
  const swipeCount = Math.min(SWIPES_PER_USER, listings.length);

  for (let i = 0; i < swipeCount; i += 1) {
    const propertyId = listings[i];
    const liked = Math.random() >= 0.45;
    swipeListing(token, propertyId, liked);

    if (liked) {
      likedListingIds.push(propertyId);
    }

    sleep(randomThinkTime());
  }

  loadMatches(token);

  if (ENABLE_CHAT_START && likedListingIds.length > 0) {
    const propertyId =
      likedListingIds[Math.floor(Math.random() * likedListingIds.length)];
    startChat(token, propertyId);
    loadConversations(token);
  }
}
