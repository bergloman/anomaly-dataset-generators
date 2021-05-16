// npm install asciichart

const ac = require("asciichart");
const fs = require("fs");

const content = fs.readFileSync(process.argv[2], { encoding: "utf8" });
const cells = content.split("\n")
    .filter(line => line.trim().length > 0 && !line.startsWith("#"))
    .map(line => line.split(",").map(x => x.trim()));

const START = 100;
const LEN = 180;

const rows = cells.slice(1);
const s0 = rows
    .slice(START, START + LEN)
    .map(x => 100 * (+x[2]));
const s1 = rows
    .slice(START, START + LEN)
    .map(x => 100 * (+x[3]));
const s2 = rows
    .slice(START, START + LEN)
    .map(x => 100 * (+x[4]));

const config = {
    colors: [
        ac.blue,
        ac.green,
        ac.default,
        undefined
    ],
    height: 10
};

console.log(ac.plot([s0, s1, s2], config));
