// Utilitário mínimo para controlar o Chrome sem janela pelo protocolo de depuração
import fs from "fs";
import path from "path";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export { wait };
export async function connect(port, mockDir) {
  let t;
  for (let i = 0; i < 60; i++) {
    try {
      t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === "page");
      if (t) break;
    } catch {}
    await wait(250);
  }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = {},
    errors = [];
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      pending[i] = r;
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending[m.id]) pending[m.id](m.result);
    if (m.method === "Fetch.requestPaused") {
      const body = fs.readFileSync(path.join(mockDir, m.params.request.url.split("/").pop()));
      send("Fetch.fulfillRequest", {
        requestId: m.params.requestId,
        responseCode: 200,
        responseHeaders: [
          { name: "Content-Type", value: "application/javascript" },
          { name: "Access-Control-Allow-Origin", value: "*" },
        ],
        body: body.toString("base64"),
      });
    }
    if (m.method === "Runtime.exceptionThrown")
      errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*gstatic.com/firebasejs*" }] });
  const ev = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails)
      errors.push("EVAL: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value;
  };
  const size = (width, height, mobile = false) =>
    send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  const shot = async (file) => {
    const s = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(file, Buffer.from(s.data, "base64"));
  };
  const open = async (url) => {
    await send("Page.navigate", { url });
    await wait(1500);
  };
  return { send, ev, size, shot, open, errors };
}
