import { Websocket } from "../lib";

const wss = new Websocket({ secure: true });

wss.on("connection", (socket) => {
    console.log("new secure connection: " + socket["id"]);
});

wss.on("data", (socket, buffer) => {
    console.log("data received through secure channel");
    console.log(buffer.toString());
    wss.send(socket, Buffer.from(`Server: ${buffer.toString()} (secure echo)`));
});

wss.on("disconnect", (reason) => {
    console.log("socket disconnect: " + reason);
});

wss.on("request", (req, res) => {
    res.write("Testing secure Websocket channel");
    res.end();
});

wss.listen(8080, (port) => console.log(`listening on port: ${port}`));
