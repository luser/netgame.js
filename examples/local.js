(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
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

function block() {
  netobject.call(this, {x: netprop.u8, y: netprop.u8});
}

block.prototype = netobject.register(block);

block.prototype.draw = function(cx) {
  cx.fillStyle = "red";
  cx.fillRect(this.x - 2, this.y - 2, 4, 4);
};

var WIDTH = 200, HEIGHT = 200;
var things = [];
var server = new server_net();
var client = new client_net({send: function(data) {}}); // Client doesn't currently send any data.
function client_recv(data) {
  if (Math.random() > packetLoss) {
    client.recv(data);
  }
}

server.addClient(new server_client({send: client_recv}));
var intervalID = null;
//var lastUpdate = performance.now();
var packetLoss = 0;

function randX() {
   return Math.floor(Math.random() * (WIDTH + 1));
}

function randY() {
   return Math.floor(Math.random() * (HEIGHT + 1));
}

function randDir() {
  //TODO: support negative directions
  return {x: Math.floor(Math.random() * (5 + 1)),
          y: Math.floor(Math.random() * (5 + 1))};
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
  //lastUpdate = performance.now();
  intervalID = setInterval(runServerFrame, 100);
  requestAnimationFrame(redraw);
  document.getElementById("packetloss").value = 0;
}

function runServerFrame() {
  //var now = performance.now();
  // Move all things.
  //TODO: make movement time-relative
  for (var i = 0; i < things.length; i++) {
    var t = things[i];
    t.x = (t.x + t.dir.x) % WIDTH;
    t.y = (t.y + t.dir.y) % HEIGHT;
  }
  server.updateClients(things);
  //lastUpdate = now;
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

function updatePacketLoss(value) {
  document.getElementById("packetloss-value").firstChild.textContent = value;
  packetLoss = value / 100.0;
}

addEventListener("load", setup);
