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
  var clientgotpacket = false;
  client.onpacket = function(buf) {
    clientgotpacket = true;
  };
  var server = new netconn();
  var lastServerAck = null;
  server.onack = function(ack) {
    lastServerAck = ack;
  };
  var servergotpacket = false;
  server.onpacket = function(buf) {
    servergotpacket = true;
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
  ok(!clientgotpacket);
  ok(!servergotpacket);
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
  var p = new netprop.u32();
  p.value = 0xABCDEF12;
  var offset = p.write(view, 0);
  p.value = 0xFFFFFFFF;
  offset = p.write(view, offset);
  equals(offset, 8);

  var p2 = new netprop.u32();
  offset = p2.read(view, 0);
  equals(p2.value, 0xABCDEF12);
  offset = p2.read(view, offset);
  equals(offset, 8);
  equals(p2.value, 0xFFFFFFFF);
});

test("netprop.i32", function() {
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop.i32();
  p.value = -12345678;
  var offset = p.write(view, 0);
  p.value = 12345678;
  offset = p.write(view, offset);
  equals(offset, 8);

  var p2 = new netprop.i32();
  offset = p2.read(view, 0);
  equals(p2.value, -12345678);
  offset = p2.read(view, offset);
  equals(offset, 8);
  equals(p2.value, 12345678);
});

test("netprop.u16", function() {
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop.u16();
  p.value = 0xABCD;
  var offset = p.write(view, 0);
  p.value = 0xFFFF;
  offset = p.write(view, offset);
  equals(offset, 4);

  var p2 = new netprop.u16();
  offset = p2.read(view, 0);
  equals(p2.value, 0xABCD);
  offset = p2.read(view, offset);
  equals(offset, 4);
  equals(p2.value, 0xFFFF);
});

test("netprop.i16", function() {
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop.i16();
  p.value = -12345;
  var offset = p.write(view, 0);
  p.value = 12345;
  offset = p.write(view, offset);
  equals(offset, 4);

  var p2 = new netprop.i16();
  offset = p2.read(view, 0);
  equals(p2.value, -12345);
  offset = p2.read(view, offset);
  equals(offset, 4);
  equals(p2.value, 12345);
});

test("netprop.u8", function() {
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop.u8();
  p.value = 0xAB;
  var offset = p.write(view, 0);
  p.value = 0xFF;
  offset = p.write(view, offset);
  equals(offset, 2);

  var p2 = new netprop.u8();
  offset = p2.read(view, 0);
  equals(p2.value, 0xAB);
  offset = p2.read(view, offset);
  equals(offset, 2);
  equals(p2.value, 0xFF);
});

test("netprop.i8", function() {
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop.i8();
  p.value = -123;
  var offset = p.write(view, 0);
  p.value = 123;
  offset = p.write(view, offset);
  equals(offset, 2);

  var p2 = new netprop.i8();
  offset = p2.read(view, 0);
  equals(p2.value, -123);
  offset = p2.read(view, offset);
  equals(offset, 2);
  equals(p2.value, 123);
});

test("netprop.f32", function() {
  // Work around double->float truncation.
  var tmp = new Float32Array([1234.5678, 8765.4321]);
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop.f32();
  p.value = tmp[0];
  var offset = p.write(view, 0);
  p.value = tmp[1];
  offset = p.write(view, offset);
  equals(offset, 8);

  var p2 = new netprop.f32();
  offset = p2.read(view, 0);
  equals(p2.value, tmp[0]);
  offset = p2.read(view, offset);
  equals(offset, 8);
  equals(p2.value, tmp[1]);
});

test("netprop.f64", function() {
  var tmp = new Float64Array([1234.5678, 8765.4321]);
  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  var p = new netprop.f64();
  p.value = tmp[0];
  var offset = p.write(view, 0);
  p.value = tmp[1];
  offset = p.write(view, offset);
  equals(offset, 16);

  var p2 = new netprop.f64();
  offset = p2.read(view, 0);
  equals(p2.value, tmp[0]);
  offset = p2.read(view, offset);
  equals(offset, 16);
  equals(p2.value, tmp[1]);
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

test("netobject_inherit", function() {
  function testobj() {
    netobject.call(this, {a: netprop.u8, b: netprop.u32});
  }
  testobj.prototype = netobject.register(testobj);

  function subobj() {
    testobj.call(this);
  }
  subobj.prototype = netobject.register(subobj, testobj);

  var s = new subobj();
  ok("a" in s);
  ok("b" in s);

  var buf = new ArrayBuffer(32);
  var view = new DataView(buf);
  s.a = 255;
  s.b = 0xABCD1234;
  equals(s.write(view, 0), 5);

  var s2 = new subobj();
  equals(s2.read(view, 0), 5);
  equals(s2.a, s.a);
  equals(s2.b, s.b);
});

test("server_net", function() {
  var packetReceived = false;
  var server = new server_net();
  var client = new client_net({send: function(data) {}}); // client doesn't send any data.
  client.onupdate = function() {
     packetReceived = true;
  };
  var sclient = new server_client({send: function(data) { client.recv(data); }});
  server.addClient(sclient);

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

  ok(packetReceived);
  equals(client.things.length, 3);

  var thing1_read = client.things[0];
  ok(thing1_read instanceof thing);
  equals(thing1_read.a, thing1.a);
  equals(thing1_read.b, thing1.b);

  var thing2_read = client.things[1];
  ok(thing2_read instanceof thing);
  equals(thing2_read.a, thing2.a);
  equals(thing2_read.b, thing2.b);
  notStrictEqual(thing1_read.a, thing2_read.a);
  notStrictEqual(thing1_read.b, thing2_read.b);

  var thing3_read = client.things[2];
  ok(thing3_read instanceof anotherthing);
  equals(thing3_read.x, thing3.x);
});

test("client_net", function() {
  function myinput() {
    netobject.call(this, {a: netprop.u8});
  }
  myinput.prototype = netobject.register(myinput);

  var server = new server_net();
  var sclient = new server_client({send: function(data) { client.recv(data); }});
  var client = new client_net({send: function(data) { sclient.recv(data); }}, myinput);
  server.addClient(sclient);

  var inputs = [];
  sclient.oninput = function(input) {
    inputs.push(input);
  };

  var i = client.getNextInput();
  i.a = 10;
  i = client.getNextInput();
  i.a = 100;
  i = client.getNextInput();
  i.a = 200;
  client.sendToServer();
  equals(inputs.length, 3);
  equals(inputs[0].a, 10);
  equals(inputs[1].a, 100);
  equals(inputs[2].a, 200);

  inputs = [];
  i = client.getNextInput();
  i.a = 0;
  client.sendToServer();
  equals(inputs.length, 1);
  equals(inputs[0].a, 0);
});
