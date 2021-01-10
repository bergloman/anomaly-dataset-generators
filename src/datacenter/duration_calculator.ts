import * as intf from "./interfaces";
import * as i from "../interfaces";
import { randomGaussian } from "../utils";

export class DurationCalculator implements intf.IDurationCalculator {

    private configs: intf.IDurationConfigEx[];
    private random: i.IRandom;
    private relaxed: boolean;

    constructor(
        config: intf.IDurationConfig[], random: i.IRandom,
        ts_start: number, ts_end: number, relaxed: boolean
    ) {
        this.configs = config.map((x): intf.IDurationConfigEx => ({
            max: x.max,
            max_ts: x.max_ts,
            max_ts_num: (x.max_ts ? (new Date(x.max_ts)).getTime() : ts_end),
            mean: x.mean,
            min: x.min,
            min_ts: x.min_ts,
            min_ts_num: (x.min_ts ? (new Date(x.min_ts)).getTime() : ts_start),
            std_dev: x.std_dev,
            type: x.type
        }));
        this.random = random;
        this.relaxed = relaxed;
    }

    public getDuration(now: number): number {
        const config = this.getActiveDurationConfig(now);
        const random = this.random;
        if (config.type === "uniform") {
            return (config.min || 0) + random.random() * ((config.max || 0) - (config.min || 0));
        }
        if (config.type === "gauss") {
            const val = (config.mean || 0) + (config.std_dev || 0) * randomGaussian(random);
            return Math.floor(val < 0 ? 0 : val);
        }
        if (config.type === "linear") {
            const ratio = (now - config.min_ts_num) / (config.max_ts_num - config.min_ts_num);
            let val = (config.min || 0) + ratio * ((config.max || 0) - (config.min || 0));
            if (config.std_dev) {
                val += config.std_dev * randomGaussian(random);
            }
            return val;
        }
        if (config.type === "hourly") {
            const hod = new Date(now).getHours();
            const val = (config.hours || [])[hod] + (config.std_dev || 0) * randomGaussian(random);
            return Math.floor(val < 0 ? 0 : val);
        }
        throw new Error("Unknown duration to generate: " + JSON.stringify(config));
    }

    private getActiveDurationConfig(now: number): intf.IDurationConfigEx {
        let hits1 = this.configs;
        if (!this.relaxed) {
            hits1 = this.configs.filter(x =>
                (!x.min_ts || x.min_ts_num < now) &&
                (!x.max_ts || x.max_ts_num > now)
            );
        }
        if (hits1.length === 0) {
            console.log("@@", this.configs);
            throw new Error(
                "Active duration config not found: " + new Date(now).toISOString() + " " + JSON.stringify(this.configs)
            );
        }
        return hits1[0];
    }
}
