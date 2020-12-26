const fs = require("fs");
const path = require("path");

const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

const d_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, "disruption_config.json"))
);

const TS_MIN = new Date(d_config.general.from).getTime();
const TS_MAX = new Date(d_config.general.to).getTime();

const TMPL_TYPEB = { tag: "type-b", from: "2017-02-24T05:15:00Z", to: "2017-02-24T06:19:00Z", x: 0, y: 0 };
const TMPL_TYPEE = { tag: "type-e", from: "2017-02-01T00:00:00", to: "2017-02-02T12:00:00", x: 0, y: 0 };
const TMPL_TYPER = { tag: "type-r", from: "2017-03-12T00:00:00", to: "2017-03-15T00:00:00", parking_lot_id: 0 };

/** Returns a random permutation of N numbers - 0..(N-1) */
function getRandomPermutation(len) {
    const rsort = new Array(len);
    for (let idx = 0; idx < len; idx++) {
        rsort[idx] = idx;
    }
    for (let idx = 0; idx < len; idx++) {
        const swpIdx = idx + Math.floor(Math.random() * (len - idx));
        const tmp = rsort[idx];
        rsort[idx] = rsort[swpIdx];
        rsort[swpIdx] = tmp;
    }
    return rsort;
}

function getRandomType(types) {
    return types[Math.floor(Math.random() * types.length)];
}

function getRandomDur(type) {
    switch (type) {
        case "type-b": return Math.round((10 + 20 * Math.random()) * HOUR);
        case "type-e": return Math.round((3 + 3 * Math.random()) * HOUR);
        case "type-r": return Math.round((1 + 3 * Math.random()) * HOUR);
        default: return 1;
    }
}

function getRandomSubset(items) {
    let len = 1 + (Math.random() > 0.5 ? 1 : 0); // 1 or 2
    len = Math.min(len, items.length);
    const permutation = getRandomPermutation(items.length)
        .slice(0, len);
    return permutation.map(index => items[index]);
}

function getRandomSlot(slot_count) {
    let res = Math.floor(Math.random() * slot_count);
    if (res == slot_count) {
        res--;
    }
    return res;
}

function runSingle(complexity, disrupt) {

    let ts1 = TS_MIN + 30 * DAY;

    const src = JSON.parse(
        fs.readFileSync(path.join(__dirname, `params.${complexity}.json`))
    );

    src.general.from = new Date(TS_MIN).toISOString();
    src.general.to = new Date(TS_MAX).toISOString();
    const max_x = src.general.grid.x;
    const max_y = src.general.grid.y;
    const parking_lot_ids = src.parking_lots.map(x => x.id);
    src.disruptions = [];

    // create anomaly ranges
    const anomalies = [];
    for (let i = 0; i < disrupt.count; i++) {
        const type = getRandomType(disrupt.types);
        const t1 = Math.round(ts1 + (TS_MAX - ts1) * i / disrupt.count + Math.random() * 3 * DAY);
        const dur = getRandomDur(type);
        const t2 = t1 + dur;
        anomalies.push({ type, t1, t2, dt1: new Date(t1), dt2: new Date(t2), dur });
    }

    for (const anom of anomalies) {
        if (anom.type === "type-b") {
            const rec = JSON.parse(JSON.stringify(TMPL_TYPEB));
            rec.x = getRandomSlot(max_x);
            rec.y = getRandomSlot(max_y);
            rec.from = anom.dt1.toISOString();
            rec.to = anom.dt2.toISOString();
            src.disruptions.push(rec);

        } else if (anom.type === "type-e") {
            const rec = JSON.parse(JSON.stringify(TMPL_TYPEE));
            rec.x = getRandomSlot(max_x);
            rec.y = getRandomSlot(max_y);
            rec.from = anom.dt1.toISOString();
            rec.to = anom.dt2.toISOString();
            src.disruptions.push(rec);

        } else if (anom.type === "type-r") {
            const rec = JSON.parse(JSON.stringify(TMPL_TYPER));
            rec.from = anom.dt1.toISOString();
            rec.to = anom.dt2.toISOString();
            rec.parking_lot_id = parking_lot_ids[getRandomSlot(parking_lot_ids.length)];
            src.disruptions.push(rec);
        }
    }

    const result = (JSON.stringify(src, null, "    "));

    const dir_name = path.join(__dirname, "..", disrupt.name);
    if (!fs.existsSync(dir_name)) {
        fs.mkdirSync(dir_name);
    }
    const output_file = path.join(
        __dirname, "..", disrupt.name, `params.${complexity}.${disrupt.name}.json`);
    fs.writeFileSync(output_file, result, { encoding: "utf8" });
}

for (const complexity of d_config.complexities) {
    for (const disrupt of d_config.disruptions) {
        runSingle(complexity, disrupt);
    }
}
