import * as itf from "./interfaces";

export const EPOCH = 5 * 60 * 1000; // monitoring interval
export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function parseCommandLine(argv: string[]): any {
    const res: any = { _: [] };

    let last_switch: string | null = null;
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

/** Standard Normal variate using Box-Muller transform. */
export function randomGaussian(random: itf.IRandom): number {
    let u = 0;
    let v = 0;
    while (u === 0) {
        u = random.random(); // converting [0,1) to (0,1)
    }
    while (v === 0) {
        v = random.random();
    }
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function convertGdrToCombinedRec(data2: itf.IGdrRecordD[]): itf.ICombinedRecordD[] {
    const cols: string[] = [];
    const data: itf.IGdrRecord[] = data2.map<itf.IGdrRecord>(x => ({
        extra_data: x.extra_data,
        tags: x.tags,
        ts: x.ts.getTime(),
        values: x.values
    }));

    // collect all possible data columns
    const ts_1 = data[0].ts;
    for (let i = 0; i < data.length && data[i].ts == ts_1; i++) {
        const r = data[i];
        const col_name_base = Object.keys(r.tags)
            .map(tag => `${tag}=${r.tags[tag]}`)
            .join(".");

        Object.keys(r.values).forEach(val_name => {
            const col_name = `${col_name_base}.${val_name}`.replace(/^\./gi, "");
            cols.push(col_name);
        });
    }

    const res: itf.ICombinedRecordD[] = [];
    let curr_ts = -1;
    let curr_rec: itf.ICombinedRecordD = {
        is_anomaly: "nominal",
        ts: new Date(curr_ts),
        values: {}
    };
    for (const r of data) {
        if (r.ts != curr_ts) {
            curr_ts = r.ts;
            const values: itf.ICombinedRecordDValues = {};
            cols.forEach(col => values[col] = 0);
            curr_rec = { is_anomaly: "nominal", ts: new Date(curr_ts), values };
            res.push(curr_rec);
        }
        if (r.tags.anomaly_indicator == "true") {
            curr_rec.is_anomaly = r.extra_data.is_anomaly;
            continue;
        }
        const col_name_base = Object.keys(r.tags)
            .map(tag => `${tag}=${r.tags[tag]}`)
            .join(".");
        Object.keys(r.values).forEach(val_name => {
            const col_name = `${col_name_base}.${val_name}`.replace(/^\./gi, "");
            curr_rec.values[col_name] = r.values[val_name];
        });
    }
    return res;
}

/** Based on: https://memory.psych.mun.ca/tech/js/correlation.shtml */ 
export function pearson(x: number[], y: number[]): number {
    let len = Math.min(x.length, y.length);

    if (len == 0) {
        return 0;
    }

    const xy: number[] = [];
    const x2: number[] = [];
    const y2: number[] = [];

    for (let i = 0; i < len; i++) {
        xy.push(x[i] * y[i]);
        x2.push(x[i] * x[i]);
        y2.push(y[i] * y[i]);
    }

    let sum_x = 0;
    let sum_y = 0;
    let sum_xy = 0;
    let sum_x2 = 0;
    let sum_y2 = 0;

    for (let i = 0; i < len; i++) {
        sum_x += x[i];
        sum_y += y[i];
        sum_xy += xy[i];
        sum_x2 += x2[i];
        sum_y2 += y2[i];
    }

    const step1 = (len * sum_xy) - (sum_x * sum_y);
    const step2 = (len * sum_x2) - (sum_x * sum_x);
    const step3 = (len * sum_y2) - (sum_y * sum_y);
    const step4 = Math.sqrt(step2 * step3);
    const answer = step1 / step4;

    return answer;
}
