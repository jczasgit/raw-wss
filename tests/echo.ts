import { Websocket } from "../lib";

const ws = new Websocket({
    verbose: true,
});

ws.on("connection", (socket) => {
    console.log("new connection");
    console.log(socket);
});

ws.on("data", (socket, buffer) => {
    console.log(buffer.toString()); // log out raw buffer
    ws.send(socket, buffer); // echo data to client
});

ws.on("disconnect", (reason) => {
    console.log("user disconnected:", reason);
});

ws.listen(8080, (port) => console.log(`Listening on port: ${port}`));
