/// <reference types="node" />
import { EventEmitter } from "events";
import { Server, IncomingMessage, ServerResponse } from "http";
import { Duplex } from "stream";
export interface WebSocketOptions {
    server?: Server;
    secure?: boolean;
    cert?: string | Buffer;
    key?: string | Buffer;
    verbose?: boolean;
}
export default class Websocket extends EventEmitter {
    protected _server: Server;
    protected _verbose: boolean;
    static WSS_EVENTS: {
        CONNECTION: string;
        DISCONNECT: string;
        DATA: string;
        REQUEST: string;
    };
    id: string;
    sockets: Map<string, Duplex>;
    /**
     * Create a new Websocket instance.
     * Wrap server and listen for upgrade event.
     * If a server instance is provided, secure field is ignored.
     * If secure is true, then provide public and private key.
     * If none RSA keys are provided then a predefined keys will
     * be used. WARNING: THIS IS VERY UNSECURE.
     * @param {WebSocketOptions} opts
     * @param {Server} [opts.server] HTTP/S Server instance
     * @param {boolean} [opts.secure] Use HTTPS Server
     */
    constructor(opts?: WebSocketOptions);
    send(socket: Duplex, data: Buffer): void;
    listen(port: number, cb: (port: number) => void): void;
    protected _wrapServer(): void;
    protected _onUpgrade(req: IncomingMessage, socket: Duplex): void;
    protected _onEnd(id: string): void;
    protected _onError(id: string, err: Error): void;
    protected _onClose(id: string): void;
    protected _onData(socket: Duplex, buffer: Buffer): void;
    protected _cleanUp(id: string): void;
    protected _parseData(buffer: Buffer, socket: Duplex): Buffer;
    protected _constructData(data: Buffer): Buffer;
    protected _generateAcceptKey(key: string): string;
    protected _onRequest(req: IncomingMessage, res: ServerResponse): void;
}
