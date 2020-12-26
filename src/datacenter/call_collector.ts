import * as itf from "../interfaces";
import * as intf from "./interfaces";
import { EPOCH } from "../utils";

class ServerInstanceRecData {

    public responses: number;
    public errors: number;
    public sum_time: number;

    constructor() {
        this.responses = 0;
        this.errors = 0;
        this.sum_time = 0;
    }
}

class ServerInstanceRec {

    public server: string;
    public service: string;
    public last_ts: number;
    public data: ServerInstanceRecData;

    constructor(server: string, service: string, ts: number) {
        this.server = server;
        this.service = service;
        this.last_ts = ts;
        this.data = new ServerInstanceRecData();
    }

    public reset(ts: number) {
        this.last_ts = ts;
        this.data.responses = 0;
        this.data.errors = 0;
        this.data.sum_time = 0;
    }
}

class ServerRec {

    public server: string;
    public instances: Map<string, ServerInstanceRec>;

    constructor(server: string) {
        this.server = server;
        this.instances = new Map<string, ServerInstanceRec>();
    }
}

/** Object that collects calls and emits stats */
export class CallCollector implements intf.ICallCollector {

    private servers: Map<string, ServerRec>;
    private gdr: itf.IGdrRecord[];

    constructor() {
        this.servers = new Map<string, ServerRec>();
        this.gdr = [];
    }

    public getGdr(): itf.IGdrRecord[] {
        return this.gdr;
    }

    public addCall(service: string, server: string, end: number, dur: number, is_error: boolean) {
        if (!this.servers.has(server)) {
            this.servers.set(server, new ServerRec(server));
        }
        const s = this.servers.get(server);
        if (!s) {
            throw new Error("Internal error - server not found in map");
        }
        if (!s.instances.has(service)) {
            s.instances.set(service, this.createNewRec(-1, server, service));
        }
        const e = s.instances.get(service);
        if (!e) {
            throw new Error("Internal error - instance not found in map");
        }
        const ts = Math.floor(end / EPOCH);
        if (e.last_ts !== ts) {
            if (e.last_ts > 0) {
                this.emit(e);
            }
            e.reset(ts);
        }
        e.data.responses++;
        if (is_error) {
            e.data.errors++;
        }
        e.data.sum_time += dur;
    }

    public finish() {
        // close pending stats
        for (const server_n of Object.keys(this.servers)) {
            const server = this.servers[server_n];
            for (const service_n of Object.keys(server)) {
                const service = server[service_n];
                this.emit(service);
            }
        }
        // sort
        this.gdr = this.gdr.sort((a, b) => {
            if (a.ts !== b.ts) {
                return a.ts - b.ts;
            }
            if (a.tags.service !== b.tags.service) {
                return a.tags.service.localeCompare(b.tags.service);
            }
            return a.tags.server.localeCompare(b.tags.server);
        });
        // collapse duplicates
        const gdr_tmp: Array<(itf.IGdrRecord | null)> = this.gdr.map(x => x);
        for (let i = 0; i < gdr_tmp.length; i++) {
            const a = gdr_tmp[i];
            if (!a) {
                continue;
            }
            let j = i + 1;
            while (true) {
                if (j >= gdr_tmp.length) {
                    break;
                }
                const b = gdr_tmp[j];
                if (!b) {
                    continue;
                }
                if (a.ts !== b.ts) {
                    break;
                }
                if (a.tags.service !== b.tags.service) {
                    break;
                }
                if (a.tags.server !== b.tags.server) {
                    break;
                }
                const values = {
                    avg_time:
                        (a.values.responses * a.values.avg_time + b.values.responses * b.values.avg_time) /
                        (a.values.responses + b.values.responses),
                    errors: a.values.errors + b.values.errors,
                    responses: a.values.responses + b.values.responses
                };
                gdr_tmp[j] = null;
                a.values = values;
                j++;
            }
        }
        this.gdr = [];
        gdr_tmp.forEach(x => {
            if (x != null) {
                x.values.errors_perc = x.values.responses > 0 ? x.values.errors / x.values.responses : 0;
                this.gdr.push(x);
            }
        });
    }

    private emit(e: ServerInstanceRec) {
        // ts field should be first to help with easier sorting of ldjson files
        /* tslint:disable:object-literal-sort-keys */
        const rec = {
            ts: (e.last_ts + 1) * EPOCH,
            tags: {
                server: e.server,
                service: e.service
            },
            values: {
                avg_time: e.data.sum_time / e.data.responses,
                errors: e.data.errors,
                responses: e.data.responses
            }
        };
        this.gdr.push(rec);
    }

    private createNewRec(ts: number, server: string, service: string): ServerInstanceRec {
        return new ServerInstanceRec(server, service, ts);
    }
}
