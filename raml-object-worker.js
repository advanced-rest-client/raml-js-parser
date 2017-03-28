/* global importScripts, self */
try {
  importScripts('polyfills.js', 'browser/index.js', 'raml2object.js');
} catch (e) {
  self.postMessage({
    error: true,
    message: 'Worker import error: ' + e.message
  });
}

self.onmessage = function(e) {
  try {
    if (performance && performance.mark) {
      performance.mark('raml-2-object-start');
    }
    var result = raml2obj.parse(e.data.raml);
    if (performance && performance.mark) {
      performance.mark('raml-2-object-end');
    }
    self.postMessage({
      result: result,
      state: e.data.state
    });
  } catch (e) {
    self.postMessage({
      error: true,
      message: 'Worker parser error: ' + e.message,
      state: e.data.state
    });
  }
};
