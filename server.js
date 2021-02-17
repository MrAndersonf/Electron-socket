const server = require("socket.io")(3000);
const serverStream = require("socket.io-stream");
const fs = require("fs");
const path = require("path");
const { Socket } = require("dgram");
const socketIoStream = require("socket.io-stream");

var name = "";
var filename = "";
let clientsConnected = [];
let adm = "";
server.on("connection", function (client) {
  client.emit("identify");
  console.log(`Client ${client.id}---------${clientsConnected.length}`);

  client.on("identification", (identification) => {
    client.join("scripts");
    clientsConnected.push({
      id: client.id,
      computer: identification.computer,
      scripts: identification.scripts,
    });
    server.to("adm").emit("broadcast", clientsConnected);
  });

  client.on("start-script", (data) => {
    console.log(data);
    client.broadcast.to(data.socket).emit("adm_instruction", data);
  });

  client.on("adm", () => {
    adm = client.id;
    console.log("adm connected");
    client.join("adm");
    console.log(adm);
    server.to("adm").emit("broadcast", clientsConnected);
  });

  client.on("download-in-node", (node) => {
    console.log("download");
    server
      .to("adm")
      .emit("node-download", { id: client.id, computer: node.computer });
  });

  client.on("extracting", (computer) => {
    server.to("adm").emit("_extracting", { id: client.id, computer: computer });
  });

  client.on("dependencies-in-node", (node) => {
    console.log("dependencies");
    server
      .to("adm")
      .emit("node-dependencies", { id: client.id, computer: node.computer });
  });

  client.on("success-in-node", (node) => {
    console.log("success");
    server
      .to("adm")
      .emit("node-success", { id: client.id, computer: node.computer });
  });

  client.on("error-in-node", (node) => {
    server.to("adm").emit("node-error", { id: client.id, error: node.error });
  });

  client.on("receivingSockets", () => {
    client.emit("to", clientsConnected);
  });

  client.on("link", (link) => {
    server.to("scripts").emit("repo-link", link);
  });

  client.on("each-computer", () => {
    server.to("scripts").emit("each");
  });

  client.on("result", (r) => {
    console.log(r);
    server.to("adm").emit("reposin", r);
  });

  client.on("disconnect", () => {
    clientsConnected.splice(clientsConnected.indexOf(client.id), 1);
    client.broadcast.emit("broadcast", clientsConnected);
  });

  serverStream(client).on("sending", function (stream, nameOfTheFile) {
    filename = path.resolve(__dirname + `/scripts/${nameOfTheFile}`);
    name = nameOfTheFile;
    console.log("Name in sic", filename);
    stream.pipe(fs.createWriteStream(filename));
    stream.on("end", function () {
      client.emit("done");
    });
  });

  client.on("spread", () => {
    console.log("Server on spread");
    client.broadcast.emit("down");
  });

  serverStream(client).on("sincronize", () => {
    console.log("server on sincronize");
    var stream = serverStream.createStream();
    serverStream(client).emit("sinc", stream, name);
    fs.createReadStream(`./scripts/${name}`).pipe(stream);
  });
});

console.log("Plain socket.io server started at port 3000");
