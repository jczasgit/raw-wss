import express from "express";
import Websocket from "../lib";
import http from "http";

const app = express();

const server = http.createServer(app);

app.get("/", (req, res) => res.send("express app test with websocket"));

const wss = new Websocket({ server });

wss.on(Websocket.WSS_EVENTS.CONNECTION, (socket) => {
    console.log("new connection: " + socket.id);
});

wss.on(Websocket.WSS_EVENTS.DISCONNECT, (reason) => {
    console.log("socket disconnect: " + reason);
});

wss.on(Websocket.WSS_EVENTS.DATA, (socket, buffer) => {
    console.log(buffer);
});

wss.listen(8080, (port) => console.log(`listening on port: ${port}`));

// or
// server.listen(8080, () => console.log("listening..."));
