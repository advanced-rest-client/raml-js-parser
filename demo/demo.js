(function(scope) {
  'use strict';
  scope.files = undefined;
  scope.noEntryPoint = false;
  scope.multipleEntryPoints = false;
  scope.entryPoints = [];
  scope.ramlFile = undefined;
  scope.working = false;

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
        this.candidates = this.candidates.concat(candidates);
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
    let file = e.detail.file;
    scope.files = file;
    parser.findRamlCandidate(file).then((candidates) => {

      candidates = candidates.filter((item) => item !== null);
      let list = [];
      candidates.forEach((item) => {
        if (item instanceof Array) {
          list = list.concat(item);
        } else {
          list.push(item);
        }
      });
      candidates = list;
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
          console.log('multiple candidates in current path.');
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
    scope.parseRaml(item);
  };

  scope.parseRaml = (item) => {
    scope.working = true;
    scope.ramlFile = item;
    scope.$.parser.loadFiles()
    .then((api) => {
      console.log('API', api);
      window.setTimeout(() => {
        let txt = JSON.stringify(api.toJSON());
        scope.$.out.innerText = txt;
        scope.working = false;
      }, 1000);
    })
    .catch((e) => {
      console.warn('API error', e);
      scope.working = false;
    });
  };

})(document.querySelector('#app'));
