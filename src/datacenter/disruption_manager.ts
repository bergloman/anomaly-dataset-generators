import { DurationCalculator } from "./duration_calculator";
import { IRandom } from "../interfaces";
import { IDisruptionManager, IDisruptionRuntime, IDisruptionConfig } from "./interfaces";

export class DisruptionManager implements IDisruptionManager {

    private disruptions: IDisruptionRuntime[];

    constructor(disruptions: IDisruptionConfig[], random: IRandom) {
        this.disruptions = disruptions.map(x => {
            const res: IDisruptionRuntime = { config: x };
            if (x.duration) {
                x.duration.min_ts = new Date(x.d_from).toISOString();
                x.duration.max_ts = new Date(x.d_to).toISOString();
                res.duration = new DurationCalculator([x.duration], random, x.d_from, x.d_to, true);
            }
            return res;
        });
    }

    public checkDisruptions(service: string, server: string, start: number, end: number): IDisruptionRuntime | null {
        let hits = this.disruptions
            .filter(x =>
                (x.config.d_from <= start && start <= x.config.d_to) ||
                // (x.config.d_from <= end && end <= x.config.d_to) ||
                (start <= x.config.d_from && x.config.d_from <= end)
            );
        hits = hits
            .filter(x => {
                if (x.config.services && x.config.services.indexOf(service) < 0) {
                    return false;
                }
                if (x.config.servers && x.config.servers.indexOf(server) < 0) {
                    return false;
                }
                return true;
            });
        if (hits.length === 0) {
            return null;
        }
        return hits[0];
    }

    public isDisruption(ts: number): boolean {
        return this.disruptions.some(x => (x.config.d_from <= ts && ts <= x.config.d_to));
    }
}
