/* global importScripts, self */
importScripts('polyfills.js', 'browser/index.js', 'raml2object.js');

self.onmessage = function(e) {
  var result = raml2obj.parse(e.data.raml);
  self.postMessage({
    result: result,
    state: e.data.state
  });
};
