"use strict";

var path = require("path");
var fs = require("fs-extra");
var { debug } = require("../util");

module.exports = function (config) {
    return function (resp) {
        for (var i in resp.files) {
            var f = resp.files[i];
            if (f.type === "f") {
                var src = path.join(config.src, f.name),
                    dest = path.join(config.dest, f.name);

                if (
                    config.ignore &&
                    config.ignore.find((folder) =>
                        f.name.startsWith(folder + "/")
                    )
                ) {
                    continue;
                }

                if (f.exists) {
                    debug("[copy]", src, "->", dest);
                    fs.copy(src, dest);
                } else {
                    debug("[delete]", dest);
                    fs.remove(dest);
                }
            }
        }
    };
};
