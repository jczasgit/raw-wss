import express from "express";
import { Websocket } from "../lib";
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
