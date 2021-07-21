"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketClient = void 0;
// todo: declare on and emit methods overloads
const events_1 = __importDefault(require("events"));
const nanoid_1 = require("nanoid");
const http_1 = require("http"); // prettier-ignore
const https_1 = require("https"); // prettier-ignore
const url_1 = require("url");
const crypto_1 = require("crypto");
const utils_1 = require("./utils");
class WebsocketClient extends events_1.default {
    constructor(opts = {}) {
        var _a;
        super();
        this.id = nanoid_1.nanoid();
        this.defaultPorts = {
            "ws:": "80",
            "wss:": "443",
        };
        this._tlsOptions = (_a = opts.tlsOptions) !== null && _a !== void 0 ? _a : {
            requestCert: true,
            rejectUnauthorized: false,
        };
        this._socket = null; // a value will be given when connect method is called
        this._req = null;
        this._res = null;
        this._firstDataChunk = null;
        this._base64nonce = null;
    }
    get req() { return this._req; } // prettier-ignore
    get res() { return this._res; } // prettier-ignore
    get socket() { return this._socket; } // prettier-ignore
    send(data) {
        if (this._socket && !this._socket.destroyed) {
            this._socket.write(this._constructData(data));
        }
    }
    close() {
        if (this._socket && !this._socket.destroyed) {
            this._socket.end(this._constructCloseFrame());
        }
    }
    connect(url, tlsRequestOptions) {
        let _url = new url_1.URL(url);
        if (!_url.protocol)
            throw new Error("Must specify a valid WebSocket URL that includes the procotol");
        if (!_url.hostname)
            throw new Error("Must specify a full WebSocket URL that includes hostname. Relative URLs are not supported");
        this._secure = _url.protocol === "wss:";
        if (!_url.port) {
            _url.port = this.defaultPorts[_url.protocol];
        }
        this._url = `${_url.protocol}//${_url.hostname}:${_url.port}${_url.pathname}`;
        let nonce = Buffer.allocUnsafe(16);
        for (let i = 0; i < 16; i++)
            nonce[i] = Math.round(Math.random() * 0xff);
        this._base64nonce = nonce.toString("base64");
        nonce = null;
        let reqHeaders = {
            Upgrade: "websocket",
            Connection: "Upgrade",
            "Sec-WebSocket-Version": "13",
            "Sec-WebSocket-Key": this._base64nonce,
        };
        let reqOptions = {
            hostname: _url.hostname,
            path: _url.pathname,
            port: _url.port,
            headers: reqHeaders,
            method: "GET",
        };
        if (this._secure) {
            utils_1.extend(reqOptions, tlsRequestOptions !== null && tlsRequestOptions !== void 0 ? tlsRequestOptions : this._tlsOptions);
        }
        this._req = (this._secure ? https_1.request : http_1.request)(reqOptions);
        this._req.once("upgrade", this._onUpgrade.bind(this));
        this._req.once("error", this._onError.bind(this));
        this._req.on("response", this._onResponse.bind(this));
        this._req.end();
        return this;
    }
    _onUpgrade(res, socket, head) {
        this._req.removeAllListeners("error");
        this._req = null;
        this._socket = socket;
        this._res = res;
        this._firstDataChunk = head;
        this._validateHandshake();
    }
    _onError(err) {
        this._req = null;
        this.emit("connect-fail", err);
    }
    _onResponse(res) {
        this._req = null;
        let headers = [];
        for (let key in res.headers)
            headers.push(`${key}:${res.headers[key]}`);
        this._failHandshake("Server responded with non-101 status: " +
            res.statusCode +
            " " +
            res.statusMessage +
            "\nResponse Headers Follow:\n" +
            headers.join("\n") +
            "\n");
        headers = null;
    }
    _failHandshake(reason) {
        if (this._socket && this._socket.writable) {
            this._socket.end();
        }
        this.emit("connect-fail", new Error(reason));
    }
    _wrapSocket() {
        this._socket.on("data", this._onData.bind(this));
        this._socket.once("close", this._onClose.bind(this));
    }
    _onClose() {
        this._socket.removeAllListeners();
        this._socket.destroy();
        this._socket = null;
        this.emit("disconnect", "Connection closed");
    }
    _onData(data) {
        data = this._parseData(data);
        if (data)
            this.emit("data", data);
    }
    _parseData(buffer) {
        // initial 2 byte header
        // -------------------------------------
        //              first byte
        // -------------------------------------
        //      0      |     000      |  0000  |
        // last frame?  reserved flags  Opcode
        // -------------------------------------
        //             second byte
        // -------------------------------------
        //    0     | 0000000 (0-125|126|127)  |
        //  masked?      payload length
        // -------------------------------------
        let firstByte = buffer.readUInt8(0);
        // 0x1 -> 00000001
        // Right shift the first 8 bits will leave one significant
        // bit at the very right. Checking with the AND operator
        // will make sure to grab the correct first bit of the first byte from
        // buffer. Double !! to make sure it is a boolean.
        // let isFinalFrame = !!((firstByte >>> 7) & 0x1);
        // There are three reserved bits for each payload from the client
        // for now just ignore their meanig.
        // let reservedBits = [
        //     Boolean((firstByte >>> 6) & 0x1),
        //     Boolean((firstByte >>> 5) & 0x1),
        //     Boolean((firstByte >>> 4) & 0x1),
        // ];
        // Opcode: 4 bits
        // Defines the interpretation of the “Payload data”. If an unknown
        // opcode is received, the receiving endpoint MUST Fail the
        // WebSocket Connection. The following values are defined.
        // 0xf -> 00001111
        let opCode = firstByte & 0xf;
        // 0x8 = connection close
        if (opCode === 0x8) {
            this.emit("disconnect", "Connection closed");
            this._socket.end();
            return;
        }
        let secondByte = buffer.readUInt8(1);
        let isMasked = Boolean((secondByte >>> 7) & 0x1);
        let maskingKey;
        // the offset is 2 because we have taken two bytes out of the
        // client payload.
        let offset = 2;
        let payloadLength = secondByte & 0x7f; // 0x7f -> 01111111
        // 0x7d = 125
        if (payloadLength > 125) {
            if (payloadLength === 126) {
                // only two extra bytes.
                // possible length 126 - 65535 bytes
                // which is more than enought
                payloadLength = buffer.readUInt16BE(offset);
                // since the payload length is defined in extra 2 bytes,
                // the actual data is offset by two more bytes.
                offset += 2;
            }
            else {
                // 127 (0x7f)
                // meaning the payload length needs 64 bits to represent.
                // this should never be the case, since 64 bits is too big
                // for native int in js to represent. It will need BigInt.
                // just throw error indicating an exceed of payload length.
                // note: this will get a hold for the extra 64 bits
                // let all64 = buffer.readBigUInt64BE(offset);
                // let first32 = buffer.readUInt32BE(offset);
                // let second32 = buffer.readUInt32BE(offset + 4);
                // offset += 4;
                throw new Error("Payload limit reached.");
            }
        }
        if (isMasked) {
            maskingKey = buffer.readUInt32BE(offset);
            offset += 4;
        }
        // since all the allocated space will be filled,
        // security leaks will not be a problem.
        // using allocUnsafe will be a lot more faster.
        let data = Buffer.allocUnsafe(payloadLength);
        if (isMasked) {
            for (let i = 0, j = 0; i < payloadLength; ++i, j = i % 4) {
                let shift = j == 3 ? 0 : (3 - j) << 3;
                let mask = (shift == 0 ? maskingKey : maskingKey >>> shift) & 0xff;
                let source = buffer.readUInt8(offset++);
                data.writeUInt8(mask ^ source, i);
                shift = null;
                mask = null;
                source = null;
            }
        }
        else {
            buffer.copy(data, 0, offset++);
        }
        // just in case the GC does not do its job properly.
        isMasked = null;
        firstByte = null;
        buffer = null;
        offset = null;
        maskingKey = null;
        payloadLength = null;
        opCode = null;
        secondByte = null;
        // raw buffer data
        return data;
    }
    _constructCloseFrame() {
        let frame = this._constructData(Buffer.alloc(0));
        // over first byte to fit a closing frame
        // 0x08
        frame.writeUInt8(137, 0);
        return frame;
    }
    _constructData(data) {
        if (!data)
            return;
        // we use alloc() in this case because we are sending
        // data to the client and we do not want to leak any code
        // through the binary data when using allocUnsafe.
        // bit of performance tradeoff.
        let buffer = Buffer.alloc(2 + // header bytes
            (data.length < 126 ? 0 : 2) + // the data length in byte count, allocating 0 - 2 bytes for 125 - 127 bytes length content
            data.length // allocate memory for the payload
        );
        // opcodes
        // 0x0 denotes a continuous frame
        // 0x1 denotes a text frame, aka sending string data
        // 0x2 denotes a binary frame
        // 0x[3-7] reserved for further non-control frames
        // 0x8 denotes a connection close
        // 0x9 denotes a ping
        // 0xa denotes a pong
        // 0x[b-f] reserved for further control frames
        // using 0x2 to indicate binary frame
        // set first bit to indicate final frame
        buffer.writeUInt8(129, 0);
        // second byte to indicating masking and payload length
        buffer.writeUInt8(data.length < 126 ? data.length : 126, 1);
        let offset = 2;
        if ((data.length < 126 ? 0 : 2) > 0) {
            buffer.writeUInt16BE(data.length, 2);
            offset += data.length < 126 ? 0 : 2;
        }
        buffer.fill(data, offset);
        // just in case GC does not do its job properly.
        data = null;
        offset = null;
        return buffer;
    }
    _validateHandshake() {
        let headers = this._res.headers;
        // bare client accepts all kind of protocols
        // so we are not checking for an specific protocol
        // verify if it is a connection upgrade
        // prettier-ignore
        if (!(headers['connection'] && headers['connection'].toLocaleLowerCase() === "upgrade")) {
            return this._failHandshake("Expected a `Connection: Upgrade` header from server");
        }
        // verify if it is a websocket upgrade
        // prettier-ignore
        if (!(headers['upgrade'] && headers['upgrade'].toLocaleLowerCase() === "websocket")) {
            return this._failHandshake("Expected `Upgrade: Websocket` header from server");
        }
        let hash = crypto_1.createHash("sha1")
            .update(this._base64nonce + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
            .digest("base64");
        if (!headers["sec-websocket-accept"]) {
            return this._failHandshake("Expecetd `Sec-WebSocket-Accept` header from server");
        }
        if (headers["sec-websocket-accept"] !== hash) {
            return this._failHandshake("`Sec-WebSocket-Accept` header value doesn't match with expected value: " +
                hash);
        }
        headers = null;
        this._res = null;
        this._wrapSocket();
        this.emit("connect");
    }
    on(evt, cb) {
        return super.on(evt, cb);
    }
    once(evt, cb) {
        return super.on(evt, cb);
    }
    emit(evt, ...args) {
        return super.emit(evt, ...args);
    }
}
exports.WebsocketClient = WebsocketClient;
//# sourceMappingURL=client.js.map