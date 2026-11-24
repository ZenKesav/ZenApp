// WebSocket bridge to Windows Local Hardware Agent (C#/Python)
export class LocalAgentDriver {
  constructor(url = 'ws://127.0.0.1:9876') {
    this.url = url;
    this.ws = null;
  }
  connect(onMessage, onOpen) {
    this.ws = new WebSocket(this.url);
    if (onOpen) this.ws.onopen = onOpen;
    if (onMessage) this.ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  }
  send(command, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ command, payload }));
    }
  }
}
