import Websocket from "../lib";

const wss = new Websocket({ secure: true });

wss.on(Websocket.WSS_EVENTS.CONNECTION, (socket) => {
    console.log("new secure connection: " + socket.id);
});

wss.on(Websocket.WSS_EVENTS.DATA, (socket, buffer) => {
    console.log("data received through secure channel");
    console.log(buffer);
});

wss.on(Websocket.WSS_EVENTS.DISCONNECT, (reason) => {
    console.log("socket disconnect: " + reason);
});

wss.on(Websocket.WSS_EVENTS.REQUEST, (req, res) => {
    res.write("Testing secure Websocket channel");
    res.end();
});

wss.listen(8080, (port) => console.log(`listening on port: ${port}`));
