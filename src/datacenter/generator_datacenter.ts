import * as fs from "fs";
import * as itf from "../interfaces";
import * as intf from "./interfaces";
import * as u from "./util_funcs";
import { CallCollector } from "./call_collector";
import { DisruptionManager } from "./disruption_manager";
import { DurationCalculator } from "./duration_calculator";
import { DAY } from "../utils";

/////////////////////////////////////////////////////////////////////////////////////

export class ServiceInstance {

    private server: string;
    private name: string;
    private config: intf.IServiceConfig;
    private context: intf.IContext;
    private random: itf.IRandom;
    private disruption_manager: intf.IDisruptionManager;
    private duration_calc: DurationCalculator;

    constructor(
        config: intf.IServiceConfig, server: string, context: intf.IContext,
        disruption_manager: intf.IDisruptionManager, random: itf.IRandom,
        ts_from: number, ts_to: number) {
        this.server = server;
        this.name = config.name;
        this.config = config;
        this.context = context;
        this.random = random;
        this.disruption_manager = disruption_manager;
        this.duration_calc = new DurationCalculator(config.durations, random, ts_from, ts_to, false);
    }

    public makeCall(ts_start: number): intf.IContextCallResult {
        let dur = this.duration_calc.getDuration(ts_start);
        let is_error = (this.random.random() <= this.config.error_rate);

        // if disruption is occuring, correct accordingly
        const disr = this.disruption_manager.checkDisruptions(this.name, this.server, ts_start, ts_start + dur);
        if (disr) {
            if (disr.duration) {
                dur = disr.duration.getDuration(ts_start);
            }
            if (disr.config.error_rate >= 0) {
                is_error = (this.random.random() <= disr.config.error_rate);
            }
        }

        // call dependencies
        if (!is_error && this.config.deps) {
            for (const dep of this.config.deps) {
                const calls = u.getCallCount(dep, this.random);
                for (let i = 0; i < calls; i++) {
                    const r = this.context.makeCall(dep.dest, ts_start + dur);
                    dur += r.dur;
                    if (r.is_error) {
                        is_error = true;
                        break;
                    }
                }
                if (is_error) {
                    break;
                }
            }
        }
        this.context.recordCall(this.name, this.server, ts_start + dur, dur, is_error);
        return { dur, is_error };
    }
}

class InstanceGroup {
    public rr: number;
    public instances: ServiceInstance[];
    public name: string;
}

class ServiceCallGenerator {

    private cc: intf.ICallCollector;
    private config: intf.IConfig;
    private disr_manager: intf.IDisruptionManager;
    private context: intf.IContext;
    private random: itf.IRandom;
    private service_instances: Map<string, InstanceGroup>;

    constructor(config: intf.IConfig, random: itf.IRandom, cc: intf.ICallCollector) {
        this.config = config;
        this.random = random;
        this.cc = cc;

        this.service_instances = new Map<string, InstanceGroup>();
        this.disr_manager = new DisruptionManager(config.disruptions, random);

        this.context = {
            makeCall: (service, ts_start): intf.IContextCallResult => {
                const instance = this.getInstanceForCall(service);
                return instance.makeCall(ts_start);
            },
            recordCall: (service, server, end, dur, is_error): void => {
                this.cc.addCall(service, server, end, dur, is_error);
            }
        };
    }

    public getDisrManager(): intf.IDisruptionManager {
        return this.disr_manager;
    }

    public run(ts_from: number, ts_to: number) {
        this.compile(ts_from, ts_to);
        let calls: Array<{ ts: number, service: string }> = [];
        for (const service_def of this.config.service_calls) {
            const calls1 = u.createCallTimes(service_def, ts_from, ts_to, this.random)
                .map(x => {
                    return { ts: x, service: service_def.service };
                });
            calls = calls.concat(calls1);
        }
        calls = calls.sort((a, b) => a.ts - b.ts);

        for (const call of calls) {
            const service = this.getInstanceForCall(call.service);
            service.makeCall(call.ts);
        }
        this.cc.finish();
    }

    private getInstanceForCall(service_name: string): ServiceInstance {
        const a = this.service_instances.get(service_name);
        if (!a) {
            throw new Error("Internal error - unknown service");
        }
        const res = a.instances[a.rr++];
        a.rr = (a.rr % a.instances.length);
        return res;
    }

    private compile(ts_from: number, ts_to: number) {
        for (const server of this.config.servers) {
            for (const service_name of server.services) {
                if (!this.service_instances.has(service_name)) {
                    this.service_instances.set(service_name, {
                        instances: [],
                        name: service_name,
                        rr: 0
                    });
                }
                const config = this.config.services.filter(x => x.name === service_name);
                if (config.length === 0) {
                    throw new Error("Unknown service: " + service_name);
                }
                const config_single = config[0];
                const instance = new ServiceInstance(
                    config_single, server.name, this.context, this.disr_manager,
                    this.random, ts_from, ts_to);
                const a = this.service_instances.get(service_name);
                if (!a) {
                    throw new Error("Internal error - unknown service");
                }
                a.instances.push(instance);
            }
        }
    }
}

///////////////////////////////////////////////////////////////////////////////

export function main(fname: string): itf.IGdrRecordD[] {

    // load input configuration
    const conf: intf.IConfig = JSON.parse(fs.readFileSync(fname, { encoding: "utf8" }));

    // post-process config to match typescript interfaces
    conf.disruptions.forEach(x => {
        x.d_from = Date.parse(x.from);
        x.d_to = Date.parse(x.to);
        if (x.servers && x.servers.length == 0) {
            x.servers = undefined;
        }
        if (x.services && x.services.length == 0) {
            x.services = undefined;
        }
    });

    const intervals: number[][] = [];
    const start = new Date(conf.general.from).getTime();
    const end = new Date(conf.general.to).getTime();
    let prev = start;
    let curr = DAY * (Math.floor(start / DAY) + 1);
    while (curr < end) {
        intervals.push([prev, curr]);
        prev = curr;
        curr = DAY * (Math.floor(curr / DAY) + 1);
    }
    intervals.push([prev, end]);

    const res: itf.IGdrRecordD[] = [];
    for (const interval of intervals) {

        // generate calls as defined by the configuration
        const cc: intf.ICallCollector = new CallCollector();
        const runner = new ServiceCallGenerator(conf, Math, cc);
        runner.run(interval[0], interval[1]);

        // save calls into ldjson file
        let last_ts = -1;
        const disr_manager = runner.getDisrManager();
        const gdrs = cc.getGdr().sort((a, b) => a.ts - b.ts);
        for (const gdr of gdrs) {
            // prepend anomaly indicator
            if (last_ts != gdr.ts) {
                last_ts = gdr.ts;
                const val = disr_manager.isDisruption(gdr.ts) ? "anomaly" : "nominal";
                const gdr_anomaly: itf.IGdrRecordD = {
                    extra_data: { is_anomaly: val },
                    tags: { anomaly_indicator: "true" },
                    ts: new Date(gdr.ts),
                    values: {}
                };
                // writer.add(gdr_anomaly);
                res.push(gdr_anomaly);
            }
            // output record
            const gg: itf.IGdrRecordD = {
                extra_data: gdr.extra_data,
                tags: gdr.tags,
                ts: new Date(gdr.ts),
                values: gdr.values
            };
            res.push(gg);
        }
    }
    return res;
}
