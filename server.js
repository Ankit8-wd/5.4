const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { URL } = require("url");
const APIClient = require("./apiClient");

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const messagesPath = path.join(dataDir, "messages.json");

// Initialize API clients for external services
const jsonPlaceholderAPI = new APIClient("https://jsonplaceholder.typicode.com", 5000);
const publicAPIs = {
  jsonplaceholder: jsonPlaceholderAPI
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

async function ensureDataStore() {
  await fsp.mkdir(dataDir, { recursive: true });

  try {
    await fsp.access(messagesPath);
  } catch {
    await fsp.writeFile(messagesPath, "[]", "utf8");
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readMessages() {
  const raw = await fsp.readFile(messagesPath, "utf8");
  return JSON.parse(raw);
}

async function writeMessages(messages) {
  await fsp.writeFile(messagesPath, JSON.stringify(messages, null, 2), "utf8");
}

function normalizeMessage(payload) {
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const message = String(payload.message || "").trim();

  if (!name || !email || !message) {
    return { error: "Please complete all fields." };
  }

  if (!email.includes("@")) {
    return { error: "Please provide a valid email address." };
  }

  return {
    record: {
      id: Date.now(),
      name,
      email,
      message,
      createdAt: new Date().toISOString()
    }
  };
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, {
      status: "ok",
      uptimeSeconds: Math.round(process.uptime())
    });
  }

  // Serve the apiClient.js file to clients
  if (url.pathname === "/api/client" && req.method === "GET") {
    try {
      const clientCode = await fsp.readFile(path.join(__dirname, "apiClient.js"), "utf8");
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8"
      });
      res.end(clientCode);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to load API client" });
    }
  }

  // Proxy endpoint: Make external API requests through the server
  if (url.pathname === "/api/proxy" && req.method === "POST") {
    let payload;
    try {
      payload = JSON.parse(await readRequestBody(req));
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON payload." });
    }

    const { service, endpoint, method = "GET", data = null } = payload;

    if (!service || !endpoint) {
      return sendJson(res, 400, { error: "Missing required fields: service, endpoint" });
    }

    const api = publicAPIs[service];
    if (!api) {
      return sendJson(res, 400, { error: `Service '${service}' not available.` });
    }

    try {
      let result;
      switch (method.toUpperCase()) {
        case "POST":
          result = await api.post(endpoint, data);
          break;
        case "PUT":
          result = await api.put(endpoint, data);
          break;
        case "DELETE":
          result = await api.delete(endpoint);
          break;
        case "GET":
        default:
          result = await api.get(endpoint);
      }
      return sendJson(res, 200, { success: true, data: result });
    } catch (error) {
      return sendJson(res, 500, {
        success: false,
        error: error.message,
        status: error.response?.status
      });
    }
  }

  // Example endpoint: Fetch external data using apiClient
  if (url.pathname === "/api/external/users" && req.method === "GET") {
    try {
      const users = await jsonPlaceholderAPI.get("/users?_limit=5");
      return sendJson(res, 200, { 
        message: "Users fetched from JSONPlaceholder API",
        users 
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to fetch users",
        details: error.message
      });
    }
  }

  if (url.pathname === "/api/messages" && req.method === "GET") {
    const messages = await readMessages();
    return sendJson(res, 200, { messages });
  }

  if (url.pathname === "/api/messages" && req.method === "POST") {
    let payload;

    try {
      payload = JSON.parse(await readRequestBody(req));
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON payload." });
    }

    const result = normalizeMessage(payload);

    if (result.error) {
      return sendJson(res, 400, { error: result.error });
    }

    const messages = await readMessages();
    messages.unshift(result.record);
    await writeMessages(messages);

    return sendJson(res, 201, {
      message: "Thanks, your message has been saved.",
      submission: result.record
    });
  }

  return sendJson(res, 404, { error: "API route not found." });
}

async function serveStaticFile(req, res, url) {
  let requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  requestedPath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, "");

  const filePath = path.join(publicDir, requestedPath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const stats = await fsp.stat(filePath);
    const finalPath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const ext = path.extname(finalPath).toLowerCase();

    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream"
    });

    fs.createReadStream(finalPath).pipe(res);
  } catch {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    res.end("Not found");
  }
}

async function requestListener(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    await serveStaticFile(req, res, url);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error." });
  }
}

async function start() {
  await ensureDataStore();

  const server = http.createServer(requestListener);

  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start();
