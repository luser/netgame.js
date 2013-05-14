test("Send", function() {
  var n = new netconn();
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
  var client = new netconn();
  var lastClientAck = null;
  client.onack = function(ack) {
    lastClientAck = ack;
  };
  var server = new netconn();
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

test("PacketData", function() {
  var n = new netconn();
  var pkt = new Uint32Array(4);
  pkt[0] = 0xABABCDCD;
  pkt[1] = 0xFFFFFFFF;
  pkt[2] = 0x12345678;
  pkt[3] = 0x87654321;
  var gotpacket = false;
  n.onpacket = function(buf) {
    gotpacket = true;
    var data = new Uint32Array(buf);
    equals(data[0], pkt[2]);
    equals(data[1], pkt[3]);
  };
  ok(n.processPacket(pkt.buffer));
  ok(gotpacket);
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

test("netobject", function() {
  function testobj() {
    netobject.call(this, {a: netprop.u8, b: netprop.u32});
  }
  testobj.prototype = netobject.register(testobj);

  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var t = new testobj();
  t.a = 255;
  t.b = 0xABCD1234;
  equals(t.write(view, 0), 5);

  var t2 = new testobj();
  equals(t2.read(view, 0), 5);
  equals(t2.a, t.a);
  equals(t2.b, t.b);
});

test("server_net", function() {
  var packet = null;
  function client_send(data) {
    packet = data;
  }
  var server = new server_net();
  var client = new server_client({send: client_send});
  server.addClient(client);

  function thing() {
    netobject.call(this, {a: netprop.u8, b: netprop.u32});
  }
  thing.prototype = netobject.register(thing);

  function anotherthing() {
    netobject.call(this, {x: netprop.u32});
  }
  anotherthing.prototype = netobject.register(anotherthing);

  var thing1 = new thing();
  thing1.a = 100;
  thing1.b = 12345678;
  var thing2 = new thing();
  thing2.a = 200;
  thing2.b = 87654321;
  notStrictEqual(thing1.a, thing2.a, "thing1.a and thing2.a should not be the same");
  notStrictEqual(thing1.b, thing2.b, "thing1.b and thing2.b should not be the same");
  var thing3 = new anotherthing();
  thing3.x = 0xABABABAB;
  server.updateClients([thing1, thing2, thing3]);

  ok(packet != null);
  var view = new DataView(packet);
  equals(view.getUint8(8), 0);
  equals(view.getUint8(9), thing.prototype.netID);

  var thing1_read = new thing();
  var offset = thing1_read.read(view, 10);
  equals(thing1_read.a, thing1.a);
  equals(thing1_read.b, thing1.b);
  equals(view.getUint8(offset), 1);
  equals(view.getUint8(offset + 1), thing.prototype.netID);

  var thing2_read = new thing();
  offset = thing2_read.read(view, offset + 2);
  equals(thing2_read.a, thing2.a);
  equals(thing2_read.b, thing2.b);
  notStrictEqual(thing1_read.a, thing2_read.a);
  notStrictEqual(thing1_read.b, thing2_read.b);

  var thing3_read = new anotherthing();
  equals(view.getUint8(offset), 2);
  equals(view.getUint8(offset + 1), anotherthing.prototype.netID);
  offset = thing3_read.read(view, offset + 2);
  equals(thing3_read.x, thing3.x);
});
