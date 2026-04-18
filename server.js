const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const messagesPath = path.join(dataDir, "messages.json");

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
