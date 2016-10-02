(function(scope) {
  'use strict';
  scope.files = undefined;
  scope.noEntryPoint = false;
  scope.multipleEntryPoints = false;
  scope.entryPoints = [];
  scope.working = false;
  scope.hasData = false;
  scope.api = undefined;
  scope.errors = [];
  scope.selectedOutput = 0;
  scope.ramlFileUrl = 'https://raw.githubusercontent.com/raml-apis/XKCD/production/api.raml';

  var parser = {
    candidates: [],
    findRamlCandidate: function(entries) {
      this.candidates = [];
      let promises = [];
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.isFile || entry instanceof File) {
          let name = entry.name;
          if (name.substr(name.lastIndexOf('.') + 1) === 'raml') {
            let path = entry.fullPath;
            if (!path) {
              path = '/' + name;
            }
            let obj = {
              name: name,
              entry: entry,
              path: path.substr(0, path.lastIndexOf(name))
            };
            this.candidates.push(obj);
          }
        } else if (entry.isDirectory) {
          promises.push(this.getDirectoryCandidates(entry));
        }
      }

      return Promise.all(promises).then((candidates) => {
        candidates = this.candidates.concat(candidates);
        candidates = candidates.filter((item) => item !== null);
        let list = [];
        candidates.forEach((item) => {
          if (item instanceof Array) {
            list = list.concat(item);
          } else {
            list.push(item);
          }
        });
        this.candidates = list;
        return this.candidates;
      });
    },

    getDirectoryCandidates: function(entry) {
      if (entry.isDirectory) {
        return new Promise((resolve, reject) => {
          let reader = entry.createReader();
          let all = [];
          var readEntries = () => {
            reader.readEntries((results) => {
              if (!results.length) {
                Promise.all(all).then((candidates) => {
                  candidates = candidates.filter((item) => item !== null);
                  if (candidates.length === 0) {
                    candidates = null;
                  } else {
                    let list = [];
                    candidates.forEach((item) => {
                      if (item instanceof Array) {
                        list = list.concat(item);
                      } else {
                        list.push(item);
                      }
                    });
                    candidates = list;
                  }
                  // console.log('candidates', candidates);
                  resolve(candidates);
                });
              } else {
                for (let i = 0; i < results.length; i++) {
                  all.push(this.getDirectoryCandidates(results[i]));
                }
                readEntries();
              }
            }, reject);
          };
          readEntries();
        });
      } else if (entry.isFile) {
        let name = entry.name;
        if (name.substr(name.lastIndexOf('.') + 1) === 'raml') {
          let path = entry.fullPath;
          return Promise.resolve({
            name: name,
            entry: entry,
            path: path.substr(0, path.lastIndexOf(name))
          });
        }
      }
      return Promise.resolve(null);
    }
  };

  scope._processFile = (e) => {
    scope.hasData = false;
    scope.files = undefined;
    scope.noEntryPoint = false;
    scope.multipleEntryPoints = false;
    scope.entryPoints = [];
    scope.api = undefined;

    let file = e.detail.file;
    scope.files = file;
    parser.findRamlCandidate(file).then((candidates) => {

      if (candidates.length === 1) {
        scope.parseRaml(candidates[0]);
        return;
      }
      // find a main file in the root dir
      let entryPoints = [];

      let minLen = -1;
      candidates.forEach((item) => {
        let len = item.path.length;
        if (minLen === -1) {
          minLen = len;
          entryPoints = [item];
        } else if (len < minLen) {
          minLen = len;
          entryPoints = [item];
        } else if (len === minLen) {
          // multiple candidates in current path.
          entryPoints.push(item);
        }
      });

      if (entryPoints.length === 0) {
        scope.noEntryPoint = true;
        return;
      }
      scope.noEntryPoint = false;
      if (entryPoints.length > 1) {
        scope.multipleEntryPoints = true;
        scope.entryPoints = entryPoints;
        return;
      }
      // Process file.
      scope.parseRaml(entryPoints[0]);
    });
  };

  scope._useEntryPoint = (e) => {
    var item = e.model.get('item');
    scope.multipleEntryPoints = false;
    scope.entryPoints = [];
    scope.parseRaml(item);
  };

  scope.parseRaml = (item) => {
    scope.working = true;

    let detail = {
      'file': item.entry,
      'files': scope.files
    };
    let event = scope.fire('parse-raml-file', detail);
    if (!event.detail.raml) {
      console.error('Event did not contained raml property.');
      return;
    }

    event.detail.raml
      .then((api) => {
        scope.api = api;
        scope._displayApiStructure();
        // scope._highlightApiJson();
        scope.errors = api.errors();
      })
      .catch((e) => {
        console.warn('API error', e);
        scope.working = false;
      });
  };

  scope._highlightApiJson = () => {
    window.setTimeout(() => {
      let obj = scope.api.expand(true).toJSON({
        dumpSchemaContents: true,
        rootNodeDetails: true,
        serializeMetadata: true
      });
      let txt = JSON.stringify(obj);
      let event = scope.fire('syntax-highlight', {
        code: txt,
        lang: 'js'
      });
      scope.$.out.innerHTML = event.detail.code;
      scope.working = false;
      scope.hasData = true;
    }, 1);
  };

  scope._displayApiStructure = () => {
    window.setTimeout(() => {
      let txt = '';
      scope.api.allResources().forEach((resource) => {
        let rName = resource.displayName();
        let rUri = resource.absoluteUri();
        txt += rName + ' <small>' + rUri + '</small>\n';
        resource.methods().forEach((method) => {
          let mName = method.displayName ? method.displayName() : null;
          let mMethod = method.method ? method.method() : 'unknown';
          let mDesc = method.description ? method.description() : null;
          if (mDesc) {
            mDesc = mDesc.value();
          }
          if (mName) {
            txt += '  ' + mName + ' <small>' + mMethod + '</small>\n';
          } else {
            txt += '  ' + mMethod + '\n';
          }
          txt += '  <small>' + mDesc + '</small>\n';
        });
      });
      scope.$.outStruct.innerHTML = txt;
      scope.working = false;
      scope.hasData = true;
    }, 2);
  };

  scope.toggleJson = () => {
    scope.$.jsonOutput.toggle();
  };
  scope.toggleStruct = () => {
    scope.$.structureOutput.toggle();
  };

  scope._downloadRaml = () => {
    var url = scope.ramlFileUrl;
    if (!url) {
      return;
    }
    scope.working = true;

    let detail = {
      'url': url
    };
    let event = scope.fire('parse-raml-url', detail);
    if (!event.detail.raml) {
      console.error('Event did not contained raml property.');
      return;
    }

    event.detail.raml
      .then((api) => {
        scope.api = api;
        scope._displayApiStructure();
        // scope._highlightApiJson();
        scope.errors = api.errors();
      })
      .catch((e) => {
        console.warn('API error', e);
        scope.working = false;
      });
  };

})(document.querySelector('#app'));
