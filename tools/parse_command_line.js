/*jslint node: true */
/*jshint esversion: 6 */
"use strict";

/** Parses comamnd-line options into object. If no array is given the process command-line is used */
function parseCommandLine(argv) {
    argv = argv || process.argv.slice(2);
    const res = { _: [] };

    let last_switch = null;
    for (const curr of argv) {
        if (curr.slice(0, 2) == "--") {
            last_switch = curr.slice(2);
            res[last_switch] = true;
        } else if (curr.slice(0, 1) == "-") {
            last_switch = curr.slice(1);
            res[last_switch] = true;
        } else if (last_switch) {
            res[last_switch] = curr;
            last_switch = null;
        } else {
            res._.push(curr);
        }
    }

    return res;
}

exports.parseCommandLine = parseCommandLine;