export interface IRandom {
    random(): number;
}

/** Tags for GDR record */
export interface IGdrTags {
    [key: string]: string;
}

/** (Numeric) values for GDR record */
export interface IGdrValues {
    [key: string]: number;
}

/** General Data Record */
export interface IGdrRecord {
    ts: number;
    tags: IGdrTags;
    values: IGdrValues;
    extra_data?: any;
}


/** General Data Record */
export interface IGdrRecordD {
    ts: Date;
    tags: IGdrTags;
    values: IGdrValues;
    extra_data?: any;
}

/** Values for ICombinedRecordD record */
export interface ICombinedRecordDValues {
    [key: string]: number;
}

/** General Data Record */
export interface ICombinedRecordD {
    ts: Date;
    is_anomaly: string;
    values: ICombinedRecordDValues;
}
