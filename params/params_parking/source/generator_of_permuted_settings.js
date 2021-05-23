const fs = require("fs");
const path = require("path");

/** Create new distribution parameters within given conditions */
function createNewSetting(min, max) {
    // choose uniform or gauss - here we prefer gauss
    const create_uniform = Math.random() > 0.7;
    if (create_uniform) {
        let tmin = min + (max - min) * Math.random();
        let tmax = min + (max - min) * Math.random();
        if (tmax < tmin) {
            const tmp = tmax;
            tmax = tmin;
            tmin = tmp;
        }
        return {
            type: "uniform",
            min: Math.floor(tmin),
            max: Math.ceil(tmax)
        };
    } else {
        let tmean = min + (max - min) * Math.random();
        let tstd_dev = (max - min) * Math.random() * 0.3;
        return {
            type: "gauss",
            mean: Math.round(tmean),
            std_dev: Math.round(10 * tstd_dev) / 10
        };
    }
}


/** Select */
function getRandomIndex(len) {
    return Math.floor(Math.random() * len);
}

/** Inject mutations into given config */
function permuteConfig(config) {
    for (let i = 0; i < 3; i++) {
        const profile = config.profiles[getRandomIndex(config.profiles.length)];
        const target_item = getRandomIndex(3);
        switch (target_item) {
            case 0: // start
                profile.start = createNewSetting(0, 24);
                break;
            case 1: // duration
                profile.duration = createNewSetting(1, 10);
                break;
            case 2: // count
                profile.count = createNewSetting(10, 100);
                break;
            default: break;
        }
    }
}

///////////////////////////////////////////////////////////////////////

function main() {
    const orig_settings = fs.readFileSync(path.join(__dirname, "params.moderate.json"));

    for (let i = 0; i < 100; i++) {
        // create clean copy
        const config = JSON.parse(orig_settings);
        // make mutations
        permuteConfig(config);

        // inject empty disruptions
        config.general.from = "2020-01-01T00:00:00.000Z";
        config.general.to = "2020-03-01T00:00:00.000Z";
        config.disruptions = [];

        // save to file
        fs.writeFileSync(
            path.join(__dirname, "tmp", `params.moderate.${i}.json`),
            JSON.stringify(config, null, 4),
            { encoding: "utf8" }
        );
    }
}

///////////////////////////////////////////////////////////////////////

main();
