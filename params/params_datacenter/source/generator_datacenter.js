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

const TMPL_TYPE1_ERR = {
    tag: "type1",
    from: "2017-02-24T05:15:00Z",
    to: "2017-02-24T06:19:00Z",
    // services: [],
    error_rate: 0.5
};
const TMPL_TYPE1_DUR = {
    tag: "type1",
    from: "2017-03-12T12:04:00Z",
    to: "2017-03-12T14:19:00Z",
    // services: [],
    duration: { type: "gauss", avg: 5000, variance: 100 }
};
const TMPL_TYPE2 = {
    tag: "type2",
    from: "2017-02-01T00:00:00",
    to: "2017-02-02T12:00:00",
    services: []
};
const TMPL_TYPE3 = {
    tag: "type3",
    from: "2017-03-12T00:00:00",
    to: "2017-03-15T00:00:00",
    services: ["serviceA"],
    disruption: { type: "linear", min: 1100, max: 2500, variance: 20, min_ts: "2017-03-12", max_ts: "2017-03-15" }
};


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
        case "type1": return Math.round((0.25 + 0.5 * Math.random()) * HOUR);
        case "type2": return Math.round(Math.random() * 1 * DAY);
        case "type3": return Math.round((2 + Math.random() * 3) * DAY);
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

function getMaxDurationOfServices(all_services, selected_names) {
    const svc_durations = all_services
        .filter(x => !selected_names || selected_names.indexOf(x.name) >= 0)
        .map(x => x.duration);
    return Math.max.apply(Math, svc_durations);
}

function runSingle(complexity, disrupt) {

    let ts1 = TS_MIN + 30 * DAY;

    const src = JSON.parse(
        fs.readFileSync(path.join(__dirname, `params.${complexity}.json`))
    );
    const servers = src.servers.map(x => x.name);
    const services = src.services.map(x => x.name);
    const service_durations = src.services.map(x => ({
        name: x.name,
        duration: x.durations[0].avg
    }));
    // prepare some terrain
    src.general = d_config.general;
    for (const service of src.services) {
        // we assume single duration is present per service
        service.durations[0].min_ts = new Date(TS_MIN - DAY).toISOString();
        service.durations[0].max_ts = new Date(TS_MAX + DAY).toISOString();
    }
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
        if (anom.type === "type1") {
            const is_server = Math.random() > 0.5;
            const is_call_duration = Math.random() > 0.5;
            let rec = null;
            if (is_call_duration) {
                rec = JSON.parse(JSON.stringify(TMPL_TYPE1_DUR));
            } else {
                rec = JSON.parse(JSON.stringify(TMPL_TYPE1_ERR));
            }
            if (is_server) {
                rec.servers = getRandomSubset(servers);
            } else {
                rec.services = getRandomSubset(services);
            }
            if (is_call_duration) {
                // make duration 10x the normal value
                const max_dur = getMaxDurationOfServices(service_durations, rec.services);
                rec.duration.avg = 10 * max_dur;
            }
            rec.from = anom.dt1.toISOString();
            rec.to = anom.dt2.toISOString();
            src.disruptions.push(rec);
        } else if (anom.type === "type2") {
            // todo
            const rec = JSON.parse(JSON.stringify(TMPL_TYPE2));
            rec.services = getRandomSubset(services).slice(0, 1);
            rec.from = anom.dt1.toISOString();
            rec.to = anom.dt2.toISOString();

            const current_service = src.services.filter(x => x.name === rec.services[0])[0];
            const old_duration = current_service.durations[current_service.durations.length - 1];
            const new_duration = JSON.parse(JSON.stringify(old_duration));
            old_duration.max_ts = anom.dt1.toISOString();
            new_duration.min_ts = old_duration.max_ts;
            const old_value = old_duration.avg;
            const new_value = old_value * (Math.random() > 0.5 ? 1.4 : 0.6);
            new_duration.avg = new_value;
            current_service.durations.push(new_duration);

            src.disruptions.push(rec);

        } else if (anom.type === "type3") {
            const rec = JSON.parse(JSON.stringify(TMPL_TYPE3));
            rec.services = getRandomSubset(services);
            rec.from = anom.dt1.toISOString();
            rec.to = anom.dt2.toISOString();
            rec.disruption.min_ts = rec.from;
            rec.disruption.max_ts = rec.to;

            // calculate increase of duration, starting at 110% of normal
            // and finish at 1000%
            const max_dur = getMaxDurationOfServices(service_durations, rec.services);
            rec.disruption.min = max_dur * 1.1;
            rec.disruption.max = max_dur * 10;

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
