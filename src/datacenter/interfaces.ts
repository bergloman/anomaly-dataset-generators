export interface IDurationConfig {
    type: string;
    min?: number;
    max?: number;
    avg?: number;
    variance?: number;
    min_ts?: string;
    max_ts?: string;
    hours?: number[];
}
export interface IDurationConfigEx extends IDurationConfig {
    min_ts_num: number;
    max_ts_num: number;
}

export interface ICallConfig {
    type: string;
    min?: number;
    max?: number;
    avg?: number;
    variance?: number;
}

export interface IServerConfig {
    name: string;
    services: string[];
}

export interface IServiceCallConfig {
    service: string;
    type: string;
    /** 2 integers, from- and to- hour of high level */
    active: number[];
    weekend: boolean;
    low: number;
    high: number;
    noise: number;
    peak: number;
    hours?: number[];
}

export interface IDependencyConfig {
    dest: string;
    type: string;
    min: number;
    max: number;
}

export interface IServiceConfig {
    name: string;
    error_rate: number;
    durations: IDurationConfig[];
    deps: IDependencyConfig[];
}

export interface IDisruptionConfig {
    from: string;
    to: string;
    d_from: number;
    d_to: number;
    services: string[];
    servers: string[];
    error_rate: number;
    duration: IDurationConfig;
    variance?: number;
}

export interface IGeneralConfig {
    from: string;
    to: string;
}

export interface IConfig {
    general: IGeneralConfig;
    servers: IServerConfig[];
    services: IServiceConfig[];
    service_calls: IServiceCallConfig[];
    disruptions: IDisruptionConfig[];
}

export interface ICallCollector {
    addCall(service: string, server: string, end: number, dur: number, is_error: boolean);
    getGdr();
    finish();
}

export interface IDurationCalculator {
    getDuration(now: number): number;
}

export interface IDisruptionRuntime {
    config: IDisruptionConfig;
    duration?: IDurationCalculator;
}


export interface IDisruptionManager {
    checkDisruptions(
        service: string, server: string, start: number, end: number
    ): IDisruptionRuntime | null;

    isDisruption(ts: number): boolean;
}

export interface IContextCallResult {
    dur: number;
    is_error: boolean;
}

export interface IContext {
    makeCall(service: string, ts_start: number): IContextCallResult;
    recordCall(service: string, server: string, end: number, dur: number, is_error: boolean): void;
}
