# raw-wss

This is a simple WebSocket server package that handles payload sizes less than 65535 bytes. A message/data from a Websocket triggers the `"data"` event.

# Get Started

`npm install raw-wss`

```javascript
import WSS from "raw-wss";

const wss = new WSS();

wss.on("connection", (socket) => {
    // do something with socket
});

wss.on("data", (socket, buffer) => {
    // do something with incoming data
});

wss.listen(port, (_port) => console.log(`listening on port: ${_port}`));
```

# WSS API

## `wss = new WSS([opts]);`

Create a new `WSS` instance. <br>
Default `opts`:<br>

```javascript
{
    server: http.Server,    // server to listen upgrade event
    secure: boolean,        // use https
    cert: string | Buffer,  // public key
    key: string | Buffer,   // private key
    verbose: boolean,       // log internal WSS events
}
```

## `wss.send(socket, data);`

Send `data` to `socket` <br>
`data` has to be an instance of `Buffer`

# Examples

Example only using raw-wss:

```javascript
import WSS from "raw-wss";
const wss = new WSS(); // auto creates a http server
wss.on(WSS.WSS_EVENTS.CONNECTION, (socket) => {
    // new connection
    socket.write(data);
});

wss.on(WSS.WSS_EVENTS.DISCONNECT, (reason) => {
    // connection closed
});

wss.on(WSS.WSS_EVENTS.DATA, (socket, buffer) => {
    // raw data from socket.
    // handle data...
});

wss.on(WSS.WSS_EVENTS.REQUEST, (req, res) => {
    // handle normal http requests...
});

wss.listen(8080, (port) => console.log(`listening of port ${port}`));
```

Example using express:

```javascript
import express from "express";
import WSS from "raw-wss";
import http from "http";

const app = express();

const server = http.createServer(app);

app.get("/", (req, res) => res.send("express app test with websocket"));

const wss = new WSS({ server });

wss.on(WSS.WSS_EVENTS.CONNECTION, (socket) => {
    console.log("new connection: " + socket.id);
});

wss.on(WSS.WSS_EVENTS.DISCONNECT, (reason) => {
    console.log("socket disconnect: " + reason);
});

wss.on(WSS.WSS_EVENTS.DATA, (socket, buffer) => {
    console.log(buffer);
});

wss.listen(8080, (port) => console.log(`listening on port: ${port}`));

// or
// server.listen(8080, () => console.log("listening..."));
```

Example using https:

```javascript
import WSS from "raw-wss";

const wss = new WSS({
    secure: true,
    cert: "certifcate",
    key: "private key",
});

wss.on(WSS.WSS_EVENTS.CONNECTION, (socket) => {
    console.log("new secure connection: " + socket.id);
});

wss.on(WSS.WSS_EVENTS.DATA, (socket, buffer) => {
    console.log("data received through secure channel");
    console.log(buffer);
});

wss.on(WSS.WSS_EVENTS.DISCONNECT, (reason) => {
    console.log("socket disconnect: " + reason);
});

wss.on(WSS.WSS_EVENTS.REQUEST, (req, res) => {
    res.write("Testing secure Websocket channel");
    res.end();
});

wss.listen(8080, (port) => console.log(`listening on port: ${port}`));
```
