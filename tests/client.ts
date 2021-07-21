import { WebsocketClient } from "../lib";

const client = new WebsocketClient();

client.on("connect", () => {
    console.log("Connected");
});

client.on("connect-fail", console.log);

client.on("disconnect", (r) => {
    process.stdin.removeAllListeners();
    client.removeAllListeners();
    console.log(r);
});

client.on("data", (data) => {
    console.log(data.toString());
});

client.connect("ws://localhost:8080/");

process.stdin.on("data", (data) => {
    if (data.toString().toLowerCase() === ".close\n") {
        client.close();
        return;
    }

    client.send(data);
});
