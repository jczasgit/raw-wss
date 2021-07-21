/// <reference types="node" />
import EventEmitter from "events";
import { TLSSocket, TlsOptions } from "tls";
import { ClientRequest, IncomingMessage } from "http";
import { RequestOptions as TlsRequestOptions } from "https";
import { Socket } from "net";
export interface WebsocketClientOption {
    tlsOptions?: TlsOptions;
}
export declare class WebsocketClient extends EventEmitter {
    protected _socket: Socket | TLSSocket;
    protected _url: string;
    protected _secure: boolean;
    protected _req: ClientRequest;
    protected _res: IncomingMessage;
    protected _tlsOptions: TlsOptions;
    protected _firstDataChunk: Buffer;
    protected _base64nonce: string;
    readonly id: string;
    readonly defaultPorts: {
        "ws:": string;
        "wss:": string;
    };
    constructor(opts?: WebsocketClientOption);
    get req(): ClientRequest;
    get res(): IncomingMessage;
    get socket(): Socket | TLSSocket;
    send(data: Buffer): void;
    close(): void;
    connect(url: string, tlsRequestOptions?: TlsRequestOptions): this;
    protected _onUpgrade(res: IncomingMessage, socket: Socket | TLSSocket, head: Buffer): void;
    protected _onError(err: Error): void;
    protected _onResponse(res: IncomingMessage): void;
    protected _failHandshake(reason: string): void;
    protected _wrapSocket(): void;
    protected _onClose(): void;
    protected _onData(data: Buffer): void;
    protected _parseData(buffer: Buffer): Buffer;
    protected _constructCloseFrame(): Buffer;
    protected _constructData(data: Buffer): Buffer;
    protected _validateHandshake(): void;
    on(evt: "connect", cb: () => void): this;
    on(evt: "connect-fail", cb: (err: Error) => void): this;
    on(evt: "disconnect", cb: (reason: string) => void): this;
    on(evt: "data", cb: (data: Buffer) => void): this;
    on(evt: string | symbol, cb: (...args: any[]) => void): this;
    once(evt: "connect", cb: () => void): this;
    once(evt: "connect-fail", cb: (err: Error) => void): this;
    once(evt: "disconnect", cb: (reason: string) => void): this;
    once(evt: "data", cb: (data: Buffer) => void): this;
    once(evt: string | symbol, cb: (...args: any[]) => void): this;
    emit(evt: "connect"): boolean;
    emit(evt: "connect-fail", err: Error): boolean;
    emit(evt: "disconnect", reason: string): boolean;
    emit(evt: "data", data: Buffer): boolean;
    emit(evt: string | symbol, ...args: any[]): boolean;
}
