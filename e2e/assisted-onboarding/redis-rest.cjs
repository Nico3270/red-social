const http = require("node:http");
const net = require("node:net");
function parse(buf, off = 0) {
  const e = buf.indexOf("\r\n", off);
  if (e < 0) return;
  const tag = String.fromCharCode(buf[off]),
    val = buf.subarray(off + 1, e).toString();
  let pos = e + 2;
  if (tag === "+" || tag === "-")
    return [tag === "-" ? new Error(val) : val, pos];
  if (tag === ":") return [Number(val), pos];
  if (tag === "$") {
    const n = Number(val);
    if (n < 0) return [null, pos];
    if (buf.length < pos + n + 2) return;
    return [buf.subarray(pos, pos + n).toString(), pos + n + 2];
  }
  if (tag === "*") {
    const list = [];
    for (let i = 0; i < Number(val); i++) {
      const p = parse(buf, pos);
      if (!p) return;
      list.push(p[0]);
      pos = p[1];
    }
    return [list, pos];
  }
}
function command(args) {
  return new Promise((resolve, reject) => {
    const s = net.connect(16446, "127.0.0.1");
    let b = Buffer.alloc(0);
    s.on("connect", () =>
      s.write(
        "*" +
          args.length +
          "\r\n" +
          args
            .map((a) => {
              const v = String(a);
              return "$" + Buffer.byteLength(v) + "\r\n" + v + "\r\n";
            })
            .join(""),
      ),
    );
    s.on("error", reject);
    s.on("data", (c) => {
      b = Buffer.concat([b, c]);
      const p = parse(b);
      if (p) {
        s.end();
        p[0] instanceof Error ? reject(p[0]) : resolve(p[0]);
      }
    });
  });
}
const encode = (v) =>
  typeof v === "string"
    ? Buffer.from(v).toString("base64")
    : Array.isArray(v)
      ? v.map(encode)
      : v;
http
  .createServer(async (req, res) => {
    try {
      let raw = "";
      for await (const c of req) raw += c;
      const body = JSON.parse(raw);
      const result = async (cmd) => {
        try {
          const v = await command(cmd);
          return {
            result:
              req.headers["upstash-encoding"] === "base64" ? encode(v) : v,
          };
        } catch (error) {
          return { error: error.message };
        }
      };
      const output = req.url.includes("pipeline")
        ? await Promise.all(body.map(result))
        : await result(body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(output));
    } catch {
      res.writeHead(500);
      res.end("{}");
    }
  })
  .listen(16447, "127.0.0.1", () =>
    process.stdout.write("Isolated Redis REST ready\n"),
  );
