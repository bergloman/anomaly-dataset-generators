////////////////////////////////////////////////////////////////
// Runs data generator
////////////////////////////////////////////////////////////////

import * as g_dc from "./datacenter/generator_datacenter";
import * as g_pa from "./parking/generator_parking";
import * as w from "./writer";
import * as itf from "./interfaces";
import * as fs from "fs";
import { convertGdrToCombinedRec, parseCommandLine } from "./utils";

const argv = parseCommandLine(process.argv.slice(2));
if (!argv.f) {
    throw new Error("Missing parameter -f (input file)");
}
argv.t = argv.t || "ldjson";
const skip_timestamp = (!!argv.skip_timestamp);
const normalize_hours = (!!argv.normalize_hours);

let output: w.OutputFunc = (line: string) => console.log(line);
if (argv.o) {
    output = (line: string) => fs.appendFileSync(argv.o, line + "\n", { encoding: "utf8" });
}
argv.generator = argv.generator || "datacenter";
let data2: itf.ICombinedRecordD[] = [];
if (argv.generator == "parking") {
    data2 = g_pa.main(argv.f);
} else {
    const data2_tmp = g_dc.main(argv.f);
    data2 = convertGdrToCombinedRec(data2_tmp);
}

if (normalize_hours) {
    // use the first sixth of the data to calculate mean for each hour bucket and subtract it
    const init_block_size = Math.floor(data2.length / 6);
    const collect_a = JSON.parse(JSON.stringify(data2[0].values));
    Object.keys(collect_a).forEach(key => {
        collect_a[key] = 0;
    });
    const by_hour: Array<{ cnt: number, values: itf.ICombinedRecordDValues }> = [];
    for (let i = 0; i < 24; i++) {
        by_hour.push({
            cnt: 0,
            values: JSON.parse(JSON.stringify(collect_a))
        });
    }

    for (let i = 0; i < init_block_size; i++) {
        const rec = data2[i];
        const h = new Date(rec.ts).getHours();
        const target = by_hour[h];
        target.cnt++;
        Object.keys(rec.values).forEach(key => {
            target.values[key] += rec.values[key];
        });
    }
    by_hour.forEach(hour_rec => {
        Object.keys(hour_rec.values).forEach(key => {
            hour_rec.values[key] /= hour_rec.cnt;
        });
    });
    for (const rec of data2) {
        const h = new Date(rec.ts).getHours();
        const target = by_hour[h];
        Object.keys(rec.values).forEach(key => {
            rec.values[key] -= target.values[key];
        });
    }
}

const writer = new w.WriterCsvCombined(output, !skip_timestamp);
data2.forEach(x => writer.addRec(x));

console.log(`Finished output=${argv.o}`);
