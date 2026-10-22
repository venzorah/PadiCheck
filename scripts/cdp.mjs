// Local browser automation helper. Never log request bodies or credential values.
export async function connectPage(targetId, onEvent = () => {}) {
  const debug = process.env.BROWSER_DEBUG_ORIGIN || 'http://127.0.0.1:9227';
  const target = targetId
    ? (await (await fetch(debug + '/json/list')).json()).find(page => page.id === targetId)
    : await (await fetch(debug + '/json/new?about:blank', { method: 'PUT' })).json();
  if (!target) throw new Error('Test browser page is unavailable.');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let next = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id) { onEvent(message); return; }
    const job = pending.get(message.id);
    pending.delete(message.id);
    message.error ? job?.reject(new Error(message.error.message)) : job?.resolve(message.result);
  };
  socket.onclose = () => {
    for (const job of pending.values()) job.reject(new Error('Test browser connection closed.'));
    pending.clear();
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++next;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Browser command timed out: ' + method)); }, 30000);
    pending.set(id, {
      resolve: result => { clearTimeout(timer); resolve(result); },
      reject: error => { clearTimeout(timer); reject(error); },
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error('Browser evaluation failed.');
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 150; attempt++) {
      try { if (await evaluate(expression)) return; } catch { /* Navigation resets the context. */ }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error('Timed out waiting for browser state.');
  };
  await call('Runtime.enable');
  await call('Page.enable');
  return { id: target.id, call, evaluate, waitFor, disconnect: () => socket.close() };
}
