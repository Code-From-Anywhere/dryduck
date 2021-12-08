"use strict";

require("colors");

var path = require("path");

var capabilityCheck = require("../capabilityCheck.js");
var watchProject = require("../watchProject.js");
var getConfig = require("../getConfig.js");
var subscribe = require("../subscribe.js");
var watchman = require("fb-watchman");
var links = require("../links.js");
var copyHandler = require("../handlers/copy.js");
var untildify = require("untildify");

exports.command = "start";

exports.describe = "Starts watching all links";

exports.builder = {};

function onLinksChange(onChange) {
    return function (resp) {
        console.log("check onLinksChange");
        var hasLinksChanged = resp.files.some(function (file) {
            return file.name === "dryduck.config.json";
        });

        if (hasLinksChanged) {
            console.log("check onLinksChange, hasLinksChanged");
            onChange();
        }
    };
}

function watchForLinkChanges(onChange) {
    var linksPath = path.resolve("."); //path.resolve(__dirname, '../');
    console.log({ linksPath2: linksPath });
    const client = new watchman.Client();
    watchProject({
        client: client,
        src: linksPath,
    });
    return subscribe({
        client,
        watch: linksPath,
        src: linksPath,
        handler: onLinksChange(onChange),
    });
}
var watchers = [];

function getAbsoluteLink(src) {
    return path.resolve(untildify(src));
}

function startWatcher(link, linkId) {
    //console.log({oldSrc: link.src});
    link.src = getAbsoluteLink(link.src);
    link.dest = getAbsoluteLink(link.dest);

    console.log("startWatcher", { link });
    if (!link.enabled) {
        return;
    }

    var client = new watchman.Client();
    var relativePath;
    var watch;

    watchers[linkId] = client;

    capabilityCheck({
        client: client,
    })
        .then(() => {
            return watchProject({
                client: client,
                src: link.src,
            });
        })
        .then((resp) => {
            if ("warning" in resp) {
                console.log("[watch-warning]".yellow, resp.warning);
            }

            console.log("[watch]".green, resp.watch, resp.relative_path);

            relativePath = resp.relative_path;
            watch = resp.watch;

            return getConfig({
                client: client,
                src: link.src,
            });
        })
        .then((resp) => {
            console.log("[watch-config]".green, resp.config);

            return subscribe({
                client: client,
                watch: watch,
                relativePath: relativePath,
                src: link.src,
                handler: copyHandler({
                    src: link.src,
                    dest: link.dest,
                }),
            });
        })
        .then(
            () => {
                console.log("[subscribe]".green, link.src);
            },
            (err) => {
                client.end();

                var error = err.watchmanResponse
                    ? err.watchmanResponse.error
                    : err;

                console.log("[error]".red, error);

                throw err;
            }
        )
        .done();

    return client;
}

function stopWatcher(watcher, src, dest) {
    watcher.end();
    console.log("[end]".green, src, "->", dest);
}

function updateWatchers() {
    var prevLinks = links.data,
        i;

    links.load();

    // Create new watchers and change current watchers state
    //
    for (i in links.data) {
        var link = links.data[i],
            prevLink = prevLinks[i] || {};

        console.log({ prevEnabled: prevLink.enabled, enabled: link.enabled });
        if (!prevLink.enabled && link.enabled) {
            watchers[i] = startWatcher(links.data[i], i);
        } else if (prevLink.enabled && !link.enabled) {
            stopWatcher(watchers[i], link.src, link.dest);
            delete watchers[i];
        }

        delete prevLinks[i];
    }

    // Turn off all previous watchers that didn't exists in current links list
    //
    for (i in prevLinks) {
        stopWatcher(watchers[i], link.src, link.dest);
        delete watchers[i];
    }
}

exports.handler = () => {
    watchForLinkChanges(updateWatchers);
};
