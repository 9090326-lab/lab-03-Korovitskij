export class SocketWrapper {
  constructor(url) {
    this.url = url;
    this.queue = [];
    this.reconnectAttempt = 0;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected to WebSocket server');
      this.reconnectAttempt = 0;
      
      // Відправляємо все, що накопичилося в черзі, поки не було зв'язку
      while (this.queue.length > 0 && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(this.queue.shift());
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected. Reconnecting...');
      // Експоненційний відступ для паузи перед перепідключенням
      const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30000);
      this.reconnectAttempt++;
      setTimeout(() => this.connect(), timeout);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  send(data) {
    const stringData = JSON.stringify(data);
    // Перевіряємо буфер (backpressure), щоб не перевантажувати клієнт
    if (this.ws.readyState === WebSocket.OPEN && this.ws.bufferedAmount === 0) {
      this.ws.send(stringData);
    } else {
      this.queue.push(stringData);
    }
  }
}