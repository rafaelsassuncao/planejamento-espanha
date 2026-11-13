// Roda todos os testes: node tests/run.mjs (precisa de Python 3 e Google Chrome instalados)
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connect, wait } from "./cdp.mjs";
import { OLD, current } from "./fixtures.mjs";
const dir = path.dirname(fileURLToPath(import.meta.url)),
  root = path.join(dir, ".."),
  PORT = 8765,
  DBG = 9333,
  URL = `http://localhost:${PORT}/`,
  profile = fs.mkdtempSync("/tmp/rumo-teste-");
const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: root, stdio: "ignore" });
const chrome = spawn(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  [
    "--headless=new",
    "--disable-gpu",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${DBG}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);
const done = (code) => {
  server.kill();
  chrome.kill();
  process.exit(code);
};
let failed = 0;
const report = (title, lines) => {
  console.log(`\n== ${title} ==\n${lines.join("\n")}`);
  failed += lines.filter((l) => l.startsWith("FAIL") || l.startsWith("ERROR")).length;
};
try {
  await wait(1500);
  const b = await connect(DBG, path.join(dir, "mock"));
  // Abre o app com a nuvem simulada contendo dados no formato antigo
  const start = async (cloud, local) => {
    await b.open(URL);
    await b.ev(
      `localStorage.clear(); ${local ? `localStorage.setItem("espanha-assuncao-v1", ${JSON.stringify(JSON.stringify(local))});` : ""}`,
    );
    await b.open(URL);
    await b.ev(`__mock.setServer(${JSON.stringify(cloud)}); __mock.fire(__mock.server, false)`);
    await wait(800);
  };

  // 1. Funcionamento
  await b.size(1440, 900);
  await start(OLD);
  const out = await b.ev(fs.readFileSync(path.join(dir, "app.test.js"), "utf8"));
  report("Funcionamento", (out || "ERROR sem resultado").split("\n").filter(Boolean));

  // 2. Sincronização (cópia antiga, conflito, salvamentos seguidos, sem internet)
  const s = [];
  const ok = (n, c, d = "") => s.push(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  -> " + JSON.stringify(d)}`);
  await b.open(URL);
  await b.ev(
    `localStorage.clear(); localStorage.setItem("espanha-assuncao-v1", ${JSON.stringify(JSON.stringify(current(3, [0, 0])))})`,
  );
  await b.open(URL);
  await b.ev(
    `__mock.setServer(${JSON.stringify(current(5, [50, 900]))}); __mock.fire(${JSON.stringify(current(3, [0, 0]))}, true)`,
  );
  await wait(300);
  ok("cópia antiga do aparelho não sobe para a nuvem", await b.ev("__mock.writes === 0"));
  await b.ev("__mock.fire(__mock.server, false)");
  await wait(2000);
  const s1 = await b.ev(
    "JSON.stringify({w: __mock.writes, srv: __mock.server.tasks.map((t) => t.value), local: data.tasks.map((t) => t.value)})",
  );
  ok(
    "nuvem preservada e aparelho atualizado",
    s1 === JSON.stringify({ w: 0, srv: [50, 900], local: [50, 900] }),
    s1,
  );
  await b.ev("data.tasks[0].value = 60; save();");
  await wait(400);
  ok(
    "edição salva com nova versão",
    await b.ev("__mock.server.tasks[0].value === 60 && __mock.server.rev === 6"),
  );
  await b.ev(
    "const o = JSON.parse(JSON.stringify(__mock.server)); o.rev = 7; o.tasks[1].value = 1000; __mock.setServer(o); data.tasks[0].value = 70; save();",
  );
  await wait(600);
  ok(
    "não sobrescreve alteração de outro aparelho",
    await b.ev(
      "__mock.server.tasks[0].value === 60 && __mock.server.tasks[1].value === 1000 && data.tasks[1].value === 1000",
    ),
  );
  await b.ev("for (let i = 1; i <= 5; i++) { data.tasks[0].value = 100 + i; save(); }");
  await wait(1200);
  ok(
    "salvamentos seguidos terminam no último valor",
    await b.ev("__mock.server.tasks[0].value === 105 && data.rev === __mock.server.rev"),
  );
  await b.ev(
    `localStorage.setItem("espanha-assuncao-v1", ${JSON.stringify(JSON.stringify(current(10, [1, 2])))}); localStorage.removeItem("espanha-assuncao-v1-pendente")`,
  );
  await b.open(URL);
  await b.ev(`__mock.setServer(${JSON.stringify(current(10, [1, 2]))}); data.tasks[0].value = 55; save();`);
  await wait(300);
  ok("sem resposta do servidor, nada é enviado", await b.ev("__mock.writes === 0"));
  await b.ev("__mock.fire(__mock.server, false)");
  await wait(1200);
  ok(
    "edição feita offline é enviada quando a nuvem responde",
    await b.ev("__mock.server.tasks[0].value === 55 && __mock.server.rev === 11"),
  );
  report("Sincronização", s);

  // 3. Telas: nada passa da largura (celular e computador)
  const audit = `(() => {
    const W = document.documentElement.clientWidth, bad = [];
    if (document.documentElement.scrollWidth > W + 1) bad.push("página rola para o lado: " + document.documentElement.scrollWidth);
    const scope = document.querySelector("#modal").open ? document.querySelector("#modal") : document.body;
    scope.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > W + 1 && !el.closest("nav") && !el.closest(".tasks-wrap") && !el.closest(".tablewrap")) bad.push("passa da tela: " + el.tagName + "." + el.className);
    });
    return [...new Set(bad)].slice(0, 5).join("; ");
  })()`;
  await start(OLD);
  await b.ev(fs.readFileSync(path.join(dir, "app.test.js"), "utf8"));
  await b.ev(`window.toast = () => {}; document.querySelector("#toast").hidePopover?.()`);
  const views = {
    "visão geral": `go("overview")`,
    pendências: `go("tasks"); filter = "Todos"; render()`,
    "pendências com etapas abertas": `go("tasks"); filter = "Todos"; openSteps.add(data.tasks.find((t) => t.steps.length).id); render()`,
    entradas: `go("income")`,
    ajustes: `go("settings")`,
    "editar pendência": `go("tasks"); editTask(data.tasks.find((t) => t.title === "Atestado médico").id)`,
    pagamento: `go("tasks"); editPayment(data.tasks.find((t) => t.title === "Notebook").id)`,
    "configurar pasta": `go("overview"); editFolder()`,
  };
  const t = [];
  for (const [w, mobile] of [
    [360, true],
    [390, true],
    [430, true],
    [1024, false],
    [1280, false],
    [1440, false],
  ]) {
    await b.size(w, 800, mobile);
    for (const [name, js] of Object.entries(views)) {
      await b.ev(`$("#modal").open && $("#modal").close(); { ${js} } scrollTo(0, 0)`);
      await wait(150);
      // Espera os movimentos de entrada (painel deslizando, cascata) terminarem; o fundo animado não para
      await b.ev(
        `Promise.race([new Promise((r) => setTimeout(r, 1500)), Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})))])`,
      );
      const r = await b.ev(audit);
      t.push(`${r ? "FAIL" : "PASS"}  ${w}px ${name}${r ? "  -> " + r : ""}`);
    }
  }
  report("Telas", t);
  if (b.errors.length)
    report(
      "Erros de JavaScript",
      b.errors.map((e) => "ERROR " + e.split("\n")[0]),
    );
  const total = [];
  console.log(`\n${failed ? `❌ ${failed} problema(s)` : "✅ Tudo certo"}`);
  done(failed ? 1 : 0);
} catch (e) {
  console.error(e);
  done(1);
}
