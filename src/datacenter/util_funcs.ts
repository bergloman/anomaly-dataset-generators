import * as intf from "./interfaces";
import * as itf from "../interfaces";
import { randomGaussian, HOUR } from "../utils";

/** Calculate call duration given settings */
export function getDuration(config: intf.IDurationConfig, random: itf.IRandom): number {
    if (config.type === "uniform") {
        return (config.min || 0) + random.random() * ((config.max || 0) - (config.min || 0));
    }
    if (config.type === "gauss") {
        const val = (config.mean || 0) + (config.std_dev || 0) * randomGaussian(random);
        return Math.floor(val < 0 ? 0 : val);
    }
    throw new Error("Unknown duration to generate: " + JSON.stringify(config));
}

/** Given parent-child-call settings calculate how many calls should be made from parent to child */
export function getCallCount(config: intf.ICallConfig, random: itf.IRandom): number {
    if (config.type === "uniform") {
        return Math.floor((config.min || 0) + random.random() * ((config.max || 0) - (config.min || 0) + 1));
    }
    if (config.type === "gauss") {
        const val = (config.mean || 0) + (config.std_dev || 0) * randomGaussian(random);
        return Math.floor(val < 0 ? 0 : val);
    }
    throw new Error("Unknown duration to generate: " + JSON.stringify(config));
}

/** Gets N random calls within an hour */
export function getNCallsInHour(n: number, random: itf.IRandom): number[] {
    const res: number[] = [];
    for (let i = 0; i < n; i++) {
        res.push(Math.floor(random.random() * HOUR));
    }
    return res.sort();
}

/** Calculates how many calls should be made in this hour-of-day */
export function calculateCallsPerHour(config: intf.IServiceCallConfig, hod: number, random: itf.IRandom): number {
    if (config.type === "const") {
        return (hod >= config.active[0] && hod < config.active[1] ?
            config.high :
            config.low);
    } else if (config.type === "daily") {
        const t = 2 * Math.PI * (hod - config.peak) / 24;
        const val = (Math.cos(t) + 1) / 2;
        return config.low + val * (config.high - config.low);
    } else if (config.type === "hourly") {
        const val = (config.hours || [])[hod] + config.noise * randomGaussian(random);
        return Math.floor(val < 0 ? 0 : val);
    } else {
        throw new Error("Unsupported service_calls type: " + config.type);
    }
}

/** Iterates over time and generates calls for the whole time period */
export function createCallTimes(
    config: intf.IServiceCallConfig, min_ts: number, max_ts: number, random: itf.IRandom): number[] {
    let res: number[] = [];

    config.noise = config.noise || 0;
    let ts = Math.floor(min_ts / HOUR);
    const limit = Math.floor(max_ts / HOUR);

    while (ts < limit) {
        const hod = ts % 24;
        let calls_per_hour = calculateCallsPerHour(config, hod, random);
        calls_per_hour *= 1 + random.random() * config.noise;
        let calls = getNCallsInHour(calls_per_hour, random);
        calls = calls
            .sort()
            .map(x => x + ts * HOUR);
        res = res.concat(calls);
        ts++;
    }
    return res;
}
