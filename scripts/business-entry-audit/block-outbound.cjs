// Loaded only by the isolated audit runner. Never imported by the application.
const local = (input) => {
  const value =
    input instanceof URL
      ? input
      : new URL(typeof input === "string" ? input : input.url);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(value.hostname))
    throw new Error("Audit blocked external HTTP communication");
};
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, ...args) => {
  local(input);
  return originalFetch(input, ...args);
};
for (const name of ["node:http", "node:https"]) {
  const transport = process.getBuiltinModule(name),
    request = transport.request;
  transport.request = function (input, ...args) {
    if (typeof input === "string" || input instanceof URL) local(input);
    else if (
      !["127.0.0.1", "localhost", "::1"].includes(
        (input.hostname || input.host || "localhost").split(":")[0],
      )
    )
      throw new Error("Audit blocked external HTTP communication");
    return request.call(this, input, ...args);
  };
  transport.get = function (...args) {
    const req = transport.request(...args);
    req.end();
    return req;
  };
}
