"use strict";

var Q = require("q");

module.exports = function (params) {
    var deferred = Q.defer();

    console.log({ watchProjectSrc: params.src });
    params.client.command(["watch", params.src], (error, resp) => {
        if (error) {
            deferred.reject(error);
        } else {
            console.log({ resp });
            deferred.resolve(resp);
        }
    });

    return deferred.promise;
};
