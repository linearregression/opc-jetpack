function onmessage(event) {
  postMessage(analyzeResult(event.data));
}

function analyzeResult(result) {
  var data = JSON.parse(result);
  var graph = data.graph;

  // Convert keys in the graph from strings to ints.
  // TODO: Can we get rid of this ridiculousness?
  var newGraph = {};
  for (id in graph) {
    newGraph[parseInt(id)] = graph[id];
  }
  graph = newGraph;

  // Cull children to the ones that actually exist in our graph.
  for (id in graph)
    graph[id].children = [graph[childId]
                          for each (childId in graph[id].children)
                          if (childId in graph)];

  // Add function and referent information to the graph.
  for (id in graph)
    graph[id].referents = [];
  var functions = {};
  var windows = {};
  var graphFuncs = [];
  for (id in graph) {
    var info = graph[id];

    // Add function info.
    if (info.filename &&
        info.filename.indexOf("http") == "0") {
      var name = info.name;
      if (!name)
        name = "anonymous";
      var idParts = [name, info.filename, info.lineStart, info.lineEnd];
      var id = idParts.join(":");
      if (!(id in functions)) {
        functions[id] = {name: name,
                         filename: info.filename,
                         lineStart: info.lineStart,
                         lineEnd: info.lineEnd,
                         instances: 0,
                         referents: 0,
                         protoCount: 0,
                         isGlobal: false,
                         rating: 0};
      }
      functions[id].instances += 1;
      info.funcInfo = functions[id];
      graphFuncs.push(info);
    }

    // Add referent info.
    info.children.forEach(function(child) {
      child.referents.push(info);
    });
  }

  function trackProtoCount(info) {
    if (typeof(info.protoCount) == "undefined") {
      var protoCount = 0;
      info.referents.forEach(
        function(refInfo) {
          if (refInfo.nativeClass == 'Object' &&
              refInfo.prototype == info.id) {
            protoCount += 1 + trackProtoCount(refInfo);
          }
        });
      info.protoCount = protoCount;
    }
    return info.protoCount;
  }

  function makeWindowInfo(info) {
    return {references: info.children.length,
            referents: info.referents.length};
  }

  graphFuncs.forEach(
    function(info) {
      info.funcInfo.referents = info.referents.length;
      info.referents.forEach(
        function(refInfo) {
          switch (refInfo.nativeClass) {
          case 'Window':
            info.funcInfo.isGlobal = true;
            if (!(refInfo.id in windows))
              windows[refInfo.id] = makeWindowInfo(refInfo);
            break;
          case 'Object':
            info.funcInfo.protoCount += trackProtoCount(refInfo);
            break;
          }
        });

      info.funcInfo.rating = (info.funcInfo.protoCount +
                              info.funcInfo.instances +
                              info.funcInfo.referents);
    });

  return JSON.stringify({functions: functions,
                         windows: windows,
                         rejectedTypes: data.rejectedTypes});
}