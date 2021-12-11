const debug = (...data) => {
    if (process.env.DEBUG) {
        console.log(...data);
    }
};

module.exports = { debug };
