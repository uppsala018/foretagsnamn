import http from "node:http";

const SANDBOX_URL = "https://api.sandbox.namecheap.com/xml.response";
const PRODUCTION_URL = "https://api.namecheap.com/xml.response";
const MAX_BODY_BYTES = 16 * 1024;

function readConfig() {
  const config = {
    apiUser: process.env.NAMECHEAP_API_USER,
    apiKey: process.env.NAMECHEAP_API_KEY,
    username: process.env.NAMECHEAP_USERNAME,
    clientIp: process.env.NAMECHEAP_CLIENT_IP,
    proxySecret: process.env.NAMECHEAP_PROXY_SECRET,
    sandbox: process.env.NAMECHEAP_SANDBOX !== "false",
  };

  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "sandbox" && !value)
    .map(([key]) => key);

  return { config, missing };
}

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
        reject(new Error("Request body too large."));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function decodeXmlText(value) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseAttributes(attributeText) {
  const attributes = {};
  const attributePattern = /([A-Za-z0-9_:-]+)="([^"]*)"/g;

  for (const match of attributeText.matchAll(attributePattern)) {
    attributes[match[1]] = match[2];
  }

  return attributes;
}

function readPremiumPrice(attributes, key) {
  const value = attributes[key];
  return value && value !== "0" ? value : undefined;
}

function parseNamecheapDomainsCheckResponse(xml) {
  const errors = [...xml.matchAll(/<Error\b[^>]*>([\s\S]*?)<\/Error>/g)].map((match) =>
    decodeXmlText(match[1].trim()),
  );

  const domains = [...xml.matchAll(/<DomainCheckResult\b([^>]*)\/?>/g)]
    .map((match) => {
      const attributes = parseAttributes(match[1]);

      return {
        domain: attributes.Domain ?? "",
        available: attributes.Available === "true",
        isPremiumName: attributes.IsPremiumName
          ? attributes.IsPremiumName === "true"
          : undefined,
        premiumRegistrationPrice: readPremiumPrice(attributes, "PremiumRegistrationPrice"),
        premiumRenewalPrice: readPremiumPrice(attributes, "PremiumRenewalPrice"),
      };
    })
    .filter((result) => result.domain.length > 0);

  return { domains, errors };
}

function normalizeDomains(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((domain) => typeof domain === "string")
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => /^[a-z0-9.-]{1,253}$/.test(domain))
    .slice(0, 20);
}

async function callNamecheap(domains, config) {
  const endpoint = config.sandbox ? SANDBOX_URL : PRODUCTION_URL;
  const params = new URLSearchParams({
    ApiUser: config.apiUser,
    ApiKey: config.apiKey,
    UserName: config.username,
    ClientIp: config.clientIp,
    Command: "namecheap.domains.check",
    DomainList: domains.join(","),
  });

  const response = await fetch(`${endpoint}?${params.toString()}`, {
    cache: "no-store",
  });
  const xml = await response.text();
  const parsed = parseNamecheapDomainsCheckResponse(xml);

  if (!response.ok) {
    return {
      statusCode: response.status,
      payload: {
        domains: [],
        errors: [`Namecheap HTTP status ${response.status}.`],
      },
    };
  }

  return {
    statusCode: parsed.errors.length > 0 ? 502 : 200,
    payload: parsed,
  };
}

async function handleNamecheapCheck(request, response) {
  const { config, missing } = readConfig();

  if (missing.length > 0) {
    jsonResponse(response, 500, {
      domains: [],
      errors: [`Proxy configuration missing: ${missing.join(", ")}`],
    });
    return;
  }

  if (request.headers["x-proxy-secret"] !== config.proxySecret) {
    jsonResponse(response, 401, {
      domains: [],
      errors: ["Unauthorized proxy request."],
    });
    return;
  }

  let payload;

  try {
    payload = JSON.parse(await readRequestBody(request));
  } catch {
    jsonResponse(response, 400, {
      domains: [],
      errors: ["Invalid JSON body."],
    });
    return;
  }

  const domains = normalizeDomains(payload.domains);

  if (domains.length === 0) {
    jsonResponse(response, 400, {
      domains: [],
      errors: ["No valid domains supplied."],
    });
    return;
  }

  try {
    const result = await callNamecheap(domains, config);
    jsonResponse(response, result.statusCode, result.payload);
  } catch (error) {
    jsonResponse(response, 502, {
      domains: [],
      errors: [error instanceof Error ? error.message : "Unknown Namecheap proxy error."],
    });
  }
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/health") {
    const { missing } = readConfig();
    jsonResponse(response, missing.length > 0 ? 500 : 200, {
      ok: missing.length === 0,
      missing,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/namecheap/check") {
    void handleNamecheapCheck(request, response);
    return;
  }

  jsonResponse(response, 404, {
    domains: [],
    errors: ["Not found."],
  });
});

const port = Number(process.env.PORT ?? 8787);
server.listen(port, "0.0.0.0", () => {
  console.log(`Namecheap proxy listening on 0.0.0.0:${port}`);
});
