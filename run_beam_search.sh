#! /bin/bash
set -e

#########################################################################
# This script generates parking dataset in CSV format
#########################################################################

GENERATOR="parking"
NORMALIZE="no"

ROOT_DIR=params/params_parking/source

INPUT_DIR=$ROOT_DIR/tmp/input
OUTPUT_DIR=$ROOT_DIR/tmp/output
DATA_DIR=$ROOT_DIR/tmp/data

mkdir -p $INPUT_DIR
mkdir -p $OUTPUT_DIR
mkdir -p $DATA_DIR

# run initial expansion
node $ROOT_DIR/generator_of_permuted_settings \
    --input_file $ROOT_DIR/params.moderate.json \
    --output_dir $OUTPUT_DIR \
    --expand_factor 2
function perform_evaluation() {
    for FILE in $OUTPUT_DIR/*.json; do
        FILENAME=$(basename -- "$FILE")
        OUT_FILE=$DATA_DIR/$FILENAME.csv

        echo "Preparing $OUT_FILE"
        rm -rf $OUT_FILE*

        node build/main.js \
            --generator $GENERATOR \
            -t csv \
            --skip_timestamp \
            -f $FILE \
            -o $OUT_FILE \
            $NORMALIZE

        # TODO
        # run python to evaluate the dataset and write the result somewhere
        python src/validation/export_stats.py $OUT_FILE
    done

    # collect the results and promote top X parameter files
}

perform_evaluation




echo "Finished."
