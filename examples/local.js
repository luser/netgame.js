(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;

  if (!('performance' in window)) {
    window.performance = {};
  }
  if (!('now' in window.performance)) {
    window.performance.now = Date.now;
  }
})();


// Really simple object, just 1-byte X and Y coordinates.
function thing() {
  netobject.call(this, {x: netprop.u8, y: netprop.u8});
}

// If we get client prediction we'll want to send the velocity as well, but
// this is fine for now.
thing.prototype = netobject.register(thing);

function ball() {
  thing.call(this);
}

ball.prototype = netobject.register(ball, thing);

ball.prototype.draw = function(cx) {
  cx.fillStyle = "blue";
  cx.beginPath();
  cx.arc(this.x, this.y, 2, 0, 2* Math.PI, false);
  cx.fill();
};

function block() {
  thing.call(this);
}

block.prototype = netobject.register(block, thing);

block.prototype.draw = function(cx) {
  cx.fillStyle = "red";
  cx.fillRect(this.x - 2, this.y - 2, 4, 4);
};

function player() {
  thing.call(this);
}

player.prototype = netobject.register(player, thing);

player.prototype.draw = function(cx) {
  cx.fillStyle = "green";
  cx.beginPath();
  cx.moveTo(this.x, this.y - 3);
  cx.lineTo(this.x + 3, this.y + 3);
  cx.lineTo(this.x - 3, this.y + 3);
  cx.lineTo(this.x, this.y - 3);
  cx.fill();
};

// Object to represent player input state
function input() {
  netobject.call(this, {xmove: netprop.i8, ymove: netprop.i8});
}

input.prototype = netobject.register(input, clientinput);

var WIDTH = 200, HEIGHT = 200;
var server_rate = 15;
var transmit_rate = 50;
var things = [];
var server = new server_net();
var client = new client_net({send: server_recv},
                            input);
var sc = new server_client({send: client_recv});
server.addClient(sc);

sc.oninput = function(input) {
  handleInput(this, input);
};

var serverIntervalID = null;
var transmitIntervalID = null;
var clientTransmitIntervalID = null;
var lastUpdate = performance.now();
var packetLoss = 0;
var latency = 0;
var PACKET_SAMPLES = 20;
var clientPackets = [];
var serverPackets = [];
var lastRateUpdate = 0;

function server_recv(data) {
  updatePackets(data.byteLength, serverPackets);
  sc.recv(data);
};

function client_recv(data) {
  updatePackets(data.byteLength, clientPackets);
  if (Math.random() > packetLoss) {
    setTimeout(function() { client.recv(data); }, latency);
  }
}

function updatePackets(bytes, packets, id) {
  var now = performance.now();
  packets.push([now, bytes]);
  if (packets.length > PACKET_SAMPLES) {
    packets.shift();
  }
}

function updateDataRate(packets, id, now) {
  if (packets.length < PACKET_SAMPLES)
    return;

  var elapsed = (now - packets[0][0]) / 1000;
  var total = 0;
  for (var i = 0; i < packets.length; i++) {
    total += packets[i][1];
  }
  var rate = ((total * 8) / 1024) / elapsed;
  document.getElementById(id).firstChild.textContent = Math.round(rate * 100) / 100;
}

function updateDataRates() {
  var now = performance.now();
  if ((now - lastRateUpdate) > 1000) {
    lastRateUpdate = now;
    updateDataRate(serverPackets, "server-rate", now);
    updateDataRate(clientPackets, "client-rate", now);
  }
}

function randX() {
   return Math.floor(Math.random() * (WIDTH + 1));
}

function randY() {
   return Math.floor(Math.random() * (HEIGHT + 1));
}

function randSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

function randDir() {
  //TODO: support negative directions
  return {x: Math.floor(Math.random() * (20 + 1)) * randSign(),
          y: Math.floor(Math.random() * (20 + 1)) * randSign()};
}

function setup() {
  var numThings = 10;
  for (var i = 0; i < numThings; i++) {
    var b = Math.random() < 0.5 ? new ball() : new block();
    b.x = randX();
    b.y = randY();
    b.dir = randDir();
    things.push(b);
  }
  //addClient
  var p = new player();
  p.x = randX();
  p.y = randY();
  p.dir = {x:0,y:0};
  things.push(p);
  sc.playerThing = p;

  lastUpdate = performance.now();
  serverIntervalID = setInterval(runServerFrame, server_rate);
  transmitIntervalID = setInterval(sendToClients, transmit_rate);
  clientTransmitIntervalID = setInterval(sendToServer, transmit_rate);
  requestAnimationFrame(redraw);
  document.getElementById("packetloss").value = 0;
}

function wraparound(val, min, max) {
  if (val < min)
    return val + max;
  if (val > max)
    return val % max;
  return val;
}

function runServerFrame() {
  var now = performance.now();
  var elapseds = (now - lastUpdate) / 1000.0;
  // Move all things.
  for (var i = 0; i < things.length; i++) {
    var t = things[i];
    t.x = wraparound(t.x + t.dir.x*elapseds, 0, WIDTH);
    t.y = wraparound(t.y + t.dir.y*elapseds, 0, HEIGHT);
  }
  lastUpdate = now;
}

function handleInput(c, input) {
  var p = c.playerThing;
  p.dir.x = input.xmove;
  p.dir.y = input.ymove;
}

function sendToClients() {
  server.updateClients(things);
}

function sendToServer() {
  client.sendToServer();
}

function drawWorld(cx, things) {
  cx.clearRect(0, 0, 200, 200);
  for (var i = 0; i < things.length; i++) {
    things[i].draw(cx);
  }
}

function redraw() {
  drawWorld(document.getElementById("server").getContext("2d"), things);
  drawWorld(document.getElementById("client").getContext("2d"), client.things);
  updateDataRates();
  requestAnimationFrame(redraw);
}

function updateLatency(value) {
  document.getElementById("latency-value").firstChild.textContent = value;
  latency = value;
}

function updatePacketLoss(value) {
  document.getElementById("packetloss-value").firstChild.textContent = value;
  packetLoss = value / 100.0;
}

var lastInput = null;
var PLAYER_SPEED = 15;
function keyhandler(e) {
  if (e.keyCode >= 37 && e.keyCode <= 40) {
    var press = e.type == "keydown";
    var i = client.getNextInput();
    if (lastInput) {
      i.xmove = lastInput.xmove;
      i.ymove = lastInput.ymove;
    }
    if (e.keyCode == 37) {
      i.xmove = press ? -PLAYER_SPEED : 0;
    } else if (e.keyCode == 39) {
      i.xmove = press ? PLAYER_SPEED : 0;
    } else if (e.keyCode == 38) {
      i.ymove = press ? -PLAYER_SPEED : 0;
    } else if (e.keyCode == 40) {
      i.ymove = press ? PLAYER_SPEED : 0;
    }
    lastInput = i;
    e.preventDefault();
  }
}

addEventListener("load", setup);
addEventListener("keydown", keyhandler);
addEventListener("keyup", keyhandler);
