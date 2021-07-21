"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Websocket = void 0;
const events_1 = require("events");
const http_1 = require("http");
const https_1 = require("https");
const stream_1 = require("stream");
const fs_1 = require("fs");
const crypto = __importStar(require("crypto"));
const path_1 = require("path");
const nanoid_1 = require("nanoid");
class Websocket extends events_1.EventEmitter {
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
    constructor(opts = {}) {
        var _a, _b;
        super();
        this._server = opts.server
            ? opts.server
            : opts.secure
                ? https_1.createServer({
                    cert: (_a = opts.cert) !== null && _a !== void 0 ? _a : fs_1.readFileSync(path_1.join(__dirname, "static/certificate.crt")),
                    key: (_b = opts.key) !== null && _b !== void 0 ? _b : fs_1.readFileSync(path_1.join(__dirname, "static/private.key")),
                }, this._onRequest.bind(this))
                : http_1.createServer(this._onRequest.bind(this));
        this._verbose =
            typeof opts.verbose !== "undefined" ? opts.verbose : false;
        this._wrapServer();
        this.id = nanoid_1.nanoid();
        this.sockets = new Map();
    }
    send(socket, data) {
        if (socket instanceof stream_1.Duplex &&
            !socket.destroyed &&
            data instanceof Buffer) {
            socket.write(this._constructData(data));
        }
    }
    listen(port, cb) {
        this._server.listen(port, cb.bind(null, port));
    }
    _wrapServer() {
        this._server.on("upgrade", this._onUpgrade.bind(this));
    }
    _onUpgrade(req, socket) {
        var _a, _b;
        if (((_a = req.headers["upgrade"]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== "websocket") {
            socket.end("HTTP/1.1 400 Bad Request");
            return;
        }
        let key = (_b = req.headers["sec-websocket-key"]) !== null && _b !== void 0 ? _b : "";
        let hash = this._generateAcceptKey(key);
        let resHeaders = [
            "HTTP/1.1 101 Web Socket Protocol Handshake",
            "Upgrade: Websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Accept: ${hash}`,
        ];
        socket["id"] = nanoid_1.nanoid(); // 21 char length
        this.sockets.set(socket["id"], socket);
        socket.write(resHeaders.join("\r\n") + "\r\n\r\n");
        socket.on("data", this._onData.bind(this, socket));
        socket.once("close", this._onClose.bind(this, socket["id"]));
        socket.once("error", this._onError.bind(this, socket["id"]));
        socket.once("end", this._onEnd.bind(this, socket["id"]));
        this.emit("connection", socket);
    }
    _onEnd(id) {
        if (this._verbose)
            console.log("socked end:", id);
        this._cleanUp(id);
        return;
    }
    _onError(id, err) {
        if (this._verbose) {
            console.log("socket error:", id);
            console.log(err);
        }
        this._cleanUp(id);
        return;
    }
    _onClose(id) {
        if (this._verbose)
            console.log("socket closed:", id);
        this._cleanUp(id);
        return;
    }
    _onData(socket, buffer) {
        let parsed = this._parseData(buffer, socket);
        if (parsed)
            this.emit("data", socket, parsed);
    }
    _cleanUp(id) {
        if (this.sockets.has(id)) {
            if (!this.sockets.get(id).destroyed)
                this.sockets.get(id).destroy();
            this.sockets.delete(id);
            if (this._verbose) {
                console.log("Active sockets: " + this.sockets.size);
                this.sockets.forEach((s) => {
                    console.log("\tsocket: " + s["id"]);
                });
            }
        }
    }
    _parseData(buffer, socket) {
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
            socket.end();
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
    _generateAcceptKey(key) {
        return crypto
            .createHash("sha1")
            .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", "binary")
            .digest("base64");
    }
    _onRequest(req, res) {
        this.emit("request", req, res);
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    once(event, listener) {
        return super.on(event, listener);
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
}
exports.Websocket = Websocket;
Websocket.WSS_EVENTS = {
    CONNECTION: "connection",
    DISCONNECT: "disconnect",
    DATA: "data",
    REQUEST: "request",
};
//# sourceMappingURL=server.js.map