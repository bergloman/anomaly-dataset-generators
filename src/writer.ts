import { IGdrRecordD, ICombinedRecordD } from "./interfaces";

export interface IWriterCombined {
    addRec(data: ICombinedRecordD): void;
}

export interface IWriter {
    add(data: IGdrRecordD): void;
    addRec(data: ICombinedRecordD): void;
    finalize(): void;
}

export type OutputFunc = (s: string) => void;

export class WriterLdjson implements IWriter {

    private cb: OutputFunc;

    constructor(cb: OutputFunc) {
        this.cb = cb;
    }

    public addRec(data: ICombinedRecordD): void {
        const line = JSON.stringify(data);
        this.cb(line);
    }

    public add(data: IGdrRecordD): void {
        const line = JSON.stringify(data);
        this.cb(line);
    }
    public finalize(): void {
        // do nothing
    }
}

export class WriterCsv implements IWriter {

    private cb: OutputFunc;

    private curr_ts: Date | null;
    private columns: string[];
    private curr_row: string[];
    private first_row: boolean;
    private write_timestamp: boolean;

    constructor(cb: OutputFunc, write_timestamp: boolean) {
        this.cb = cb;
        this.curr_ts = null;
        this.curr_row = [];
        this.write_timestamp = write_timestamp;
        this.columns = this.write_timestamp ? ["ts"] : [];
        this.first_row = true;
    }

    public addRec(data: ICombinedRecordD): void {
        throw new Error("Method not implemented.");
    }

    public add(data: IGdrRecordD): void {

        const col_name_base = Object.keys(data.tags)
            .map(tag => `${tag}=${data.tags[tag]}`)
            .join(".");
        if (this.first_row && (this.curr_ts == null || data.ts.getTime() == this.curr_ts.getTime())) {
            if (this.curr_ts == null) {
                this.curr_ts = data.ts;
                if (this.write_timestamp) {
                    // this.curr_row.push("" + data.ts.getTime());
                    this.curr_row.push("" + data.ts.toISOString());
                }
            }
            Object.keys(data.values).forEach(val_name => {
                const col_name = `${col_name_base}.${val_name}`.replace(/^\./gi, "");
                if (this.columns.indexOf(col_name) >= 0) {
                    throw new Error("Duplicate data record in current timestamp");
                }
                this.columns.push(col_name);
                this.curr_row.push("" + data.values[val_name]);
            });
            Object.keys(data.extra_data || {}).forEach(val_name => {
                const col_name = `${col_name_base}.${val_name}`.replace(/^\./gi, "");
                if (this.columns.indexOf(col_name) >= 0) {
                    throw new Error("Duplicate data record in current timestamp");
                }
                this.columns.push(col_name);
                this.curr_row.push("" + data.extra_data[val_name]);
            });
        } else if (this.first_row) {
            this.writeLine(this.columns.join(","));
            this.first_row = false;
            this.initializeNewRow(data, col_name_base);
        } else if (this.curr_ts && data.ts.getTime() != this.curr_ts.getTime()) {
            this.initializeNewRow(data, col_name_base);
        } else {
            this.extractDataIntoRow(data, col_name_base);
        }
    }

    public finalize(): void {
        if (this.first_row) {
            this.writeLine(this.columns.join(","));
            this.first_row = false;
        }
        this.writeLine(this.curr_row.join(","));
        this.curr_row = this.columns.map(x => "");
    }

    private initializeNewRow(data: IGdrRecordD, col_name_base: string) {
        this.writeLine(this.curr_row.join(","));
        this.curr_row = this.columns.map(x => "0");
        this.curr_ts = data.ts;
        if (this.write_timestamp) {
            // this.curr_row[0] = "" + data.ts.getTime();
            this.curr_row[0] = "" + data.ts.toISOString();
        }
        this.extractDataIntoRow(data, col_name_base);
    }

    private extractDataIntoRow(data: IGdrRecordD, col_name_base: string) {
        Object.keys(data.values).forEach(val_name => {
            const col_name = `${col_name_base}.${val_name}`.replace(/^\./gi, "");
            const col_index = this.columns.indexOf(col_name);
            if (col_index < 0) {
                throw new Error("Data record contains data field that was not present in initial data row");
            }
            this.curr_row[col_index] = "" + data.values[val_name];
        });
        Object.keys(data.extra_data || {}).forEach(val_name => {
            const col_name = `${col_name_base}.${val_name}`.replace(/^\./gi, "");
            const col_index = this.columns.indexOf(col_name);
            if (col_index < 0) {
                throw new Error("Data record contains data field that was not present in initial data row");
            }
            this.curr_row[col_index] = "" + data.extra_data[val_name];
        });
    }

    private writeLine(line: string): void {
        this.cb(line);
    }
}

export class WriterCsvCombined implements IWriterCombined {

    private cb: OutputFunc;
    private columns: string[];
    private first_row: boolean;
    private write_timestamp: boolean;

    constructor(cb: OutputFunc, write_timestamp: boolean) {
        this.cb = cb;
        this.write_timestamp = write_timestamp;
        this.columns = [];
        this.first_row = true;
    }

    public addRec(data: ICombinedRecordD): void {
        if (this.first_row) {
            this.first_row = false;
            Object.keys(data.values).forEach(col => {
                this.columns.push(col);
            });
            this.cb((this.write_timestamp ? "ts," : "") + "is_anomaly," + this.columns.join(","));
        }
        const line =
            (this.write_timestamp ? data.ts.toISOString() + "," : "") +
            data.is_anomaly + "," +
            this.columns.map(col => "" + data.values[col]).join(",");
        this.cb(line);
    }

}
