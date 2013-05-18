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
function ball() {
  netobject.call(this, {x: netprop.u8, y: netprop.u8});
}

// If we get client prediction we'll want to send the velocity as well, but
// this is fine for now.
ball.prototype = netobject.register(ball);

ball.prototype.draw = function(cx) {
  cx.fillStyle = "blue";
  cx.beginPath();
  cx.arc(this.x, this.y, 2, 0, 2* Math.PI, false);
  cx.fill();
};

//TODO: figure out netobject inheritance, these things all have common
// properties...
function block() {
  netobject.call(this, {x: netprop.u8, y: netprop.u8});
}

block.prototype = netobject.register(block);

block.prototype.draw = function(cx) {
  cx.fillStyle = "red";
  cx.fillRect(this.x - 2, this.y - 2, 4, 4);
};

function player() {
  netobject.call(this, {x: netprop.u8, y: netprop.u8});
}

player.prototype = netobject.register(player);

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
function clientinput() {
  netobject.call(this, {xmove: netprop.i8, ymove: netprop.i8,
                        timestamp: netprop.u32});
}

clientinput.prototype = netobject.register(clientinput);

var WIDTH = 200, HEIGHT = 200;
var server_rate = 15;
var transmit_rate = 50;
var things = [];
var server = new server_net();
var client = new client_net({send: function(data) { sc.recv(data); }},
                            clientinput);
var sc = new server_client({send: client_recv});
server.addClient(sc);

var serverIntervalID = null;
var transmitIntervalID = null;
var lastUpdate = performance.now();
var packetLoss = 0;
var latency = 0;
var CLIENT_PACKET_SAMPLES = 20;
var clientPackets = [];
var lastRateUpdate = 0;

function client_recv(data) {
  updateClientDataRate(data.byteLength);
  if (Math.random() > packetLoss) {
    setTimeout(function() { client.recv(data); }, latency);
  }
}

function updateClientDataRate(bytes) {
  var now = performance.now();
  clientPackets.push([now, bytes]);
  if (clientPackets.length > CLIENT_PACKET_SAMPLES) {
    clientPackets.shift();
  }
  if (clientPackets.length == CLIENT_PACKET_SAMPLES && (now - lastRateUpdate) > 1000) {
    lastRateUpdate = now;
    var elapsed = (now - clientPackets[0][0]) / 1000;
    var total = 0;
    for (var i = 0; i < clientPackets.length; i++) {
      total += clientPackets[i][1];
    }
    var rate = ((total * 8) / 1024) / elapsed;
    document.getElementById("client-rate").firstChild.textContent = Math.round(rate * 100) / 100;
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
  things.push(p);

  lastUpdate = performance.now();
  serverIntervalID = setInterval(runServerFrame, server_rate);
  transmitIntervalID = setInterval(sendToClients, transmit_rate);
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
    if (t instanceof player) {
      continue;
    }
    t.x = wraparound(t.x + t.dir.x*elapseds, 0, WIDTH);
    t.y = wraparound(t.y + t.dir.y*elapseds, 0, HEIGHT);
  }
  lastUpdate = now;
}

function sendToClients() {
  server.updateClients(things);
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

function keyhandler(e) {
  if (e.keyCode >= 37 && e.keyCode <= 40) {
    var press = e.type == "keydown";
    var i = client.getNextInput();
    if (e.keyCode == 37) {
      i.xmove = press ? -5 : 0;
    } else if (e.keyCode == 39) {
      i.xmove = press ? 5 : 0;
    } else if (e.keyCode == 38) {
      i.ymove = press ? -5 : 0;
    } else if (e.keyCode == 40) {
      i.ymove = press ? 5 : 0;
    }
  }
}

addEventListener("load", setup);
addEventListner("keydown", keyhandler);
addEventListner("keyup", keyhandler);
