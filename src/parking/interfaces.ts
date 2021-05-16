export interface IGrid {
    x: number;
    y: number;
}

export interface IGeneral {
    grid: IGrid;
    from: string;
    to: string;
}

export interface IParkingLot {
    id: string;
    capacity: number;
    x: number;
    y: number;
}

export interface IProfileDistributionSimple {
    type: string;
    min: number;
    max: number;
    mean: number;
    std_dev: number;
}

export interface IProfileTarget {
    type: string;
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
}

export interface IProfile {
    id: number;
    start: IProfileDistributionSimple;
    duration: IProfileDistributionSimple;
    target: IProfileTarget;
    count: number | IProfileDistributionSimple;
    radius?: number;
}

export interface IDisruption {
    tag: string;
    from: string;
    to: string;
    parking_lot_id: string;
    x: number;
    y: number;
}

export interface IConfig {
    disruptions: IDisruption[];
    general: IGeneral;
    parking_lots: IParkingLot[];
    profiles: IProfile[];
}

export interface IDefectChecker {
    // returns the timestamp when this parking-lot will accept new arrivals or allow departues
    // if there is no defect, the number is negative indicating normal operation
    check(id: string, ts: number, is_arrival: boolean): number;
}

export interface IAnomalyChecker {
    // for given timestamp checks if there has been an anomaly
    isAnomaly(ts: number): boolean;
}
