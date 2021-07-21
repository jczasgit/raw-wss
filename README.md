# raw-wss

This is a simple WebSocket server package that handles payload sizes less than 65535 bytes. A message/data from a Websocket triggers the `"data"` event.

# Table of Content

-   [Get Started](#get-started)
-   [Websocket Server API](#websocket-server-api)
-   [Websocket Server API Examples](#websocket-server-api-examples)
-   [Websocket Client API](#websocket-client-api)

# Get Started

`npm install raw-wss`

```javascript
import { Websocket } from "raw-wss";

const wss = new Websocket();

wss.on("connection", (socket) => {
    // do something with socket
});

wss.on("data", (socket, buffer) => {
    // do something with incoming data
});

wss.listen(port, (_port) => console.log(`listening on port: ${_port}`));
```

Connect with Websokcet Client

```javascript
import { WebsocketClient } from "raw-wss";

const client = new WebsocketClient();

client.on("connect", () => {
    console.log("Connected");
    // send arbitary data to server
    client.send(data);
});

client.on("data", (data) => {
    // to something with data...
});

// stablish websocket connection...
client.connect("ws://localhost/");
```

# Websocket Server API

## `wss = new Websocket([opts]);`

Create a new `Websocket` instance. <br>
Available `opts`:<br>

```javascript
{
    server: http.Server,    // Server. Default HTTP server.
    secure: boolean,        // Use HTTPS. Default false.
    cert: string | Buffer,  // Public key. Default use predefined key(not secure)
    key: string | Buffer,   // Private key. Default use predefined key(not secure)
    verbose: boolean,       // Log internal events. Default false
}
```

## `wss.send(socket, data);`

Send `data` to `socket` <br>
`data` has to be an instance of `Buffer`

# Websocket Server API Examples

Example only using raw-wss:

```javascript
import { Websocket } from "raw-wss";
const wss = new Websocket(); // auto creates a http server
wss.on("connection", (socket) => {
    // new connection
    socket.write(data);
});

wss.on("disconnect", (reason) => {
    // connection closed
});

wss.on("data", (socket, buffer) => {
    // raw data from socket.
    // handle data...
});

wss.on("request", (req, res) => {
    // handle normal http requests...
});

wss.listen(8080, (port) => console.log(`listening of port ${port}`));
```

Example using express:

```javascript
import express from "express";
import { Websocket } from "raw-wss";
import http from "http";

const app = express();

const server = http.createServer(app);

app.get("/", (req, res) => res.send("express app test with websocket"));

const wss = new Websocket({ server });

wss.on("connection", (socket) => {
    console.log("new connection: " + socket["id"]);
});

wss.on("disconnect", (reason) => {
    console.log("socket disconnect: " + reason);
});

wss.on("data", (socket, buffer) => {
    console.log(buffer);
});

wss.listen(8080, (port) => console.log(`listening on port: ${port}`));

// or
// server.listen(8080, () => console.log("listening..."));
```

Example using https:

```javascript
import { Websocket } from "raw-wss";

const wss = new Websocket({
    secure: true,
    cert: "certifcate",
    key: "private key",
});

wss.on("connection", (socket) => {
    console.log("new secure connection: " + socket["id"]);
});

wss.on("data", (socket, buffer) => {
    console.log("data received through secure channel");
    console.log(buffer);
});

wss.on("disconnect", (reason) => {
    console.log("socket disconnect: " + reason);
});

wss.on("request", (req, res) => {
    res.write("Testing secure Websocket channel");
    res.end();
});

wss.listen(8080, (port) => console.log(`listening on port: ${port}`));
```

# Websocket Client API

## `client = new WebsocketClient([opts]);`

Create new `WebsocketClient` instance.<br>
Available `opts`:<br>

```javascript
{
    tlsOptions: TlsOptions, // TlsOptions from `tls` module. Default {}
}
```

Stablish Websocket connection:

```javascript
import { WebsocketClient } from "raw-wss";

const client = new WebsocketClient();

client.on("connect", () => {
    console.log("Connected");
    // send arbitary data to server
    client.send(data);
});

client.on("data", (data) => {
    // to something with data...
});

// stablish websocket connection...
client.connect("ws://localhost/");
```
