interface Env {
	ROOMS: DurableObjectNamespace;
}

export class SyncRoom {
	private state: DurableObjectState;

	constructor(state: DurableObjectState) {
		this.state = state;
	}

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get('Upgrade') !== 'websocket') {
			return new Response('Expected WebSocket', { status: 426 });
		}

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		this.state.acceptWebSocket(server);
		return new Response(null, { status: 101, webSocket: client });
	}

	webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		const peers = this.state.getWebSockets();
		for (const peer of peers) {
			if (peer !== ws) {
				peer.send(typeof message === 'string' ? message : new TextDecoder().decode(message));
			}
		}
	}

	webSocketClose(ws: WebSocket) {
		const peers = this.state.getWebSockets();
		for (const peer of peers) {
			if (peer !== ws) {
				try {
					peer.send(JSON.stringify({ type: 'peer-disconnected' }));
				} catch {}
			}
		}
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': '*',
				},
			});
		}

		const match = url.pathname.match(/^\/room\/([a-zA-Z0-9]+)$/);
		if (!match) {
			return new Response('Not found', { status: 404 });
		}

		const roomId = match[1];
		const id = env.ROOMS.idFromName(roomId);
		const room = env.ROOMS.get(id);

		const res = await room.fetch(request);
		const response = new Response(res.body, res);
		response.headers.set('Access-Control-Allow-Origin', '*');
		return response;
	},
};
