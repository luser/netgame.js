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

var WIDTH = 200, HEIGHT = 200;
var balls = [];
var server = new server_net();
var client = new client_net({send: function(data) {}}); // Client doesn't currently send any data.
server.addClient(new server_client({send: function(data) { client.recv(data); }}));
var intervalID = null;
var lastUpdate = performance.now();

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
  var numBalls = Math.floor(Math.random() * 10) + 1;
  console.log("numBalls: %d", numBalls);
  for (var i = 0; i < numBalls; i++) {
    var b = new ball();
    b.x = randX();
    b.y = randY();
    b.dir = randDir();
    balls.push(b);
  }
  lastUpdate = performance.now();
  intervalID = setInterval(runServerFrame, 100);
  requestAnimationFrame(redraw);
}

function runServerFrame() {
  var now = performance.now();
  // Move all things.
  //TODO: make movement time-relative
  for (var i = 0; i < balls.length; i++) {
    var b = balls[i];
    b.x = (b.x + b.dir.x) % WIDTH;
    b.y = (b.y + b.dir.y) % HEIGHT;
  }
  server.updateClients(balls);
  lastUpdate = now;
}

function drawWorld(cx, things) {
  cx.clearRect(0, 0, 200, 200);
  for (var i = 0; i < things.length; i++) {
    things[i].draw(cx);
  }
}

function redraw() {
  drawWorld(document.getElementById("server").getContext("2d"), balls);
  drawWorld(document.getElementById("client").getContext("2d"), client.things);
  requestAnimationFrame(redraw);
}

addEventListener("load", setup);
