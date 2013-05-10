test("Send", function() {
  var n = new netgame();
  n.sendPacket(function(buf) {
    equals(buf.byteLength, 8);
    var u32 = new Uint32Array(buf);
    equals(u32[0], 0);
    equals(u32[01], 0xFFFFFFFF);  // nothing to ack
  });
  var lastAck = null;
  n.onack = function(ack) {
    lastAck = ack;
  };
  n.sendPacket(function(buf) {
    equals(buf.byteLength, 8);
    var u32 = new Uint32Array(buf);
    equals(u32[0], 1);
    equals(u32[01], 0xFFFFFFFF);  // nothing to ack
  });
  equals(lastAck, null);
  // Now pass in a packet.
  var pkt = new Uint32Array(2);
  pkt[0] = 0xABABCDCD;
  pkt[1] = 0xFFFFFFFF;
  equals(n.processPacket(pkt.buffer), true);
  n.sendPacket(function(buf) {
    equals(buf.byteLength, 8);
    var u32 = new Uint32Array(buf);
    equals(u32[0], 2);
    equals(u32[01], 0xABABCDCD);  // acking previously received packet
  });
  pkt[0] = 0xABABCDCE;
  // pretend to actually ack a packet
  pkt[1] = 0;
  equals(n.processPacket(pkt.buffer), true);
  equals(lastAck, 0);
});

test("BackAndForth", function() {
  var client = new netgame();
  var lastClientAck = null;
  client.onack = function(ack) {
    lastClientAck = ack;
  };
  var server = new netgame();
  var lastServerAck = null;
  server.onack = function(ack) {
    lastServerAck = ack;
  };
  function client_recv(buf) {
    client.processPacket(buf);
  }
  function server_recv(buf) {
    server.processPacket(buf);
  }
  client.sendPacket(server_recv);
  server.sendPacket(client_recv);
  equals(lastClientAck, 0);
  client.sendPacket(server_recv);
  equals(lastServerAck, 0);
  server.sendPacket(client_recv);
  equals(lastClientAck, 1);
  client.sendPacket(server_recv);
  equals(lastServerAck, 1);
});

test("netprop.u32", function() {
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop(netprop.u32);
  p.value = 0xABCDEF12;
  var offset = p.write(view, 0);
  p.value = 0xFFFFFFFF;
  offset = p.write(view, offset);
  equals(offset, 8);

  var p2 = new netprop(netprop.u32);
  offset = p2.read(view, 0);
  equals(p2.value, 0xABCDEF12);
  offset = p2.read(view, offset);
  equals(offset, 8);
  equals(p2.value, 0xFFFFFFFF);
});

test("netprop.i32", function() {
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop(netprop.i32);
  p.value = -12345678;
  var offset = p.write(view, 0);
  p.value = 12345678;
  offset = p.write(view, offset);
  equals(offset, 8);

  var p2 = new netprop(netprop.i32);
  offset = p2.read(view, 0);
  equals(p2.value, -12345678);
  offset = p2.read(view, offset);
  equals(offset, 8);
  equals(p2.value, 12345678);
});

test("netprop.u16", function() {
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop(netprop.u16);
  p.value = 0xABCD;
  var offset = p.write(view, 0);
  p.value = 0xFFFF;
  offset = p.write(view, offset);
  equals(offset, 4);

  var p2 = new netprop(netprop.u16);
  offset = p2.read(view, 0);
  equals(p2.value, 0xABCD);
  offset = p2.read(view, offset);
  equals(offset, 4);
  equals(p2.value, 0xFFFF);
});

test("netprop.i16", function() {
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop(netprop.i16);
  p.value = -12345;
  var offset = p.write(view, 0);
  p.value = 12345;
  offset = p.write(view, offset);
  equals(offset, 4);

  var p2 = new netprop(netprop.i16);
  offset = p2.read(view, 0);
  equals(p2.value, -12345);
  offset = p2.read(view, offset);
  equals(offset, 4);
  equals(p2.value, 12345);
});

test("netprop.u8", function() {
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop(netprop.u8);
  p.value = 0xAB;
  var offset = p.write(view, 0);
  p.value = 0xFF;
  offset = p.write(view, offset);
  equals(offset, 2);

  var p2 = new netprop(netprop.u8);
  offset = p2.read(view, 0);
  equals(p2.value, 0xAB);
  offset = p2.read(view, offset);
  equals(offset, 2);
  equals(p2.value, 0xFF);
});

test("netprop.i8", function() {
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop(netprop.i8);
  p.value = -123;
  var offset = p.write(view, 0);
  p.value = 123;
  offset = p.write(view, offset);
  equals(offset, 2);

  var p2 = new netprop(netprop.i8);
  offset = p2.read(view, 0);
  equals(p2.value, -123);
  offset = p2.read(view, offset);
  equals(offset, 2);
  equals(p2.value, 123);
});
