const fs = require("fs");
const e = require("express");
const path = require("path");
const server = require("socket.io")(3000);
const serverStream = require("socket.io-stream");

let filename = "";
let folder = "";

let executable = "";
server.on("connection", function (client) {
  client.emit("identify-client");

  client.on("administrator", () => {
    client.join("administrator-dashboard");
  });

  client.on("client-socket-connection", (data) => {
    client.join("scripts");
    server.to("administrator-dashboard").emit("server-new-connected-client", {
      id: client.id,
      computer: data.computer,
      scripts: data.scripts,
    });
    client.emit("server-generated-identification", client.id);
  });

  client.on("disconnect", () => {
    server
      .to("administrator-dashboard")
      .emit("server-disconnected-client", client.id);
  });

  //--------------------------------------------------------------------------------------

  client.on("client-downloading-script", (node) => {
    console.log("baixando");
    server
      .to("administrator-dashboard")
      .emit("server-download-on-client-started", client.id);
  });

  client.on("client-decompressing-script", (computer) => {
    console.log("extraindo");
    server
      .to("administrator-dashboard")
      .emit("server-decompress-on-client-started", client.id);
  });

  client.on("client-dependencies-script", (node) => {
    console.log("node installl");
    server
      .to("administrator-dashboard")
      .emit("server-dependencies-on-client-started", client.id);
  });

  client.on("client-downloading-script", (node) => {
    console.log("node installl");
    server
      .to("administrator-dashboard")
      .emit("server-cloning-on-client-started", client.id);
  });

  client.on("client-running-pid", (process) => {
    console.log("recebido");
    server
      .to("administrator-dashboard")
      .emit("server-client-running-pid", { id: client.id, pid: process });
  });

  client.on("administrator-demands-end-process", ({ pid, clientz }) => {
    client.broadcast.to(clientz).emit("server-administrator-demands-end", pid);
  });

  client.on("client-successfuly-install-script", (node) => {
    console.log("sucesso");

    server
      .to("administrator-dashboard")
      .emit("server-disconnected-client", client.id);

    server
      .to("administrator-dashboard")
      .emit("server-successfuly-installed-on-client", {
        id: client.id,
        computer: node.computer,
        scripts: node.scripts,
      });
  });

  client.on("client-error-on-installing", (node) => {
    server
      .to("administrator-dashboard")
      .emit("server-error-on-client", { id: client.id, error: node.error });
  });

  client.on("link", (link) => {
    server.to("scripts").emit("repo-link", link);
  });

  client.on("each-computer", () => {
    server.to("scripts").emit("each");
  });

  serverStream(client).on("upload-to-server", (stream, { name, exec }) => {
    console.log(exec);
    folder = path.resolve(__dirname + `/scripts/${name}`);
    filename = name;
    executable = exec;
    stream.pipe(fs.createWriteStream(folder));
    stream.on("end", function () {
      client.emit("server-script-completely-downloaded");
    });
  });

  client.on("process-output", (data) => {
    server
      .to("administrator-dashboard")
      .emit("server-running-script-response", { id: client.id, message: data });
  });

  client.on("administrator-install-in-all-sockets", () => {
    client.broadcast.emit("server-download-new-script");
  });

  serverStream(client).on("client-request-file", () => {
    var stream = serverStream.createStream();
    serverStream(client).emit("server-sending-requested-file", stream, {
      name: filename,
      exec: executable,
    });
    fs.createReadStream(`./scripts/${filename}`).pipe(stream);
  });

  //
  client.on("run-script-on-client", (data) => {
    client.broadcast.to(data.socket).emit("administrator-demands-run", data);
  });
});

function isAlreadyConnected(id) {
  let found = false;
  clientsConnected.forEach((client, index) => {
    if (client.id == id) {
      found = true;
    }
  });
  return found;
}

function desconnectClient(id) {
  let clientIndex = "";
  if (isAlreadyConnected(id)) {
    clientsConnected.forEach((client, index) => {
      console.log(`cliente id ${client.id} === ${id}`);
      if (client.id == id) {
        clientIndex = index;
        console.log(`cliente index = ${clientIndex}`);
      }
    });
  }
  let aux = clientsConnected.splice(clientIndex, 1);
  console.log(aux);
  return clientsConnected;
}

console.log("Plain socket.io server started at port 3000");
