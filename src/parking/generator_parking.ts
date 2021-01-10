import * as fs from "fs";
import * as intf from "./interfaces";
import * as itf from "../interfaces";
import { DAY } from "../utils";
import * as u from "../utils";

/////////////////////////////////////////////////////////////////////////////////////

class ParkingLotInstance {
    public id: string;
    public x: number;
    public y: number;
    public capacity: number;
    public occupancy: number;

    constructor(config: intf.IParkingLot) {
        this.id = config.id;
        this.x = config.x;
        this.y = config.y;
        this.capacity = config.capacity;
        this.occupancy = 0;
    }
}

enum ParkingEventType { Arrival, Departure, Stats }

class GridLocation {
    public x: number;
    public y: number;
}
class ParkingEvent {

    public static createArrival(ts: number, target: GridLocation, dur: number): ParkingEvent {
        return new ParkingEvent(
            ParkingEventType.Arrival,
            ts, "", target, dur);
    }
    public static createDeparture(ts: number, parking_lot_id: string): ParkingEvent {
        return new ParkingEvent(
            ParkingEventType.Departure,
            ts, parking_lot_id, { x: 0, y: 0 }, 0);
    }
    public static createStats(ts: number): ParkingEvent {
        return new ParkingEvent(
            ParkingEventType.Stats,
            ts, "", { x: 0, y: 0 }, 0);
    }

    public type: ParkingEventType;
    public ts: number;
    /* Used for departures */
    public parking_lot_id: string;
    /* Used for arrivals */
    public target: GridLocation;
    public dur: number;

    constructor(type: ParkingEventType, ts: number, parking_lot_id: string, target: GridLocation, dur: number) {
        this.type = type;
        this.ts = ts;
        this.parking_lot_id = parking_lot_id;
        this.target = target;
        this.dur = dur;
    }

    public printDebug() {
        switch (this.type) {
            case ParkingEventType.Arrival:
                console.log(`${new Date(this.ts)} arrival ${this.target} [${this.dur / u.HOUR}]`);
                break;
            case ParkingEventType.Departure:
                console.log(`${new Date(this.ts)} departure ${this.parking_lot_id}`);
                break;
            default:
                break;
        }
    }
}

export class ParkingWorld {

    private config: intf.IConfig;
    private current_ts: number;
    private next_gen_ts: number;
    private final_ts: number;
    private events: ParkingEvent[];
    private parking_lots: ParkingLotInstance[];
    private rand: itf.IRandom;
    private resulting_data: itf.IGdrRecordD[];
    private resulting_data2: itf.ICombinedRecordD[];
    private defect_checker: intf.IDefectChecker;
    private anomaly_checker: intf.IAnomalyChecker;

    constructor(
        config: intf.IConfig, rand: itf.IRandom,
        defect_checker: intf.IDefectChecker, anomaly_checker: intf.IAnomalyChecker
    ) {
        this.config = config;
        this.rand = rand;
        this.events = [];
        this.resulting_data = [];
        this.resulting_data2 = [];
        this.parking_lots = config.parking_lots.map<ParkingLotInstance>(x => new ParkingLotInstance(x));
        this.defect_checker = defect_checker;
        this.anomaly_checker = anomaly_checker;
        this.current_ts = 0;
        this.next_gen_ts = new Date(config.general.from).getTime();
        this.final_ts = new Date(config.general.to).getTime();
    }

    public getResultingData(): itf.IGdrRecordD[] {
        return this.resulting_data;
    }

    public getResultingData2(): itf.ICombinedRecordD[] {
        return this.resulting_data2;
    }

    public run() {
        // console.log(
        //     `Starting generation of data for interval between ` +
        //     `${this.config.general.from} and ${this.config.general.to}`
        // );
        this.resulting_data = [];
        this.resulting_data2 = [];
        while (this.current_ts < this.final_ts) {
            this.generateEventsNextDay();
            while (this.current_ts < this.next_gen_ts) {
                if (this.events.length == 0) {
                    this.current_ts = this.next_gen_ts;
                    break;
                }
                const ev = this.events[0];
                this.events = this.events.slice(1);
                this.current_ts = ev.ts;
                if (ev.type == ParkingEventType.Arrival) {
                    // find free parking lot
                    // also include check if parking-lot accepts new arrivals
                    let candidates = this.parking_lots
                        .filter(x => x.capacity > x.occupancy && this.defect_checker.check(x.id, ev.ts, true) < 0)
                        .map(x => {
                            const d = euclidDist(x.x, x.y, ev.target.x, ev.target.y);
                            return { d, lot: x };
                        });
                    candidates = candidates.sort((a, b) => {
                        const diff = a.d - b.d;
                        if (diff != 0) {
                            return diff;
                        } else {
                            return this.rand.random() > 0.5 ? 1 : -1;
                        }
                    });
                    if (candidates.length == 0) {
                        // no free parking lot, just discard
                        continue;
                    }

                    // enlist into parking lot
                    const lot = candidates[0];
                    lot.lot.occupancy++;

                    // insert departure event
                    // check for ramp mulfunction and prolong departure if needed
                    let ts_depart = ev.ts + ev.dur;
                    const ts_depart2 = this.defect_checker.check(lot.lot.id, ts_depart, false);
                    if (ts_depart2 > 0) {
                        ts_depart = ts_depart2;
                    }

                    this.events.push(ParkingEvent.createDeparture(ts_depart, lot.lot.id));
                    this.events = this.events.sort((a, b) => a.ts - b.ts);

                } else if (ev.type == ParkingEventType.Departure) {
                    // leave parking lot
                    for (const lot of this.parking_lots) {
                        if (lot.id != ev.parking_lot_id) {
                            continue;
                        }
                        lot.occupancy--;
                        break;
                    }

                } else if (ev.type == ParkingEventType.Stats) {

                    // prepend anomaly indicator
                    const is_anomaly = this.anomaly_checker.isAnomaly(ev.ts) ? "anomaly" : "nominal";
                    this.resulting_data.push({
                        extra_data: { is_anomaly },
                        tags: {},
                        ts: new Date(ev.ts),
                        values: {}
                    });
                    // report occupancy-percent for each parking lot
                    for (const lot of this.parking_lots) {
                        this.resulting_data.push({
                            tags: { parking: lot.id },
                            ts: new Date(ev.ts),
                            values: { ocuppancy: lot.occupancy / lot.capacity }
                        });
                    }

                    const rec: itf.ICombinedRecordD = {
                        ts: new Date(ev.ts),
                        is_anomaly,
                        values: {}
                    };
                    this.parking_lots.forEach(lot => {
                        rec.values[lot.id] = lot.occupancy / lot.capacity;
                    });
                    this.resulting_data2.push(rec);

                } else {
                    throw new Error("Unknown event type: " + JSON.stringify(ev));
                }
            }
        }
    }

    private generateEventsNextDay(): void {

        const ts_from: number = this.next_gen_ts;
        const ts_end: number = Math.min(this.final_ts, ts_from + 1 * DAY);

        // console.log("Generating data for single day", new Date(ts_from), new Date(ts_end));

        // generate reporting events
        let cur_ts = ts_from;
        while (cur_ts < ts_end) {
            this.events.push(ParkingEvent.createStats(cur_ts));
            cur_ts += 5 * u.MINUTE;
        }
        // generate arrival events
        const profiles = this.config.profiles.slice(0); // create shallow copy of profiles
        // add profiles that denote type-e disruption - additional arrivals
        for (const d of this.config.disruptions) {
            if (d.tag !== "type-e") {
                continue;
            }
            const dd = new Date(d.from).getTime();
            const dd2 = new Date(d.to).getTime();
            if (ts_from <= dd && dd < ts_end) {
                profiles.push({
                    count: 50,
                    duration: { type: "gauss", mean: (dd2 - dd) / u.HOUR, std_dev: 0.1, min: 0, max: 0 },
                    id: profiles.length,
                    start: { type: "gauss", mean: (dd - ts_from) / u.HOUR, std_dev: 0.1, min: 0, max: 0 },
                    target: { type: "point", min_x: d.x, max_x: d.x, min_y: d.y, max_y: d.y }
                });
            }
        }
        for (const p of profiles) {
            for (let i = 0; i < p.count; i++) {
                const start = u.HOUR * getRandomSampleFromSimpleDistribution(p.start, this.rand, i, p.count);
                const dur = u.HOUR * getRandomSampleFromSimpleDistribution(p.duration, this.rand, i, p.count);
                const target = getRandomGridLocation(p.target, this.rand, this.config.general.grid);
                this.events.push(ParkingEvent.createArrival(ts_from + start, target, dur));
            }
        }

        // sort collected events from all profiles + existing ones
        this.events = this.events.sort((a, b) => a.ts - b.ts);

        this.current_ts = ts_from;
        this.next_gen_ts = ts_end;
    }
}

function getRandomSampleFromSimpleDistribution(
    config: intf.IProfileDistributionSimple, rand: itf.IRandom, counter: number, total: number
): number {
    if (config.type == "deterministic") {
        return (counter / total) * (config.max - config.min) + config.min;
    }
    if (config.type == "uniform") {
        return rand.random() * (config.max - config.min) + config.min;
    }
    if (config.type == "gauss") {
        return u.randomGaussian(rand) * config.std_dev + config.mean;
    }
    throw new Error("Unknown distribution type: " + config.type);
}

function getRandomGridLocation(
    config: intf.IProfileTarget, rand: itf.IRandom, grid: intf.IGrid
): GridLocation {
    let x = 0;
    let y = 0;

    if (config.type == "uniform") {
        x = config.min_x + Math.floor((config.max_x + 1 - config.min_x) * rand.random());
        y = config.min_y + Math.floor((config.max_y + 1 - config.min_y) * rand.random());
    } else if (config.type == "point") {
        x = config.min_x;
        y = config.min_y;
    } else {
        throw new Error("Unknown target type in config: " + config.type);
    }
    // make sure we are within grid bounds
    x = Math.max(x, 0);
    y = Math.max(y, 0);
    x = Math.min(x, grid.x - 1);
    y = Math.min(y, grid.y - 1);
    return { x, y };
}

function euclidDist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

// ///////////////////////////////////////////////////////////////////////////////

export function main(fname: string): itf.ICombinedRecordD[] {

    // load input configuration
    const conf: intf.IConfig = JSON.parse(fs.readFileSync(fname, { encoding: "utf8" }));

    // prepare parking lots for easy quering
    const lots_map: Map<string, intf.IParkingLot> = new Map();
    conf.parking_lots.forEach(x => lots_map.set(x.id, x));

    // prepare disruption data
    const disr = conf.disruptions.map(x => ({
        from: new Date(x.from).getTime(),
        parking_lot_id: x.parking_lot_id,
        tag: x.tag,
        to: new Date(x.to).getTime(),
        x: x.x,
        y: x.y
    }));
    const disr_r = disr.filter(x => x.tag == "type-r");
    const disr_b = disr.filter(x => x.tag == "type-b");
    // const disr_e = disr.filter(x => x.tag == "type-e");
    // console.log("All disruptions:", disr.length);
    // console.log("All disruptions of type R:", disr_r.length);
    // console.log("All disruptions of type B:", disr_b.length);
    // console.log("All disruptions of type R:", disr_e.length);
    const random: itf.IRandom = {
        random: (): number => Math.random()
    };

    // prepare utility object to signaling disruptions
    const defect_checker: intf.IDefectChecker = {
        check: (id: string, ts: number, is_arrival: boolean): number => {
            for (const x of disr_r) {
                if (x.parking_lot_id == id && x.from <= ts && x.to >= ts) {
                    // console.log("check type-r", x);
                    return x.to;
                }
            }

            // apply type-b disruptions - no new arrivals in specified grid-cell
            if (is_arrival) {
                const lot = lots_map.get(id);
                if (lot) {
                    for (const x of disr_b) {
                        if (x.x == lot.x && x.y == lot.y && x.from <= ts && x.to >= ts) {
                            // console.log("check type-b", lot, x);
                            return x.to;
                        }
                    }
                }
            }

            return -1;
        }
    };
    const anomaly_checker: intf.IAnomalyChecker = {
        isAnomaly: (ts: number): boolean => {
            for (const x of disr) {
                if (x.from <= ts && x.to >= ts) {
                    return true;
                }
            }
            return false;
        }
    };

    // ok, now run the simulation
    const runner = new ParkingWorld(conf, random, defect_checker, anomaly_checker);
    runner.run();

    // // collect data - gdr
    // const data = runner.getResultingData();
    // data.forEach(x => writer.add(x));
    // writer.finalize();

    // collect - another test
    const data2 = runner.getResultingData2();

    // if (normalize_hours) {
    //     // use the first sixth of the data to calculate mean for each hour bucket and subtract it
    //     const init_block_size = Math.floor(data2.length / 6);
    //     const collect_a = JSON.parse(JSON.stringify(data2[0].values));
    //     for (let i = 1; i < init_block_size; i++) {
    //         Object.keys(collect_a).forEach(key => {
    //             collect_a[key] += data2[i][key];
    //         });
    //     }
    //     Object.keys(collect_a).forEach(key => {
    //         collect_a[key] /= init_block_size;
    //     });
    //     data2.forEach(x => {
    //         Object.keys(x).forEach(key => {
    //             x[key] -= collect_a[key];
    //         });
    //     });
    // }

    // if (inject_hours) {
    //     // inject hour bits if needed
    //     data2.forEach(x => {
    //         const h = x.ts.getHours();
    //         for (let i = 0; i < 24; i++) {
    //             x.values["h_" + i] = (i == h ? 1 : 0);
    //         }
    //     });
    // }

    // data2.forEach(x => writer.addRec(x));
    // writer.finalize();

    return data2;
}
