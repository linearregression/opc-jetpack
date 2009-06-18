if (this.window)
  // We're not running in xpcshell, so define print().
  function print(msg) {
    var output = document.getElementById('output');
    var text = document.createTextNode(msg + '\n');
    output.appendChild(text);
  };

print("\nRunning wrapper test suite.\n");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function wrap(object, resolver) {
  var factory = Cc["@labs.mozilla.com/jsweakrefdi;1"]
                .createInstance(Ci.nsIJSWeakRef);
  return factory.set(object, resolver);
}

function assert(a, msg) {
  if (!a)
    throw new Error("Assertion failed: " + msg);
}

function assertEqual(a, b) {
  if (a != b)
    throw new Error('"' + a + '" is not equal to ' +
                    '"' + b + '"');
}

function assertThrows(func, validator, msg) {
  try {
    func();
  } catch (e) {
    switch (typeof(validator)) {
    case "string":
      assertEqual(e.toString(), validator);
      break;
    default:
      throw new Error("Not sure what to do with " + validator);
    }
    return;
  }
  throw new Error("Assertion failed: " + msg);
}

var resolver = {
  resolve: function(wrappee, wrapper, name) {
    print("resolve on " + name);
    if (name == 'blarg') {
      print('resolving blarg now!');
      wrapper.blarg = 'boop';
      return wrapper;
    }
    if (name == 'toString') {
      wrapper.toString = function() { return "[my wrapped object]"; };
      return wrapper;
    }
  },

  enumerateCalled: false,

  enumerate: function(wrappee, wrapper) {
    this.enumerateCalled = true;
  },

  addProperty: function(wrappee, wrapper, name, defaultValue) {
    if (name == 'foo')
      return defaultValue + 1;
    return defaultValue;
  },

  delProperty: function(wrappee, wrapper, name) {
    if (name == 'foo') {
      print('delProperty ' + name);
      // TODO: We'd like to just return false here to indicate that
      // the property can't be deleted, as specified in MDC, but this
      // doesn't seem to do anything, so we'll throw an exception.
      throw new Error('no wai');
    }
    return true;
  },

  getProperty: function(wrappee, wrapper, name, defaultValue) {
    print('get ' + name);
    if (name == "nom")
      return "nowai";
    return defaultValue;
  },

  setProperty: function(wrappee, wrapper, name, defaultValue) {
    print('set ' + name);
    if (name == 'foo')
      return defaultValue + 1;
    return defaultValue;
  }
};

var object = {a: 5};
var wrapped = wrap(object, resolver);

// TODO: Not sure what these should actually evaluate to
// given our resolver, but at the very least they shouldn't cause infinite
// recursion!
for each (name in ["__parent__", "__proto__", "prototype", "constructor"]) {
  assert(wrapped[name] || !wrapped[name],
         name + " shouldn't result in crash");
}

assertEqual(typeof(wrapped), "object");
assertEqual(wrapped.toString(), "[my wrapped object]");

assertEqual(wrapped.blarg, "boop");
assertEqual(wrapped.blarg, "boop");

assertEqual(resolver.enumerateCalled, false);
for (name in wrapped) {}
assertEqual(resolver.enumerateCalled, true);

wrapped.foo = 2;
assertEqual(wrapped.foo, 4);

assertThrows(function() { delete wrapped.foo; },
             "Error: no wai",
             "property delete handlers should work");

assertEqual(wrapped.foo, 4);

assertEqual(wrapped.nom, "nowai");

assertEqual(wrapped, wrapped);

assert(wrapped === wrapped, "a wrapper instance must be === to itself");
assert(wrap(object, resolver) === wrap(object, resolver),
       "a wrapper instance must be === to another wrapper instance of " +
       "the same target object");
assert(wrap({}, resolver) !== wrap({}, resolver),
       "a wrapper instance must be !== to another wrapper instance of " +
       "a different target object");

var sandbox = new Cu.Sandbox("http://www.google.com");
sandbox.wrapped = wrapped;
assertEqual(Cu.evalInSandbox("wrapped.nom", sandbox), "nowai");

assertEqual(wrap(
              {},
              {equality: function(wrappee, wrapper, v) {
                 return v.blah == "beans";
               }}),
            {blah: "beans"});

wrapped = wrap({}, {});
assertEqual(wrapped.blargle, undefined);

function testGCWorks() {
  var resolver = {
    getProperty: function(wrappee, wrapper, name, defaultValue) {
      if (name == "foo")
        return "bar";
      return defaultValue;
    }
  };
  var obj = new Object();

  var weakResolver = Cu.getWeakReference(resolver);
  var weakObj = Cu.getWeakReference(obj);

  var wrapped = wrap(obj, resolver);
  resolver = undefined;
  obj = undefined;

  Cu.forceGC();

  assert(weakResolver.get(), "weakResolver should still exist");
  assert(weakObj.get(), "weakObj should still exist");
  assertEqual(wrapped.foo, "bar");
  wrapped = undefined;
  Cu.forceGC();
  assertEqual(weakResolver.get(), null);
  assertEqual(weakObj.get(), null);
}

testGCWorks();

assertThrows(function() {
               var funcWrapper = wrap(function(x) { return x + 1; }, {});
               funcWrapper(1);
             },
             "Error: Either the object isn't callable, or the " +
             "caller doesn't have permission to call it.",
             "By default, wrappers shouldn't allow function calls.");

var funcWrapper = wrap(function(x) { return x + 1; },
                       {call: function(wrappee, wrapper, thisObj, args) {
                          return wrappee.apply(thisObj, args);
                        }});
assertEqual(typeof(funcWrapper), "function");
assertEqual(funcWrapper(1), 2);

print("All tests passed!");
